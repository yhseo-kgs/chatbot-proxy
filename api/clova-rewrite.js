// ✅ CLOVA Studio HCX-007 Chat Completions v3 + Vercel ESM 환경 완전 대응 버전
export default async function handler(req, res) {
  // ✅ CORS 헤더 설정 (브라우저 호출용)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    // ✅ 요청 파싱
    const body = req.body || (await req.json?.());
    const message = body?.message || "기본 질문입니다.";

    // ✅ 환경 변수 검사 (API Key만)
    if (!process.env.CLOVA_API_KEY) {
      return res
        .status(401)
        .json({ ok: false, error: "Missing CLOVA_API_KEY" });
    }

    // ✅ UUID (요청 추적용)
    const requestId = crypto.randomUUID();

    // ✅ CLOVA Studio 요청 Payload (chat.js 설정과 동일)
    const payload = {
      messages: [
        {
          role: "system",
          content: [{ type: "text", text: "공손하고 명확한 '~합니다'체로 완전한 문장으로 답하세요. " +
            "답변은 중간에 끊기지 않도록 하고, 자연스럽게 종결어미로 마무리하세요. " +
            "수치·용어는 원문 그대로 유지하세요." }]
        },
        {
          role: "user",
          content: [{ type: "text", text: message }]
        }
      ],
      thinking: { effort: "low" },
      temperature: 0.35,
      topP: 0.8,
      topK: 0,
      repetitionPenalty: 1.1,
      maxCompletionTokens: 512
    };

    // ✅ HCX-007 엔드포인트 요청
    const response = await fetch(
      "https://clovastudio.stream.ntruss.com/v3/chat-completions/HCX-007",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.CLOVA_API_KEY}`,
          "X-NCP-CLOVASTUDIO-REQUEST-ID": requestId
        },
        body: JSON.stringify(payload)
      }
    );

    // ✅ 응답 파싱 (v3 표준 경로 우선, 폴백 포함)
    const data = await response.json();
    const text =
      data?.result?.message?.content?.trim() ||
      data?.choices?.[0]?.message?.content?.trim() ||
      "응답이 없습니다.";

    console.log("[CLOVA-REWRITE] 응답 구조:", JSON.stringify(data, null, 2));

    // ✅ 결과 반환
    res.status(200).json({
      ok: true,
      text,
      source: "clova-rewrite"
    });
  } catch (error) {
    console.error("[CLOVA-REWRITE] 오류:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
}

// ✅ CORS 헤더 추가 (선택, 브라우저 호출용)
export const config = {
  api: {
    bodyParser: true
  }
};
