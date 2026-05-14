const https = require('https');
const http  = require('http');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const target = req.query.url;
  if (!target) { res.status(400).end('Missing ?url='); return; }

  let t;
  try { t = new URL(target); } catch(e) { res.status(400).end('Invalid URL'); return; }

  const client = t.protocol === 'https:' ? https : http;
  client.get(
    { hostname: t.hostname, path: t.pathname + t.search,
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*' } },
    proxyRes => {
      res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'application/octet-stream');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.status(200);
      proxyRes.pipe(res);
    }
  ).on('error', e => { res.status(502).end(e.message); });
};
