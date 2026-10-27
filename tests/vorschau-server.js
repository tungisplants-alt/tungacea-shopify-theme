// Winziger Dateiserver nur für die Rohbau-Vorschauen in diesem Ordner.
// Gehört nicht zum Theme und wird von Shopify nicht ausgeliefert.
const http = require('http');
const fs = require('fs');
const path = require('path');

const WURZEL = __dirname;
const PORT = Number(process.env.PORT || 4321);
const TYP = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };

http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/') rel = '/archiv-vorschau.html';

  // Anfragen nach /assets/... aus dem Theme bedienen, damit echtes CSS greift.
  let datei = rel.startsWith('/assets/')
    ? path.join(WURZEL, '..', rel)
    : path.join(WURZEL, rel);

  const grenze = rel.startsWith('/assets/') ? path.join(WURZEL, '..', 'assets') : WURZEL;
  if (!path.resolve(datei).startsWith(path.resolve(grenze))) { res.writeHead(403).end('nein'); return; }

  fs.readFile(datei, (err, buf) => {
    if (err) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('nicht gefunden: ' + rel); return; }
    res.writeHead(200, { 'content-type': TYP[path.extname(datei)] || 'application/octet-stream' }).end(buf);
  });
}).listen(PORT, () => console.log('Vorschau auf http://localhost:' + PORT + '/'));
