// Local preview of the exported files, with the same response headers as the Vercel bundle.
import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const output = fileURLToPath(new URL('../.vercel/output/', import.meta.url));
let config;
try {
    config = JSON.parse(await readFile(path.join(output, 'config.json'), 'utf8'));
} catch {
    throw new Error('No static build found. Run php artisan site:export first.');
}
if (config.version !== 3) throw new Error('Unsupported static export version.');
const root = await realpath(path.join(output, 'static'));
const headers = config.routes[0].headers;
const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.svg': 'image/svg+xml',
};
const port = Number(process.env.PORT || 8001);
const server = createServer(async (req, res) => {
    for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
    if (!['GET', 'HEAD'].includes(req.method)) {
        res.writeHead(405, { Allow: 'GET, HEAD' }).end();
        return;
    }
    try {
        let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
        if (pathname === '/') pathname = '/index.html';
        const file = await realpath(path.join(root, pathname));
        if (!file.startsWith(root + path.sep) || !(await stat(file)).isFile() || !types[path.extname(file)]) {
            res.writeHead(404).end();
            return;
        }
        const body = await readFile(file);
        res.writeHead(200, { 'Content-Type': types[path.extname(file)], 'Content-Length': body.length });
        res.end(req.method === 'HEAD' ? undefined : body);
    } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
    }
});
server.listen(port, '127.0.0.1', () => process.stdout.write(`Static preview: http://127.0.0.1:${port}\n`));
