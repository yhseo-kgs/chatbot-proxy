// /api/clova-rewrite.js
// semantic-search의 llm_payload를 받아 Clova로 자연어 재가공

export default async function handler(req, res) {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const { 
    CLOVA_API_KEY, 
    CLOVA_CLIENT_ID, 
    CLOVA_CLIENT_SECRET, 
    CLOVA_MODEL_ID = 'HCX-007' 
  } = process.env;
  const { message } = req.body || {};

  // 환경 변수 체크
  if (!CLOVA_API_KEY || !CLOVA_CLIENT_ID || !CLOVA_CLIENT_SECRET) {
    return res.status(401).json({ 
      ok: false, 
      error: 'Missing required Clova credentials',
      hint: 'Set CLOVA_API_KEY, CLOVA_CLIENT_ID, CLOVA_CLIENT_SECRET in Vercel Environment Variables'
    });
  }

  // message 체크 (llm_payload)
  if (!message) {
    return res.status(400).json({ 
      ok: false, 
      error: 'message required',
      hint: 'Send { message: top1.llm_payload }'
    });
  }

  try {
    console.log('[CLOVA-REWRITE] 요청 시작');
    console.time('[CLOVA-REWRITE] 처리 시간');

    const url = `https://clovastudio.stream.ntruss.com/v3/chat-completions/${CLOVA_MODEL_ID}`;
    
    // HCX-007 v3 규격에 맞는 payload 구조
    const GUARDRAIL = "공손하고 명확한 '~합니다'체로 2–3줄만 답하세요. 수치·용어는 원문 그대로 유지하세요.";
    
    const payload = {
      messages: [
        {
          role: "system",
          content: [
            { type: "text", text: GUARDRAIL }
          ]
        },
        {
          role: "user",
          content: [
            { type: "text", text: message }
          ]
        }
      ],
      thinking: { effort: "low" },
      temperature: 0.25,
      topP: 0.8,
      topK: 0,
      repetitionPenalty: 1.1,
      maxCompletionTokens: 800
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CLOVA_API_KEY}`,
        'X-NCP-APIGW-API-KEY-ID': process.env.CLOVA_CLIENT_ID,
        'X-NCP-APIGW-API-KEY': process.env.CLOVA_CLIENT_SECRET
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`[CLOVA-REWRITE] HTTP ${response.status}:`, errorText.slice(0, 200));
      throw new Error(`Clova API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data?.result?.message?.content?.trim() || '';

    if (!text) {
      console.warn('[CLOVA-REWRITE] 빈 응답 수신');
      throw new Error('Empty response from Clova');
    }

    console.timeEnd('[CLOVA-REWRITE] 처리 시간');
    console.log('[CLOVA-REWRITE] 성공:', text.substring(0, 50) + '...');

    return res.status(200).json({ 
      ok: true, 
      text,
      source: 'clova-rewrite'
    });

  } catch (error) {
    console.error('[CLOVA-REWRITE] 오류:', error.message);
    return res.status(500).json({ 
      ok: false, 
      error: error.message,
      fallback: true  // 폴백 필요 신호
    });
  }
}

