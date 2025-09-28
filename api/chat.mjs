// /api/chat.mjs (ES Module 버전)
export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const { message } = req.body || {};
    console.log('MJS Received message:', message);

    // 단순 Echo 테스트
    return res.status(200).json({ 
      ok: true, 
      reply: `MJS Echo: ${message}`,
      timestamp: new Date().toISOString() 
    });
  } catch (err) {
    console.error('MJS API Error:', err);
    return res.status(500).json({ ok: false, error: 'Server Error' });
  }
}
