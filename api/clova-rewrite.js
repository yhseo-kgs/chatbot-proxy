// ✅ CLOVA Studio HCX-005 Chat Completions v3 + Vercel ESM 환경 완전 대응 버전
import { randomUUID } from "crypto";

// ✅ 통합 SYSTEM_PROMPT (톤앤매너 통제)
const SYSTEM_PROMPT = `
반드시 150토큰 이내로만 답변하세요. 길거나 불필요한 설명은 절대 하지 마세요.

너는 한국가스안전공사(KGS)의 특정설비 검사정보 시스템용 AI 챗봇이다.
대상은 고압가스안전관리법 하의 압력용기 안전관리자이며, 모바일 환경에서 간단하고 정확한 안내를 원한다.

[답변 규칙]
1. 항목을 나열하지 말고 한 문장으로 자연스럽게 이어서 설명한다.
2. 문단이 바뀌면 한 줄을 비워 구분한다.
3. **, -, #, 이모지 등 서식 문자는 절대 쓰지 않는다.
4. 공손하고 단정한 "~합니다" 어미로 끝낸다.
5. 실시간 정보나 범위 밖 질문이면 관련 지사 대표번호 문의를 안내한다.
`.trim();

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
    const intent = body?.intent; // 의도 감지 (greet 등)

    // ✅ 환경 변수 검사 (API Key만)
    if (!process.env.CLOVA_API_KEY) {
      return res
        .status(401)
        .json({ ok: false, error: "Missing CLOVA_API_KEY" });
    }

    // ✅ UUID (요청 추적용)
    const requestId = randomUUID();

    // ✅ 인사 전용 초단문 프롬프트 (선택적)
    const SYS_SMALLTALK = `반드시 한 문장(60~90토큰 이내)으로 공손하게 인사만 답하세요. 서식/이모지 금지.`.trim();
    
    // ✅ intent에 따른 프롬프트 선택
    const systemContent = intent === "greet"
      ? `${SYS_SMALLTALK}\n\n${SYSTEM_PROMPT}`
      : SYSTEM_PROMPT;

    // ✅ CLOVA Studio 요청 Payload (통합 프롬프트 적용)
    const payload = {
      messages: [
        {
          role: "system",
          content: systemContent
        },
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.25,
      topP: 0.7,
      topK: 0,
      repetitionPenalty: 1.1,
      maxCompletionTokens: intent === "greet" ? 150 : 500  // 인사는 더 짧게
    };

    // ✅ HCX-005 엔드포인트 요청
    const response = await fetch(
      "https://clovastudio.stream.ntruss.com/v3/chat-completions/HCX-005",
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

    // ✅ HTTP 에러 가드
    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      console.error("[CLOVA-REWRITE] HTTP Error:", response.status, errBody.substring(0, 200));
      return res.status(502).json({ 
        ok: false, 
        error: "Clova upstream error",
        status: response.status 
      });
    }

    // ✅ 응답 파싱 (v3 표준 경로 우선, 폴백 포함)
    const data = await response.json();
    let text =
      data?.result?.message?.content?.trim() ||
      data?.choices?.[0]?.message?.content?.trim() ||
      "응답이 없습니다.";

    // ✅ 후처리 필터: 마크다운 및 서식 문자 제거
    text = text
      .replace(/```[\s\S]*?```/g, '')    // 코드블록 제거
      .replace(/`([^`]+)`/g, '$1')       // 인라인 코드 제거
      .replace(/^#{1,6}\s*/gm, '')       // # 헤더 제거
      .replace(/\*\*/g, '')              // ** 굵게 제거
      .replace(/\*/g, '')                // * 기울임 제거
      .replace(/-{3,}/g, '')             // --- 구분선 제거
      .replace(/^[-*+]\s+/gm, '')        // 불릿 제거
      .replace(/^\d+\.\s+/gm, (match) => match.replace('.', ')'))  // 1. → 1) 변환
      .replace(/\s{2,}/g, ' ')           // 연속 공백 제거
      .trim();
    
    // ✅ 문장 말미 기준 줄바꿈 보정 (가독성)
    text = text.replace(/([.!?])\s+(?=[가-힣A-Z])/g, '$1\n\n').trim();

    console.log("[CLOVA-REWRITE] 응답 구조:", JSON.stringify(data, null, 2));
    console.log("[CLOVA-REWRITE] 후처리 완료:", text.substring(0, 100) + "...");

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
