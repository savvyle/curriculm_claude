import json
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles

app = FastAPI()

DATA_DIR = Path(__file__).parent / "data"
CURRICULUM_FILE = DATA_DIR / "curriculum.txt"
PROGRESS_FILE = DATA_DIR / "progress.json"

DATA_DIR.mkdir(exist_ok=True)
if not CURRICULUM_FILE.exists():
    CURRICULUM_FILE.write_text("")
if not PROGRESS_FILE.exists():
    PROGRESS_FILE.write_text("{}")


class Progress:
    @staticmethod
    def read() -> dict:
        try:
            return json.loads(PROGRESS_FILE.read_text())
        except Exception:
            return {}

    @staticmethod
    def write(data: dict):
        PROGRESS_FILE.write_text(json.dumps(data, indent=2))

    @staticmethod
    def reset():
        data = Progress.read()
        for name in data:
            data[name] = 0
        Progress.write(data)

    @staticmethod
    def mark_viewed(name: str):
        data = Progress.read()
        data[name] = 1
        Progress.write(data)

    @staticmethod
    def ensure_user(name: str):
        data = Progress.read()
        if name not in data:
            data[name] = 0
            Progress.write(data)


@app.post("/api/signin")
async def signin(request: Request):
    body = await request.json()
    name = body.get("name", "").strip()
    if not name:
        return {"error": "Name required"}

    Progress.ensure_user(name)
    return {"name": name, "isAdmin": name == "vy"}


@app.get("/api/curriculum")
def get_curriculum():
    return {"content": CURRICULUM_FILE.read_text()}


@app.post("/api/curriculum")
async def save_curriculum(request: Request):
    body = await request.json()
    CURRICULUM_FILE.write_text(body.get("content", ""))
    Progress.reset()
    return {"success": True}


@app.post("/api/track-view")
async def track_view(request: Request):
    body = await request.json()
    name = body.get("name", "").strip()
    if not name:
        return {"error": "Name required"}

    Progress.mark_viewed(name)
    return {"success": True}


@app.get("/api/progress")
def get_all_progress():
    return Progress.read()


@app.get("/api/progress/user")
def get_user_progress(name: str):
    data = Progress.read()
    return {"name": name, "viewed": data.get(name, 0)}


app.mount("/", StaticFiles(directory=Path(__file__).parent / "public", html=True), name="static")
