module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // Vercel 환경은 파일시스템 쓰기 불가 — JSON 다운로드 버튼 안내
  res.status(501).json({
    ok: false,
    message: 'Vercel 환경에서는 서버 저장이 지원되지 않습니다. 대신 [JSON 다운로드] 버튼으로 저장하세요.'
  });
};
