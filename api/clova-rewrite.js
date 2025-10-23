// ✅ CLOVA Studio HCX-005 Chat Completions v3 + Vercel ESM 환경 완전 대응 버전
import { randomUUID } from "crypto";

// ✅ 통합 SYSTEM_PROMPT (톤앤매너 통제 + 스키마 강제)
const SYSTEM_PROMPT = `
너는 한국가스안전공사(KGS)의 특정설비 QnA 안내 챗봇이다.
지금부터 제공되는 문장은 '공식 답변 원문'이다.
너의 임무는 이 문장을 공손한 문체로 그대로 전달하는 것이다.
의미나 내용, 법령명, 숫자, 절차 등 사실을 절대 수정하거나 요약하지 않는다.
문체만 부드럽게 다듬고, 문장은 '~합니다' 어미로 끝나게 하라.
새로운 문장을 덧붙이거나 예시를 추가하지 말라.
1. 문단이 바뀌면 한 줄을 비워 구분한다.
2. **, -, #, 이모지 등 서식 문자는 절대 쓰지 않는다.

출력 형식: 반드시 다음 JSON 형식으로만 응답하라.
{"mode":"restricted","text":"최종 답변 텍스트","ctx_id":"제공된_CTX_ID"}
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
    // ✅ 요청 파싱 (에코 검증 지원)
    const body = req.body || (await req.json?.());
    const message = body?.message || body?.llm_payload || "기본 질문입니다.";
    const intent = body?.intent; // 의도 감지 (greet 등)
    const ctxId = body?.ctx_id || randomUUID(); // 에코 검증용 ID
    const mode = body?.mode || "default";

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

    // ✅ CLOVA Studio 요청 Payload (모드별 디코딩 설정)
    const isRestrictedMode = mode === "restricted";
    const payload = {
      messages: [
        {
          role: "system",
          content: systemContent
        },
        {
          role: "user",
          content: `${message}\n\nCTX_ID:${ctxId}`
        }
      ],
      temperature: isRestrictedMode ? 0.05 : 0,        // MID 구간: 살짝 자연스럽게
      topP: isRestrictedMode ? 0.10 : 0,               // MID 구간: 살짝 자연스럽게
      topK: 0,
      repetitionPenalty: 1.0, // 중복 방지만
      maxCompletionTokens: intent === "greet" ? 150 : 300  // 토큰 제한 강화
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

    // ✅ 응답 파싱 및 스키마 검증
    const data = await response.json();
    let rawText =
      data?.result?.message?.content?.trim() ||
      data?.choices?.[0]?.message?.content?.trim() ||
      "";

    console.log("[CLOVA-REWRITE] 모드:", mode, "디코딩 설정:", { 
      temperature: payload.temperature, 
      topP: payload.topP 
    });
    console.log("[CLOVA-REWRITE] 원본 응답:", rawText.substring(0, 200) + "...");

    // ✅ JSON 스키마 검증 및 에코 확인
    let parsedResponse = null;
    let isValidSchema = false;
    let isEchoValid = false;

    try {
      // JSON 파싱 시도
      parsedResponse = JSON.parse(rawText);
      isValidSchema = (
        parsedResponse &&
        typeof parsedResponse === 'object' &&
        parsedResponse.mode === "restricted" &&
        typeof parsedResponse.text === "string" &&
        typeof parsedResponse.ctx_id === "string"
      );
      
      // 에코 검증
      isEchoValid = parsedResponse.ctx_id === ctxId;
      
      console.log("[CLOVA-REWRITE] 스키마 검증:", { isValidSchema, isEchoValid, ctxId, receivedCtxId: parsedResponse?.ctx_id });
      
    } catch (e) {
      console.warn("[CLOVA-REWRITE] JSON 파싱 실패:", e.message);
    }

    // ✅ 검증 실패 시 폴백 처리
    if (!isValidSchema || !isEchoValid) {
      console.warn("[CLOVA-REWRITE] 검증 실패 → 원본 메시지 반환");
      return res.status(200).json({
        ok: false,
        ctx_ok: false,
        text: message, // 원본 메시지 반환
        meta: { reason: "validation_failed", schema_ok: isValidSchema, echo_ok: isEchoValid }
      });
    }

    // ✅ 검증 성공 시 정제된 텍스트 반환
    let text = parsedResponse.text;

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

    console.log("[CLOVA-REWRITE] 검증 성공, 후처리 완료:", text.substring(0, 100) + "...");

    // ✅ 결과 반환 (검증 정보 포함)
    res.status(200).json({
      ok: true,
      ctx_ok: true,
      text,
      meta: { 
        source: "clova-rewrite",
        schema_validated: true,
        echo_validated: true,
        ctx_id: ctxId
      }
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
