const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');
const CURRICULUM_FILE = path.join(DATA_DIR, 'curriculum.txt');
const PROGRESS_FILE = path.join(DATA_DIR, 'progress.json');

// Ensure data directory and files exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(CURRICULUM_FILE)) fs.writeFileSync(CURRICULUM_FILE, '');
if (!fs.existsSync(PROGRESS_FILE)) fs.writeFileSync(PROGRESS_FILE, '{}');

function readProgress() {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeProgress(data) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2));
}

function sendJSON(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => resolve(body));
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // API routes
  if (pathname === '/api/signin' && req.method === 'POST') {
    const body = JSON.parse(await readBody(req));
    const name = (body.name || '').trim();
    if (!name) return sendJSON(res, { error: 'Name required' }, 400);

    const progress = readProgress();
    if (!(name in progress)) {
      progress[name] = 0;
      writeProgress(progress);
    }
    const isAdmin = name.toLowerCase() === 'vy';
    return sendJSON(res, { name, isAdmin });
  }

  if (pathname === '/api/curriculum' && req.method === 'GET') {
    const content = fs.readFileSync(CURRICULUM_FILE, 'utf8');
    return sendJSON(res, { content });
  }

  if (pathname === '/api/curriculum' && req.method === 'POST') {
    const body = JSON.parse(await readBody(req));
    fs.writeFileSync(CURRICULUM_FILE, body.content || '');

    // Reset all user view statuses to 0
    const progress = readProgress();
    for (const name in progress) {
      progress[name] = 0;
    }
    writeProgress(progress);

    return sendJSON(res, { success: true });
  }

  if (pathname === '/api/track-view' && req.method === 'POST') {
    const body = JSON.parse(await readBody(req));
    const name = (body.name || '').trim();
    if (!name) return sendJSON(res, { error: 'Name required' }, 400);

    const progress = readProgress();
    progress[name] = 1;
    writeProgress(progress);
    return sendJSON(res, { success: true });
  }

  if (pathname === '/api/progress' && req.method === 'GET') {
    const progress = readProgress();
    return sendJSON(res, progress);
  }

  if (pathname === '/api/progress/user' && req.method === 'GET') {
    const name = url.searchParams.get('name');
    const progress = readProgress();
    return sendJSON(res, { name, viewed: progress[name] || 0 });
  }

  // Serve static files
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(PUBLIC_DIR, filePath);

  const ext = path.extname(filePath);
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
  };

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
    res.end(content);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
