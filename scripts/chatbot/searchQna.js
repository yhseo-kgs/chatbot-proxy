// /scripts/chatbot/searchQna.js
// 사용자의 입력(query)을 받아서 QNA 후보들 중 Top-N을 점수화/정렬해 반환

export async function rankQna(query) {
  try {
    // QnaStore 준비 (qnaStore.js 전역 객체 사용)
    await QnaStore.ready();
    
    if (!query || typeof query !== 'string') {
      return { best: null, topk: [] };
    }
    
    const qnorm = query.trim().toLowerCase();
    const data = QnaStore.all();
    
    if (!qnorm) return { best: null, topk: [] };
    
    const queryWords = qnorm.split(' ').filter(w => w.length > 1);
    
    // 각 항목별 점수 계산
    const scores = data.map(item => {
      let score = 0;
      
      // 질문 매칭 (가중치 높음)
      if (item._q.includes(qnorm)) score += 0.8;
      queryWords.forEach(word => {
        if (item._q.includes(word)) score += 0.3;
      });
      
      // 답변 매칭 (가중치 중간)
      if (item._a.includes(qnorm)) score += 0.4;
      queryWords.forEach(word => {
        if (item._a.includes(word)) score += 0.2;
      });
      
      // 카테고리 매칭 (가중치 낮음)
      if (item.category && qnorm.includes(item.category.toLowerCase())) {
        score += 0.2;
      }
      
      return { id: item.id, score, item };
    });
    
    // 점수 > 0인 것만 필터링 후 정렬
    const validScores = scores.filter(s => s.score > 0);
    validScores.sort((a, b) => b.score - a.score);
    
    // Top-K 추출 (상위 5개)
    const topk = validScores.slice(0, 5);
    const best = topk[0] || null;
    
    return { best, topk };
    
  } catch (error) {
    console.error('QNA 검색 오류:', error);
    return { best: null, topk: [] };
  }
}

// 추가 유틸리티 함수들
export function formatSearchResult(result) {
  if (!result.best) {
    return "관련 정보를 찾을 수 없습니다.";
  }
  
  let response = result.best.item.answer;
  
  // 참조 정보가 있으면 추가 (텍스트로만)
  if (result.best.item.reference) {
    response += `\n\n📋 참조: ${result.best.item.reference}`;
  }
  
  // 액션은 버튼으로만 표시하므로 텍스트에 포함하지 않음 (중복 표기 방지)
  
  return response;
}

// 검색 결과 디버깅용
export function debugSearchResult(query, result) {
  console.log(`[검색] "${query}"`);
  console.log(`[결과] best: ${result.best ? result.best.score.toFixed(2) : 'null'}`);
  console.log(`[후보] ${result.topk.length}개`);
  result.topk.forEach((item, i) => {
    console.log(`  ${i+1}. [${item.score.toFixed(2)}] ${item.item.question}`);
  });
}
