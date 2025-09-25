// api/chat.js (CommonJS)
module.exports = async (req, res) => {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');

  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 간단한 테스트 응답
    return res.status(200).json({
      ok: true,
      method: req.method,
      timestamp: new Date().toISOString(),
      env: {
        NCP_ACCESS_KEY: Boolean(process.env.NCP_ACCESS_KEY),
        NCP_SECRET_KEY: Boolean(process.env.NCP_SECRET_KEY),
        CLOVA_API_KEY: Boolean(process.env.CLOVA_API_KEY),
      }
    });
  } catch (err) {
    return res.status(500).json({ 
      ok: false, 
      error: err.message 
    });
  }
};