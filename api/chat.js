// Vercel Serverless Function for CLOVA Studio API Proxy
import crypto from "crypto";

// 환경변수에서 키 관리 (절대 클라이언트에 노출 금지)
const ACCESS_KEY = process.env.NCP_ACCESS_KEY;
const SECRET_KEY = process.env.NCP_SECRET_KEY;
const CLOVA_API_KEY = process.env.CLOVA_API_KEY; // Bearer 키
const CLOVA_MODEL = "HCX-003"; // 사용할 모델 이름

// 시그니처 생성 (Ncloud API 공통 규격)
function makeSignature(method, url, timestamp, accessKey, secretKey) {
  const space = " ";
  const newLine = "\n";
  const message = [method, space, url, newLine, timestamp, newLine, accessKey].join("");

  const hmac = crypto.createHmac("sha256", secretKey);
  hmac.update(message);
  return hmac.digest("base64");
}

// CORS 헤더 설정
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export default async function handler(req, res) {
  // CORS preflight 요청 처리
  if (req.method === 'OPTIONS') {
    res.status(200).set(corsHeaders).end();
    return;
  }

  // POST 요청만 허용
  if (req.method !== 'POST') {
    res.status(405).set(corsHeaders).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // 환경변수 검증
    if (!ACCESS_KEY || !SECRET_KEY || !CLOVA_API_KEY) {
      console.error('Missing required environment variables');
      res.status(500).set(corsHeaders).json({ 
        error: 'Server configuration error' 
      });
      return;
    }

    const { message } = req.body;
    
    // 입력 검증
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).set(corsHeaders).json({ 
        error: 'Message is required and must be a non-empty string' 
      });
      return;
    }

    const timestamp = Date.now().toString();

    // 시그니처 생성
    const signature = makeSignature(
      "POST",
      `/v1/chat-completions/${CLOVA_MODEL}`,
      timestamp,
      ACCESS_KEY,
      SECRET_KEY
    );

    // CLOVA Studio API 호출
    const response = await fetch(
      `https://clovastudio.stream.ntruss.com/v1/chat-completions/${CLOVA_MODEL}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${CLOVA_API_KEY}`,
          "X-NCP-APIGW-TIMESTAMP": timestamp,
          "X-NCP-IAM-ACCESS-KEY": ACCESS_KEY,
          "X-NCP-APIGW-SIGNATURE-V2": signature,
        },
        body: JSON.stringify({
          messages: [
            { 
              role: "system", 
              content: "당신은 고압가스 특정설비 검사 및 안전관리에 대한 전문적인 정보를 제공하는 KGS AI 챗봇입니다. 정확하고 도움이 되는 정보를 제공해주세요." 
            },
            { role: "user", content: message.trim() }
          ],
          temperature: 0.5,
          topP: 0.8,
          maxTokens: 256,
          topK: 0,
          repeatPenalty: 5.0,
          includeAiFilters: true
        }),
      }
    );

    const data = await response.json();

    // 응답 상태 확인
    if (!response.ok) {
      console.error('CLOVA API Error:', data);
      res.status(response.status).set(corsHeaders).json({ 
        error: 'CLOVA API request failed',
        details: data 
      });
      return;
    }

    // 성공 응답
    res.status(200).set(corsHeaders).json(data);

  } catch (error) {
    console.error("Chat API Error:", error);
    res.status(500).set(corsHeaders).json({ 
      error: "Internal server error",
      message: "Failed to connect to CLOVA Studio API" 
    });
  }
}
