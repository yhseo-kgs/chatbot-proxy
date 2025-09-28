// api/chat.js
// Vercel 환경변수에 다음을 등록하세요:
// CLOVA_API_KEY       = (CLOVA Studio "서비스 앱" API 키)
// NCP_APIGW_KEY       = (API Gateway 키)
// CLOVA_MODEL_ID      = HCX-007 (서비스 앱과 동일하게)

module.exports = async (req, res) => {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { message } = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Invalid request: message is required" });
    }

    const MODEL_ID = "HCX-007"; // 고정
    const CLOVA_URL = `https://clovastudio.stream.ntruss.com/v3/chat-completions/${MODEL_ID}`;

    const clovaRes = await fetch(CLOVA_URL, {
      method: "POST",
      headers: {
        "X-NCP-CLOVASTUDIO-API-KEY": process.env.CLOVA_API_KEY,   // 서비스 앱 키
        "X-NCP-APIGW-API-KEY": process.env.NCP_APIGW_KEY,         // API Gateway 키
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          // 시스템 프롬프트는 클로바 Studio의 작업에서 설정되어 있음
          { role: "user", content: [{ type: "text", text: message }] }
        ],
        // 파라미터는 최소화
        temperature: 0.5,
        topP: 0.8,
        topK: 20,
        repetitionPenalty: 1.1,
        maxCompletionTokens: 600
      })
    });

    // 401/403 등 에러 통과 처리
    if (!clovaRes.ok) {
      const errText = await clovaRes.text();
      return res.status(clovaRes.status).json({
        error: `CLOVA request failed: ${clovaRes.status}`,
        detail: errText
      });
    }

    const data = await clovaRes.json();
    
    // 프론트엔드가 기대하는 구조로 매핑
    const mapped = {
      status: data.status ?? { code: "20000", message: "OK" },
      result: {
        message: {
          role: data.result?.message?.role || "assistant",
          content: data.result?.message?.content || "",
          thinkingContent: data.result?.message?.thinkingContent || null
        }
      }
    };

    return res.status(200).json(mapped);
  } catch (e) {
    console.error("CLOVA proxy error:", e);
    return res.status(500).json({ error: "Server Error", detail: String(e) });
  }
};