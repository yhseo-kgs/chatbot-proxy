// /api/chat.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Method Not Allowed' });

  const { CLOVA_API_KEY, NCP_APIGW_KEY, CLOVA_MODEL_ID='HCX-007' } = process.env;
  const missing = [];
  if (!CLOVA_API_KEY) missing.push('CLOVA_API_KEY');
  if (!NCP_APIGW_KEY) missing.push('NCP_APIGW_KEY');
  if (!CLOVA_MODEL_ID) missing.push('CLOVA_MODEL_ID');
  if (missing.length) {
    return res.status(401).json({ ok:false, where:'proxy/env', missing, hint:'Vercel Production에 넣고 Redeploy' });
  }

  try {
    const { message } = req.body || {};
    if (!message) return res.status(400).json({ ok:false, error:'message required' });

    const url = 'https://clovastudio.apigw.ntruss.com/testapp/v1/chat-completions';
    const upstream = await fetch(url, {
      method:'POST',
      headers:{
        'Content-Type':'application/json; charset=utf-8',
        'X-NCP-APIGW-API-KEY': NCP_APIGW_KEY,
        'X-ClovaAI-Api-Key': CLOVA_API_KEY,
      },
      body: JSON.stringify({ model: CLOVA_MODEL_ID, messages:[{ role:'user', content: message }], temperature:0.2 })
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(()=> '');
      return res.status(upstream.status).json({
        ok:false, where:'upstream/clova', status: upstream.status, model: CLOVA_MODEL_ID,
        hint: (upstream.status===401||upstream.status===403)
          ? 'Service App 모델/키/상태 확인'
          : '요청 포맷/쿼터 확인',
        upstream: text.slice(0,1000)
      });
    }
    const data = await upstream.json();
    return res.status(200).json({ ok:true, data });
  } catch (e) {
    return res.status(500).json({ ok:false, where:'proxy', error:String(e) });
  }
}