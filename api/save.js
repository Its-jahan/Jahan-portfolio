const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Jahan2026';
const REPO = process.env.GITHUB_REPO || 'Its-jahan/Jahan-portfolio';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const DATA_OPEN = '<script id="portfolio-data" type="application/json">';
const DATA_CLOSE = '</script>';

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

async function github(path, options = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('Missing GITHUB_TOKEN environment variable');
  const response = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {})
    }
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.message || `GitHub request failed for ${path}`);
  return json;
}

function encodeBase64(value) {
  return Buffer.from(value, 'utf8').toString('base64');
}

function decodeBase64(value) {
  return Buffer.from(value, 'base64').toString('utf8');
}

async function updateHtml(path, data) {
  const file = await github(`${path}?ref=${encodeURIComponent(BRANCH)}`);
  const html = decodeBase64(file.content || '');
  const start = html.indexOf(DATA_OPEN);
  const end = html.indexOf(DATA_CLOSE, start + DATA_OPEN.length);
  if (start === -1 || end === -1) throw new Error(`${path} is missing portfolio-data script`);

  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  const nextHtml = html.slice(0, start + DATA_OPEN.length) + json + html.slice(end);
  if (nextHtml === html) return { path, changed: false };

  await github(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `Update portfolio content in ${path}`,
      content: encodeBase64(nextHtml),
      sha: file.sha,
      branch: BRANCH
    })
  });
  return { path, changed: true };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  try {
    const { password, data } = req.body || {};
    if (password !== ADMIN_PASSWORD) return send(res, 401, { error: 'Unauthorized' });
    if (!data || typeof data !== 'object') return send(res, 400, { error: 'Missing data' });

    const results = [];
    results.push(await updateHtml('index.html', data));
    results.push(await updateHtml('Portfolio.html', data));
    send(res, 200, { ok: true, results });
  } catch (error) {
    send(res, 500, { error: error.message || 'Save failed' });
  }
};
