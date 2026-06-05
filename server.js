const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const APPLICATIONS_FILE = path.join(DATA_DIR, 'applications.json');

const jobs = [
  {
    id: 'front-end-developer',
    title: 'Frontend Developer',
    team: 'Product Experience',
    location: 'Remote',
    type: 'Full-time',
    salary: '$95k - $125k',
    summary: 'Build polished candidate and recruiter experiences with fast, accessible interfaces.',
    skills: ['React', 'CSS', 'Accessibility']
  },
  {
    id: 'backend-engineer',
    title: 'Backend Engineer',
    team: 'Platform',
    location: 'San Francisco, CA',
    type: 'Full-time',
    salary: '$110k - $145k',
    summary: 'Own application APIs, form workflows, and reliable persistence across services.',
    skills: ['Node.js', 'APIs', 'Databases']
  },
  {
    id: 'talent-ops-specialist',
    title: 'Talent Ops Specialist',
    team: 'Hiring',
    location: 'Hybrid',
    type: 'Contract',
    salary: '$70k - $90k',
    summary: 'Keep the pipeline organized and help candidates move smoothly through each stage.',
    skills: ['Operations', 'CRM', 'Communication']
  }
];

function ensureStorage() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(APPLICATIONS_FILE)) {
    fs.writeFileSync(APPLICATIONS_FILE, '[]', 'utf8');
  }
}

function readApplications() {
  ensureStorage();
  try {
    const raw = fs.readFileSync(APPLICATIONS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveApplications(applications) {
  ensureStorage();
  fs.writeFileSync(APPLICATIONS_FILE, JSON.stringify(applications, null, 2));
}

function send(res, statusCode, body, headers = {}) {
  const responseHeaders = {
    'Content-Type': 'text/plain; charset=utf-8',
    ...headers
  };
  res.writeHead(statusCode, responseHeaders);
  res.end(body);
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(data));
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.js':
      return 'application/javascript; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.ico':
      return 'image/x-icon';
    default:
      return 'application/octet-stream';
  }
}

function serveStatic(res, filePath) {
  if (!filePath.startsWith(PUBLIC_DIR)) {
    send(res, 403, 'Forbidden');
    return;
  }

  fs.readFile(filePath, (err, fileData) => {
    if (err) {
      send(res, 404, 'Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentTypeFor(filePath),
      'Cache-Control': 'no-store'
    });
    res.end(fileData);
  });
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

function buildApplication(payload) {
  const application = {
    id: `app_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    fullName: normalizeText(payload.fullName),
    email: normalizeText(payload.email).toLowerCase(),
    phone: normalizeText(payload.phone),
    role: normalizeText(payload.role),
    location: normalizeText(payload.location),
    workMode: normalizeText(payload.workMode),
    experience: normalizeText(payload.experience),
    portfolio: normalizeText(payload.portfolio),
    availability: normalizeText(payload.availability),
    coverLetter: normalizeText(payload.coverLetter),
    resumeUrl: normalizeText(payload.resumeUrl),
    status: 'received',
    createdAt: new Date().toISOString()
  };

  const requiredFields = ['fullName', 'email', 'role', 'experience', 'availability'];
  const missing = requiredFields.filter(key => !application[key]);
  if (missing.length > 0) {
    const error = new Error(`Missing required fields: ${missing.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  if (!/^\S+@\S+\.\S+$/.test(application.email)) {
    const error = new Error('Please provide a valid email address.');
    error.statusCode = 400;
    throw error;
  }

  return application;
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, 'http://localhost');
  const pathname = requestUrl.pathname;

  if (req.method === 'GET' && pathname === '/api/jobs') {
    sendJson(res, 200, { jobs });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/applications') {
    const applications = readApplications().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    sendJson(res, 200, { applications });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/applications') {
    try {
      const payload = await parseJsonBody(req);
      const application = buildApplication(payload);
      const applications = readApplications();
      applications.unshift(application);
      saveApplications(applications);
      sendJson(res, 201, {
        message: 'Application submitted successfully.',
        application
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      sendJson(res, statusCode, {
        error: error.message || 'Something went wrong.'
      });
    }
    return;
  }

  if (req.method === 'GET' && pathname === '/health') {
    sendJson(res, 200, { ok: true });
    return;
  }

  const staticPath = pathname === '/' ? path.join(PUBLIC_DIR, 'index.html') : path.join(PUBLIC_DIR, pathname);
  if (staticPath.startsWith(PUBLIC_DIR) && fs.existsSync(staticPath) && fs.statSync(staticPath).isFile()) {
    serveStatic(res, staticPath);
    return;
  }

  const fallback = path.join(PUBLIC_DIR, 'index.html');
  if (fs.existsSync(fallback)) {
    serveStatic(res, fallback);
    return;
  }

  send(res, 404, 'Not found');
});

ensureStorage();

const port = Number(process.env.PORT || 3001);
server.listen(port, () => {
  console.log(`Job portal running at http://localhost:${port}`);
});
