// scripts/chatbot/qnaStore.js
// QNA JSON 데이터를 안전하게 로드하고 관리하는 데이터 스토어 (ES6 모듈 버전)

const QNA_JSON_URL = '/chatbot_qna.json'; // 현재 프로젝트 구조에 맞게 수정

let _data = null;   // 정규화된 QNA 배열
let _index = null;  // { keywordMap, tagMap, categoryMap }
let _ready = null;  // 1회 로드 프라미스

  // NaN / Infinity 같은 비표준 토큰을 null로 치환 후 파싱
  function safeParseJson(text) {
    const sanitized = text.replace(/(?<=[:\s\[])(NaN|Infinity|-Infinity)(?=[,\]\s}])/g, 'null');
    return JSON.parse(sanitized);
  }

  const asArray = v => Array.isArray(v) ? v.filter(Boolean) : (v ? [String(v)] : []);
  const asStrOrNull = v => (v === undefined || v === null) ? null : String(v);
  const norm = s => (s ? s.normalize('NFC').replace(/\s+/g,' ').trim().toLowerCase() : '');

  // 현재 JSON 구조에 맞게 정규화
  function normalizeRow(r) {
    // null 체크 및 기본값 처리
    if (!r || r.id_qna == null) return null;

    return {
      id: Number(r.id_qna),
      category: asStrOrNull(r.category_qna),
      keywords: [], // 현재 JSON에 keywords 필드가 없음 (추후 확장 가능)
      tags: [], // 현재 JSON에 tags 필드가 없음 (추후 확장 가능)
      question: asStrOrNull(r.question_qna),
      answer: asStrOrNull(r.answer_qna),
      reference: asStrOrNull(r.reference_qna),
      action: asStrOrNull(r.action_qna),
      _q: norm(r.question_qna), // 검색용 정규화된 질문
      _a: norm(r.answer_qna),   // 검색용 정규화된 답변
    };
  }

  function buildIndex(rows) {
    const kMap = new Map(), tMap = new Map(), cMap = new Map();
    const push = (m, k, id) => { 
      if(!k) return; 
      if(!m.has(k)) m.set(k, new Set()); 
      m.get(k).add(id); 
    };
    
    for (const r of rows) {
      // keywords와 tags는 현재 없으므로 건너뜀 (추후 확장 시 활성화)
      // r.keywords.forEach(k => push(kMap, k, r.id));
      // r.tags.forEach(t => push(tMap, t, r.id));
      
      // 카테고리 인덱싱
      if (r.category) {
        push(cMap, norm(r.category), r.id);
      }
    }
    
    const toObj = m => { 
      const o = {}; 
      for (const [k, v] of m) o[k] = [...v]; 
      return o; 
    };
    
    return { 
      keywordMap: toObj(kMap), 
      tagMap: toObj(tMap), 
      categoryMap: toObj(cMap) 
    };
  }

  async function loadOnce() {
    if (_ready) return _ready;
    
    _ready = (async () => {
      try {
        console.log('[QnaStore] 로딩 시작:', QNA_JSON_URL);
        
        const res = await fetch(QNA_JSON_URL, { 
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!res.ok) {
          throw new Error(`QNA load failed: ${res.status} ${res.statusText}`);
        }
        
        const text = await res.text();
        const raw = safeParseJson(text);
        
        if (!Array.isArray(raw)) {
          throw new Error('QNA JSON root must be an array');
        }
        
        // 유효한 데이터만 필터링하고 정규화
        const rows = raw
          .map(normalizeRow)
          .filter(r => r !== null && r.question && r.answer);
        
        if (rows.length === 0) {
          throw new Error('No valid QNA data found');
        }
        
        _data = rows;
        _index = buildIndex(rows);
        
        console.log(`[QnaStore] 로딩 완료: ${rows.length}개 항목`);
        return true;
        
      } catch (error) {
        console.error('[QnaStore] 로딩 실패:', error);
        throw error;
      }
    })();
    
    return _ready;
  }

// 공개 API
export const QnaStore = {
  // 준비 상태 확인 및 대기
  async ready() { 
    await loadOnce(); 
    return true; 
  },
  
  // 전체 데이터 반환
  all() { 
    if (!_data) throw new Error('QnaStore not ready'); 
    return _data; 
  },
  
  // ID로 항목 찾기
  findById(id) { 
    if (!_data) throw new Error('QnaStore not ready'); 
    const numId = Number(id); 
    return _data.find(r => r.id === numId) || null; 
  },
  
  // 인덱스 반환
  index() { 
    if (!_index) throw new Error('QnaStore not ready'); 
    return _index; 
  },
  
  // 카테고리별 검색
  getByCategory(category) {
    if (!_data) throw new Error('QnaStore not ready');
    const normalizedCategory = norm(category);
    return _data.filter(r => norm(r.category) === normalizedCategory);
  },
  
  // 간단한 텍스트 검색
  search(query, limit = 10) {
    if (!_data) throw new Error('QnaStore not ready');
    const normalizedQuery = norm(query);
    
    if (!normalizedQuery) return [];
    
    return _data
      .filter(r => 
        r._q.includes(normalizedQuery) || 
        r._a.includes(normalizedQuery) ||
        (r.category && norm(r.category).includes(normalizedQuery))
      )
      .slice(0, limit);
  },
  
  // 통계 정보
  getStats() {
    if (!_data) throw new Error('QnaStore not ready');
    
    const categories = new Set();
    let questionsWithAnswers = 0;
    let questionsWithActions = 0;
    let questionsWithReferences = 0;
    
    _data.forEach(item => {
      if (item.category) categories.add(item.category);
      if (item.question && item.answer) questionsWithAnswers++;
      if (item.action) questionsWithActions++;
      if (item.reference) questionsWithReferences++;
    });
    
    return {
      total: _data.length,
      categories: categories.size,
      questionsWithAnswers,
      questionsWithActions,
      questionsWithReferences,
      categoryList: [...categories].sort()
    };
  }
};

// 기본 내보내기
export default QnaStore;

// 전역 등록 (기존 코드와의 호환성을 위해 유지)
window.QnaStore = QnaStore;

// 콘솔 확인용 (개발 모드에서만)
QnaStore.ready().then(() => {
  const stats = QnaStore.getStats();
  console.log('[QnaStore] 초기화 완료:', stats);
  console.log('[QnaStore] 인덱스 키:', Object.keys(QnaStore.index()));
  
  // 개발자 도구용 전역 함수
  window.qnaDebug = {
    store: QnaStore,
    stats: () => QnaStore.getStats(),
    search: (query) => QnaStore.search(query),
    findById: (id) => QnaStore.findById(id),
    categories: () => QnaStore.getStats().categoryList
  };
  
}).catch(error => {
  console.error('[QnaStore] 초기화 실패:', error);
});
