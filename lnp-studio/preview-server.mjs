import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dir => fileURLToPath(new URL(dir, import.meta.url)).replace(/[\\/]$/, '');
// Local app: live source first, then generated build output (vendor bundle, icons, service worker).
const localRoots = [root('./src/'), root('./dist/')],
  pagesRoots = [root('../github-pages/')];
async function resolveFile(roots, relative) {
  for (const dir of roots) {
    let file = path.resolve(dir, relative || 'index.html');
    if (!file.startsWith(dir + path.sep) && file !== dir) return null;
    try {
      if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
      await stat(file);
      return file;
    } catch {}
  }
  return null;
}
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
};
const host = process.argv.includes('--lan') ? '0.0.0.0' : '127.0.0.1';
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/portable') {
      res.setHeader('Content-Type', mime['.html']);
      res.setHeader('Cache-Control', 'no-store');
      res.end(await readFile(new URL('../LNP-calculator.html', import.meta.url)));
      return;
    }
    if (pathname === '/pages') {
      res.writeHead(302, { Location: '/pages/' });
      res.end();
      return;
    }
    const isPages = pathname.startsWith('/pages/');
    const relative = (isPages ? pathname.slice(6) : pathname).replace(/^\//, '');
    const file = await resolveFile(isPages ? pagesRoots : localRoots, relative);
    if (!file) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const type = mime[path.extname(file)];
    if (!type) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 'no-store');
    res.end(await readFile(file));
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});
server.listen(4173, host, () =>
  console.log(
    `Local preview: http://127.0.0.1:4173${host === '0.0.0.0' ? ' (LAN access enabled)' : ''}`,
  ),
);
