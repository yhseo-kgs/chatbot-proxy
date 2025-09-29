// /api/chat.js - 서비스 키 방식으로 변경
module.exports = async (req, res) => {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Method Not Allowed' });

  const { CLOVA_API_KEY, CLOVA_MODEL_ID='HCX-007' } = process.env;
  if (!CLOVA_API_KEY) {
    return res.status(401).json({ 
      ok:false, 
      where:'proxy/env', 
      missing: ['CLOVA_API_KEY'], 
      hint:'Vercel Production에 서비스 키 넣고 Redeploy' 
    });
  }

  try {
    const { message } = req.body || {};
    if (!message) return res.status(400).json({ ok:false, error:'message required' });

    // 서비스 키 방식: stream 엔드포인트 + Authorization Bearer 헤더
    const url = `https://clovastudio.stream.ntruss.com/v1/chat-completions/${CLOVA_MODEL_ID}`;
    
    const upstream = await fetch(url, {
      method:'POST',
      headers:{
        'Authorization': `Bearer ${CLOVA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        // 서비스 키 방식에서는 model 필드 불필요 (URL에 포함됨)
        messages:[{ role:'user', content: message }], 
        temperature: 0.5 
      })
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(()=> '');
      return res.status(upstream.status).json({
        ok:false, 
        where:'upstream/clova', 
        status: upstream.status, 
        model: CLOVA_MODEL_ID,
        hint: (upstream.status===401||upstream.status===403)
          ? '서비스 키 확인 필요'
          : '요청 포맷/쿼터 확인',
        upstream: text.slice(0,1000)
      });
    }
    
    const data = await upstream.json();
    return res.status(200).json({ ok:true, data });
    
  } catch (e) {
    return res.status(500).json({ ok:false, where:'proxy', error:String(e) });
  }
};