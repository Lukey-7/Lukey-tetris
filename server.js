const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : (process.argv[2] ? parseInt(process.argv[2], 10) : 4000);
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

const ROOT = path.resolve(__dirname);

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(req.url.split('?')[0]);
  } catch (e) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    return res.end('400 Bad Request', 'utf-8');
  }
  if (pathname.endsWith('/')) pathname += 'index.html';

  // Resolve inside the project folder only; block ../ traversal
  const filePath = path.resolve(ROOT, '.' + path.posix.normalize('/' + pathname));
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 Forbidden', 'utf-8');
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found', 'utf-8');
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + error.code, 'utf-8');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Retro Tetris Server running at http://localhost:${PORT}/`);
});
