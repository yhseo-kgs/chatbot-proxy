// scripts/chatbot/chatbotCore.js
// 챗봇의 핵심 비즈니스 로직 담당

import { rankQna, formatSearchResult } from './searchQna.js';

export class ChatbotCore {
  constructor() {
    this.isProcessing = false;
    this.SCORE_THRESHOLD = 0.5; // QNA 직접 답변 기준 점수
  }

  async processUserInput(query) {
    if (this.isProcessing) {
      return { type: 'error', content: '⏳ 처리 중입니다. 잠시만 기다려주세요.' };
    }
    this.isProcessing = true;

    try {
      // 1단계: 로컬 QNA 검색
      const searchResult = await rankQna(query);
      
      if (searchResult.best && searchResult.best.score > this.SCORE_THRESHOLD) {
        // 높은 점수 → QNA 바로 답변
        return {
          type: 'qna',
          content: formatSearchResult(searchResult),
          data: searchResult.best.item,
          score: searchResult.best.score
        };
      } else {
        // 낮은 점수 → 클로바 AI 호출
        return await this.callClovaAI(query, searchResult);
      }
    } catch (error) {
      console.error('처리 오류:', error);
      return this.handleError(error);
    } finally {
      this.isProcessing = false;
    }
  }

  async callClovaAI(query, fallbackResult) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // API 상태코드 의존성 개선 - 더 넓은 수용성
      if (data.status?.code === '20000' || (data.result?.message?.content && !data.error)) {
        return {
          type: 'ai',
          content: data.result?.message?.content || '응답을 생성할 수 없습니다.',
          query: query
        };
      } else {
        throw new Error(data.status?.message || data.error?.message || 'API 응답 오류');
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.warn('클로바 AI 호출 실패:', error.message);
      
      // 에러 시 QNA 폴백
      if (fallbackResult.best) {
        return {
          type: 'fallback',
          content: `⚠️ 일시적 오류로 인해 관련 정보를 제공합니다.\n\n${formatSearchResult(fallbackResult)}`,
          data: fallbackResult.best.item,
          originalError: error.message
        };
      }
      
      // 폴백도 없으면 에러 반환
      throw error;
    }
  }

  handleError(error) {
    return {
      type: 'error',
      content: '⚠️ 서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
      error: error.message
    };
  }

  // 설정 변경
  setScoreThreshold(threshold) {
    this.SCORE_THRESHOLD = Math.max(0, Math.min(1, threshold));
  }

  // 처리 상태 확인
  getProcessingStatus() {
    return this.isProcessing;
  }
}
