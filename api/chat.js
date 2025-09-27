// api/chat.js (이전 방법으로 수정)
module.exports = async (req, res) => {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ status: { code: "40500", message: "Method Not Allowed" } });
  }

  try {
    // body 파싱 보장 (이전 방법)
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { message } = body ?? {};
    
    if (!message) {
      return res.status(400).json({ status: { code: "40000", message: "message is required" } });
    }

    // 환경변수 확인
    if (!process.env.CLOVA_API_KEY) {
      console.error('CLOVA_API_KEY not found');
      return res.status(500).json({
        status: { code: "50000", message: "Server configuration error" }
      });
    }

    // 내장 fetch 사용 (이전 방법)
    const CLOVA_URL = "https://clovastudio.stream.ntruss.com/v3/chat-completions/HCX-007";
    
    const clovaRes = await fetch(CLOVA_URL, {
      method: "POST",
      headers: {
        "X-NCP-CLOVASTUDIO-API-KEY": process.env.CLOVA_API_KEY,
        "X-NCP-APIGW-API-KEY": process.env.NCP_ACCESS_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { 
            role: "system", 
            content: [{ 
              type: "text", 
              text: "당신은 한국가스안전공사 KGS의 고압가스 특정설비 검사 및 안전관리에 대한 전문적인 정보를 제공하는 AI 챗봇입니다. 정확하고 도움이 되는 정보를 제공해주세요." 
            }] 
          },
          { 
            role: "user", 
            content: [{ 
              type: "text", 
              text: message 
            }] 
          }
        ],
        thinking: { effort: "low" },
        topP: 0.8,
        topK: 0,
        maxCompletionTokens: 2048,
        temperature: 0.5,
        repetitionPenalty: 1.1
      })
    });

    const data = await clovaRes.json();

    // 응답 상태 확인
    if (!clovaRes.ok) {
      console.error('CLOVA API Error:', data);
      return res.status(clovaRes.status).json({
        status: { code: "50000", message: "CLOVA API request failed" },
        details: data
      });
    }

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

  } catch (err) {
    console.error("CLOVA proxy error:", err);
    return res.status(500).json({ 
      status: { code: "50000", message: err.message } 
    });
  }
};