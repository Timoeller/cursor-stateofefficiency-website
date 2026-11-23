import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const port = Number(process.env.PORT || 4173);
const prefix = (process.env.BASE_PATH ?? '/cursor-stateofefficiency-website').replace(/\/$/, '');

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2'
};

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let rel = decodeURIComponent(url.pathname);
    if (prefix && !rel.startsWith(prefix + '/') && rel !== prefix) {
      res.writeHead(404).end('Not found');
      return;
    }
    rel = rel.slice(prefix.length) || '/';
    if (rel === '/' || rel.endsWith('/')) rel += 'index.html';
    const file = path.join(dist, rel);
    if (!file.startsWith(dist)) {
      res.writeHead(403).end();
      return;
    }
    try {
      const body = await fs.readFile(file);
      res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      try {
        const body = await fs.readFile(path.join(dist, '404.html'));
        res.writeHead(404, { 'content-type': types['.html'] }).end(body);
      } catch {
        res.writeHead(404).end('Not found');
      }
    }
  })
  .listen(port, () => console.log(`Serving dist/ at http://localhost:${port}${prefix}/`));
