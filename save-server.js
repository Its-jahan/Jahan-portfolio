#!/usr/bin/env node
/**
 * Portfolio Save Server — port 4322
 * Receives admin panel data as JSON and patches it into Portfolio.html
 * so that published changes are visible to everyone (not just via localStorage).
 *
 * Also handles brief form submissions (contact form → admin inbox).
 *
 * Start with:  node /Users/jahan/CV/save-server.js
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const CV_FILE    = path.join(__dirname, 'Portfolio.html');
const SYNC_FILE  = '/Users/jahan/Portflio/Portfolio.html';
const BRIEFS_FILE= path.join(__dirname, 'briefs.json');
const TAG_OPEN   = '<script id="portfolio-data" type="application/json">';
const TAG_CLOSE  = '</script>';
const PORT       = 4322;

// Load or initialise briefs store
function loadBriefs() {
  try { return JSON.parse(fs.readFileSync(BRIEFS_FILE, 'utf8')); } catch(_) { return []; }
}
function saveBriefs(briefs) {
  fs.writeFileSync(BRIEFS_FILE, JSON.stringify(briefs, null, 2), 'utf8');
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  // ── POST /save  — patch Portfolio.html ─────────────────
  if (req.method === 'POST' && req.url === '/save') {
    try {
      const body = await readBody(req);
      JSON.parse(body); // validate

      let html = fs.readFileSync(CV_FILE, 'utf8');
      const start = html.indexOf(TAG_OPEN);
      const end   = html.indexOf(TAG_CLOSE, start + TAG_OPEN.length);
      if (start === -1 || end === -1) throw new Error('portfolio-data tag not found in HTML');

      html = html.slice(0, start + TAG_OPEN.length) + body + html.slice(end);
      fs.writeFileSync(CV_FILE,   html, 'utf8');
      try { fs.writeFileSync(SYNC_FILE, html, 'utf8'); } catch(_) {} // sync copy, optional

      console.log(`[${new Date().toLocaleTimeString()}] ✓ Portfolio.html updated & synced`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } catch(e) {
      console.error('Save error:', e.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // ── POST /submit-brief  — save contact form submission ─
  if (req.method === 'POST' && req.url === '/submit-brief') {
    try {
      const body = await readBody(req);
      const brief = JSON.parse(body);
      brief.ts = brief.ts || new Date().toISOString();
      const briefs = loadBriefs();
      briefs.push(brief);
      saveBriefs(briefs);
      console.log(`[${new Date().toLocaleTimeString()}] 📩 New brief from ${brief.name || '(no name)'} <${brief.email || ''}>`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } catch(e) {
      console.error('Brief save error:', e.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // ── GET /briefs  — return all stored briefs ─────────────
  if (req.method === 'GET' && req.url === '/briefs') {
    const briefs = loadBriefs();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(briefs));
    return;
  }

  res.writeHead(404); res.end();

}).listen(PORT, () => {
  console.log(`💾  Save server running → http://localhost:${PORT}`);
  console.log(`    Watching: ${CV_FILE}`);
  console.log(`    Briefs:   ${BRIEFS_FILE}`);
});
