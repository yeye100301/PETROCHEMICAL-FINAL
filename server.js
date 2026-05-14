const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const url   = require('url');
const { exec } = require('child_process');

const PORT = 5500;
// pkg 빌드 시에는 exe가 있는 폴더, 개발 시에는 현재 폴더 사용
const BASE_DIR = process.pkg ? path.dirname(process.execPath) : __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv':  'text/csv; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
  '.svg':  'image/svg+xml',
};

const server = http.createServer((req, res) => {
  const parsed   = url.parse(req.url, true);
  const pathname = parsed.pathname;

  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  // ── matdata.json 저장: POST /_save-matdata ────────────────
  if (pathname === '/_save-matdata' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        JSON.parse(body); // 유효성 검사
        const savePath = path.join(BASE_DIR, 'matdata.json');
        fs.writeFile(savePath, body, 'utf8', err => {
          if (err) { res.writeHead(500); res.end('저장 실패: ' + err.message); return; }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        });
      } catch (e) { res.writeHead(400); res.end('JSON 파싱 오류: ' + e.message); }
    });
    return;
  }

  // ── CORS 프록시: /_proxy?url=... ──────────────────────────
  if (pathname === '/_proxy' && parsed.query.url) {
    const target = parsed.query.url;
    try {
      const t = new URL(target);
      https.get(
        { hostname: t.hostname, path: t.pathname + t.search,
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*' } },
        proxyRes => {
          res.writeHead(200, {
            'Content-Type': proxyRes.headers['content-type'] || 'application/octet-stream',
            'Access-Control-Allow-Origin': '*',
          });
          proxyRes.pipe(res);
        }
      ).on('error', e => { res.writeHead(502); res.end(e.message); });
    } catch (e) { res.writeHead(400); res.end('잘못된 URL: ' + e.message); }
    return;
  }

  // ── 정적 파일 서빙 ─────────────────────────────────────────
  let filePath = decodeURIComponent(pathname);
  if (filePath === '/') filePath = '/dashboard.html';

  const absPath = path.join(BASE_DIR, filePath);
  if (!absPath.startsWith(BASE_DIR)) { res.writeHead(403); res.end('Forbidden'); return; }

  const ext  = path.extname(absPath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';

  fs.readFile(absPath, (err, data) => {
    if (err) { res.writeHead(404); res.end('파일을 찾을 수 없습니다: ' + filePath); return; }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

server.listen(PORT, () => {
  const dashUrl = `http://localhost:${PORT}/dashboard.html`;
  console.log('');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║     한솔제지 부재료 대시보드 서버 실행 중       ║');
  console.log(`║  주소 : http://localhost:${PORT}/dashboard.html  ║`);
  console.log('║  종료 : 이 창을 닫거나  Ctrl + C 입력         ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');
  setTimeout(() => {
    exec(`start "" "${dashUrl}"`, err => {
      if (err) console.log(`브라우저 자동 실행 실패 — 직접 열기: ${dashUrl}`);
    });
  }, 500);
});

server.on('error', e => {
  if (e.code === 'EADDRINUSE') {
    console.error(`\n오류: 포트 ${PORT}이 이미 사용 중입니다.`);
    console.error('기존 서버를 종료하거나 잠시 후 다시 시도해 주세요.\n');
  } else {
    console.error('서버 오류:', e.message);
  }
  process.exit(1);
});
