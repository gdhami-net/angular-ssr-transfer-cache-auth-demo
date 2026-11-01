// A tiny API that counts every GET it answers, split by who asked:
// the Angular server during rendering (Node's fetch) or the browser.
//
//   GET  /api/profile  -> one user's data, no Cache-Control header
//   GET  /api/orders   -> one user's data, Cache-Control: private
//   GET  /api/catalog  -> the same data for everyone, still behind the token
//   GET  /hits         -> the counters
//   POST /reset        -> zero the counters
import { createServer } from 'node:http';

const port = Number(process.env.API_PORT ?? 4355);
let hits = [];

const routes = {
  '/api/profile': {
    headers: {},
    body: { name: 'Alice Martin', email: 'alice@example.com', plan: 'Pro' },
  },
  '/api/orders': {
    headers: { 'Cache-Control': 'private' },
    body: [{ id: 1042, total: 89.5 }, { id: 1043, total: 12 }],
  },
  '/api/catalog': {
    headers: {},
    body: [{ sku: 'A-1', name: 'Desk lamp' }, { sku: 'B-7', name: 'Notebook' }],
  },
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization',
};

createServer((req, res) => {
  const path = new URL(req.url, 'http://x').pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors).end();
    return;
  }
  if (path === '/hits') {
    res.writeHead(200, { 'Content-Type': 'application/json', ...cors }).end(JSON.stringify(hits));
    return;
  }
  if (path === '/reset' && req.method === 'POST') {
    hits = [];
    res.writeHead(204, cors).end();
    return;
  }

  const route = routes[path];
  if (!route || req.method !== 'GET') {
    res.writeHead(404, cors).end();
    return;
  }

  const ua = req.headers['user-agent'] ?? '';
  const from = ua.includes('Mozilla') ? 'browser' : 'server';
  hits.push({ path, from, auth: req.headers.authorization ?? null });
  console.log(`${from.padEnd(7)} GET ${path}  auth=${req.headers.authorization ?? '-'}`);

  res
    .writeHead(200, { 'Content-Type': 'application/json', ...route.headers, ...cors })
    .end(JSON.stringify(route.body));
}).listen(port, () => console.log(`API on http://localhost:${port}`));
