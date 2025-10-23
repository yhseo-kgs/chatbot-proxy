// /api/semantic-search.js
import OpenAI from "openai";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// -----------------------------
// 1. 유틸함수: 코사인 유사도 계산
// -----------------------------
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    console.error("[SEM] ⚠️ Vector dimension mismatch");
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
  console.log(`[SEM] 🔍 Looking for data at: ${dataPath}`);
  console.log(`[SEM] 🔍 Current working directory: ${process.cwd()}`);
  console.log(`[SEM] 🔍 __dirname: ${__dirname}`);
  
  const raw = fs.readFileSync(dataPath, "utf-8");
  qnaData = JSON.parse(raw);
  console.log(`[SEM] ✅ QnA data loaded: ${qnaData.length} items`);
} catch (err) {
  console.error("[SEM] ❌ Failed to load QnA JSON:", err.message);
  console.error("[SEM] ❌ File path attempted:", dataPath);
  console.error("[SEM] ❌ Error details:", err);
}

// -----------------------------
// 3. 메인 핸들러
// -----------------------------
export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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

    console.log(`[SEM] 🔍 query="${query}"`);
    if (merged_query !== query) {
      console.log(`[SEM] 🔄 merged="${merged_query}"`);
    }

    // -----------------------------
    // 3-2. OpenAI 임베딩 생성
    // -----------------------------
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: merged_query,
    });
    const queryVec = embeddingResponse.data[0].embedding;

    // 벡터 차원 검증
    if (queryVec.length !== 3072) {
      console.warn(`[SEM] ⚠️ Unexpected vector dimension: ${queryVec.length}`);
    }

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
        id: item.id_qna,
        question: item.question_qna,
        answer: item.answer_qna,
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

    // 유사도가 너무 낮으면 경고
    if (top1.similarity < 0.3) {
      console.warn(`[SEM] ⚠️ Low similarity: ${top1.similarity.toFixed(3)}`);
    }

    // -----------------------------
    // 3-5. top1 필드 정규화 (먼저 수행)
    // -----------------------------
    const t1 = top1; // 이미 계산된 top1 사용
    const normalizedTop1 = {
      id: t1.id ?? t1._id ?? t1.qid ?? null,
      question: t1.question ?? t1.Q ?? t1.text ?? "",
      answer: t1.answer ?? t1.A ?? t1.text ?? "",
      score: t1.score ?? t1.similarity ?? t1.similarity,
      similarity: t1.similarity ?? t1.similarity,
      final_score: t1.final_score ?? t1.similarity,
      category: t1.category ?? t1.cat ?? ""
    };

    // ✅ 디버깅 로그
    console.log("[SEM] top1 필드 정규화 완료:", {
      id: normalizedTop1.id,
      hasAnswer: !!normalizedTop1.answer,
      answerLength: normalizedTop1.answer?.length || 0,
      originalKeys: Object.keys(t1 || {})
    });

    // -----------------------------
    // 3-6. 클로바 전달용 payload 생성 (정규화된 top1 사용)
    // -----------------------------
    const llm_payload = `QNA_ID: ${normalizedTop1.id}
Q: ${normalizedTop1.question}
A(원문): ${normalizedTop1.answer}
${normalizedTop1.category ? `카테고리: ${normalizedTop1.category}` : ""}

내용을 수정하거나 요약하지 말고, 문체만 공손하게 '~합니다' 형태로 정리하세요.
- 제공된 '답변'의 핵심 내용은 생략하거나 요약하지 않는다.
- 법령명, 숫자, 절차 등 사실을 절대 수정하지 않는다.`;

    // llm_payload를 정규화된 객체에 추가
    normalizedTop1.llm_payload = llm_payload;

    // -----------------------------
    // 3-7. 콘솔 로그 (튜닝용)
    // -----------------------------
    const elapsed = Date.now() - startTime;
    console.log(`[SEM] ⏱️  Processed in ${elapsed}ms`);
    
    // 상세 디버깅 로그 추가
    console.log(`[SEM] 🔍 Query vector length: ${queryVec.length}`);
    console.log(`[SEM] 🔍 Total items processed: ${results.length}`);
    
    topN.forEach((r, i) => {
      console.log(
        `[SEM] top${i + 1}: id=${r.id} ` +
        `cos=${r.similarity.toFixed(3)} ` +
        `tag=${r.tag_match} cat=${r.cat_match} ` +
        `final=${r.final_score.toFixed(3)} ` +
        `question="${r.question.substring(0, 30)}..."`
      );
    });

    return res.status(200).json({
      success: true,
      merged_query,
      top1: normalizedTop1,
      topN,
      meta: {
        model: "text-embedding-3-large",
        dimension: queryVec.length,
        total_items: qnaData.length,
        elapsed_ms: elapsed,
        weights,
      },
    });

  } catch (err) {
    console.error("[SEM] ❌ Error in semantic search:", err);
    return res.status(500).json({ 
      error: "Semantic search failed", 
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}


