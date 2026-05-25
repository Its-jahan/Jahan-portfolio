#!/usr/bin/env node
/**
 * Portfolio Save Server — port 4322
 * Receives admin panel data as JSON and patches it into Portfolio.html
 * so that published changes are visible to everyone (not just via localStorage).
 *
 * Start with:  node /Users/jahan/CV/save-server.js
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const CV_FILE   = path.join(__dirname, 'Portfolio.html');
const SYNC_FILE = '/Users/jahan/Portflio/Portfolio.html';
const TAG_OPEN  = '<script id="portfolio-data" type="application/json">';
const TAG_CLOSE = '</script>';
const PORT      = 4322;

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  if (req.method === 'POST' && req.url === '/save') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        // Validate JSON
        JSON.parse(body);

        let html = fs.readFileSync(CV_FILE, 'utf8');

        const start = html.indexOf(TAG_OPEN);
        const end   = html.indexOf(TAG_CLOSE, start + TAG_OPEN.length);
        if (start === -1 || end === -1) throw new Error('portfolio-data tag not found in HTML');

        html = html.slice(0, start + TAG_OPEN.length) + body + html.slice(end);

        fs.writeFileSync(CV_FILE,   html, 'utf8');
        fs.writeFileSync(SYNC_FILE, html, 'utf8');

        console.log(`[${new Date().toLocaleTimeString()}] ✓ Portfolio.html updated & synced`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        console.error('Save error:', e.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else {
    res.writeHead(404); res.end();
  }

}).listen(PORT, () => {
  console.log(`💾  Save server running → http://localhost:${PORT}`);
  console.log(`    Watching: ${CV_FILE}`);
  console.log(`    Syncs to: ${SYNC_FILE}`);
});
