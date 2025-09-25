export default function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 간단한 테스트 응답
  res.status(200).json({
    message: "API is working!",
    method: req.method,
    timestamp: new Date().toISOString(),
    environment: {
      hasAccessKey: !!process.env.NCP_ACCESS_KEY,
      hasSecretKey: !!process.env.NCP_SECRET_KEY,
      hasClovaKey: !!process.env.CLOVA_API_KEY
    }
  });
}