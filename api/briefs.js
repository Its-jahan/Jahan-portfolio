const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Jahan2026';
const REPO = process.env.GITHUB_REPO || 'Its-jahan/Jahan-portfolio';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const BRIEFS_PATH = process.env.BRIEFS_PATH || 'data/briefs.json';

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
  if (!response.ok) {
    const notFound = response.status === 404 && options.allowMissing;
    if (notFound) return null;
    throw new Error(json.message || `GitHub request failed for ${path}`);
  }
  return json;
}

function encodeBase64(value) {
  return Buffer.from(value, 'utf8').toString('base64');
}

function decodeBase64(value) {
  return Buffer.from(value, 'base64').toString('utf8');
}

async function readBriefs() {
  const file = await github(`${BRIEFS_PATH}?ref=${encodeURIComponent(BRANCH)}`, { allowMissing: true });
  if (!file) return { briefs: [], sha: null };
  const parsed = JSON.parse(decodeBase64(file.content || '') || '[]');
  return { briefs: Array.isArray(parsed) ? parsed : [], sha: file.sha };
}

async function writeBriefs(briefs, sha) {
  await github(BRIEFS_PATH, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Store new portfolio brief',
      content: encodeBase64(JSON.stringify(briefs, null, 2) + '\n'),
      sha: sha || undefined,
      branch: BRANCH
    })
  });
}

function cleanBrief(input) {
  const text = (value, max = 2000) => String(value || '').trim().slice(0, max);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    name: text(input.name, 120),
    company: text(input.company, 160),
    email: text(input.email, 180),
    engagement: text(input.engagement, 120),
    message: text(input.message, 3000),
    interestedIn: Array.isArray(input.interestedIn) ? input.interestedIn.map(v => text(v, 80)).filter(Boolean) : []
  };
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const password = req.headers['x-admin-password'] || req.query?.password || '';
      if (password !== ADMIN_PASSWORD) return send(res, 401, { error: 'Unauthorized' });
      const { briefs } = await readBriefs();
      return send(res, 200, { ok: true, briefs });
    }

    if (req.method === 'POST') {
      const brief = cleanBrief(req.body || {});
      if (!brief.name || !brief.email || !brief.message) {
        return send(res, 400, { error: 'Name, email and message are required' });
      }
      const { briefs, sha } = await readBriefs();
      briefs.push(brief);
      await writeBriefs(briefs.slice(-200), sha);
      return send(res, 200, { ok: true });
    }

    send(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    send(res, 500, { error: error.message || 'Brief handling failed' });
  }
};
