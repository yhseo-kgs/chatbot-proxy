// /api/semantic-search.js
import OpenAI from "openai";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { applyCors } from './_cors.js';
import { rateLimit } from './_rateLimit.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// -----------------------------
// 1. 유틸함수: 코사인 유사도 계산
// -----------------------------
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 0;
  }
  
  let dot = 0.0, normA = 0.0, normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// -----------------------------
// 2. JSON 로드 (메모리 캐싱)
// -----------------------------
let qnaData = [];
const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, "..", "public", "data", "chatbot_qna.json");

try {
  const raw = fs.readFileSync(dataPath, "utf-8");
  qnaData = JSON.parse(raw);
} catch (err) {
  console.error("[SEM] ❌ Failed to load QnA JSON:", err.message);
  console.error("[SEM] ❌ File path attempted:", dataPath);
  console.error("[SEM] ❌ Error details:", err);
}

// -----------------------------
// 3. 메인 핸들러
// -----------------------------
export default async function handler(req, res) {
  const ended = applyCors(req, res);
  if (ended) return;

  // Rate Limit 체크
  const limited = rateLimit(req, res);
  if (limited) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 데이터 로드 확인
  if (!qnaData || qnaData.length === 0) {
    return res.status(503).json({ 
      error: "QnA database not loaded",
      hint: "Check if public/data/chatbot_qna.json exists"
    });
  }

  const { 
    query, 
    history = [], 
    top_k = 3, 
    weights = { cos: 0.7, tag: 0.2, cat: 0.1 } 
  } = req.body;

  if (!query) {
    return res.status(400).json({ error: "Missing query parameter" });
  }

  try {
    const startTime = Date.now();

    // -----------------------------
    // 3-1. 문맥 병합 ("이거/그거" 등)
    // -----------------------------
    const lastContext = history?.slice(-3)
      .map(h => h.content || h.text || "")
      .join(" ") || "";
    
    const merged_query =
      /이거|그거|그건|위 내용|저거|그게|이게/.test(query) && lastContext
        ? `${lastContext} ${query}`
        : query;

    // -----------------------------
    // 3-2. OpenAI 임베딩 생성
    // -----------------------------
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: merged_query,
    });
    const queryVec = embeddingResponse.data[0].embedding;

    // -----------------------------
    // 3-3. 유사도 계산 + 가중치 적용
    // -----------------------------
    const results = qnaData.map((item) => {
      const qVec = item.q_vector;
      
      // 코사인 유사도
      const cos = cosineSimilarity(queryVec, qVec);

      // 태그 매칭 (keywords_qna + tags_qna 모두 확인)
      let tagMatch = 0;
      const keywords = item.keywords_qna || [];
      const tags = item.tags_qna 
        ? (Array.isArray(item.tags_qna) ? item.tags_qna : [item.tags_qna]) 
        : [];
      const allTags = [...keywords, ...tags].filter(t => t);
      
      if (allTags.length > 0) {
        tagMatch = allTags.some(tag => 
          merged_query.toLowerCase().includes(tag.toLowerCase())
        ) ? 1 : 0;
      }

      // 카테고리 매칭
      const catMatch = item.category && merged_query.includes(item.category) ? 1 : 0;

      // 최종 점수 계산
      const finalScore = 
        cos * weights.cos + 
        tagMatch * weights.tag + 
        catMatch * weights.cat;

      return {
        id: item.id,
        question: item.question_qna,
        answer: item.answer,
        category: item.category,
        tags: allTags,
        similarity: cos,
        tag_match: tagMatch,
        cat_match: catMatch,
        final_score: finalScore,
      };
    });

    // -----------------------------
    // 3-4. Top K 추출
    // -----------------------------
    const topN = results
      .sort((a, b) => b.final_score - a.final_score)
      .slice(0, top_k);
    
    const top1 = topN[0];

    // -----------------------------
    // 3-5. 클로바 전달용 payload 생성
    // -----------------------------
    const llm_payload = `다음 정보를 참고하여 사용자의 질문에 공손하고 명확하게 답변하세요.

카테고리: ${top1.category || "미분류"}
관련 질문: ${top1.question}
답변: ${top1.answer}

답변 규칙:
- '~합니다'체로 공손하게 작성
- 핵심만 간결하게 전달
- 불필요한 부연 설명 제외
`;

    // -----------------------------
    // 3-7. 응답 반환
    // -----------------------------
    return res.status(200).json({
      success: true,
      merged_query,
      top1: { 
        ...top1, 
        llm_payload 
      },
      topN,
      meta: {
        model: "text-embedding-3-large",
        dimension: queryVec.length,
        total_items: qnaData.length,
        elapsed_ms: Date.now() - startTime,
        weights,
      },
    });

  } catch (err) {
    console.error("[SEM] ❌ Error in semantic search:", err);
    return res.status(500).json({ 
      ok: false,
      error: "Semantic search failed", 
      details: "서버 처리 중 오류가 발생했습니다. (E500-SEM)"
    });
  }
}


