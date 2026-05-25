const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Jahan2026';

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const { password } = req.body || {};
  if (password !== ADMIN_PASSWORD) {
    res.statusCode = 401;
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }

  res.statusCode = 200;
  res.end(JSON.stringify({ ok: true }));
};
