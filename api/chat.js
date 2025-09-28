// /api/chat.js  (Node 18+ / Edge-런타임 아님)
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const {
    CLOVA_API_KEY,
    NCP_APIGW_KEY,
    CLOVA_MODEL_ID = 'HCX-007', // 기본값 007
  } = process.env;

  const missing = [];
  if (!CLOVA_API_KEY) missing.push('CLOVA_API_KEY');
  if (!NCP_APIGW_KEY) missing.push('NCP_APIGW_KEY');
  if (!CLOVA_MODEL_ID) missing.push('CLOVA_MODEL_ID');

  if (missing.length) {
    return res.status(401).json({
      ok: false,
      where: 'proxy/env',
      reason: 'missing_env',
      missing,
      hint: 'Vercel > Project > Settings > Environment Variables (Production) 에 값 넣고 Redeploy',
    });
  }

  try {
    const { message } = req.body || {};
    if (!message) {
      return res.status(400).json({ ok: false, error: 'message is required' });
    }

    // 클로바 엔드포인트 (서비스앱 인퍼런스 API)
    const url = 'https://clovastudio.apigw.ntruss.com/testapp/v1/chat-completions';
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-NCP-APIGW-API-KEY': NCP_APIGW_KEY,
        'X-ClovaAI-Api-Key': CLOVA_API_KEY,
      },
      body: JSON.stringify({
        model: CLOVA_MODEL_ID, // HCX-007 등
        messages: [{ role: 'user', content: message }],
        temperature: 0.2,
      }),
    });

    // 업스트림이 실패하면 상세를 그대로 전달
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      return res.status(resp.status).json({
        ok: false,
        where: 'upstream/clova',
        status: resp.status,
        statusText: resp.statusText,
        model: CLOVA_MODEL_ID,
        hint:
          resp.status === 401 || resp.status === 403
            ? 'Service App의 모델/키/권한 확인 (모델 ID가 프로젝트와 일치하는지, Service App이 사용 상태인지)'
            : '요청 포맷/쿼터/일시적 오류 확인',
        upstream: text?.slice(0, 4000), // 안전하게 일부만
      });
    }

    const data = await resp.json();
    return res.status(200).json({ ok: true, data });
  } catch (e) {
    return res.status(500).json({ ok: false, where: 'proxy', error: String(e) });
  }
}