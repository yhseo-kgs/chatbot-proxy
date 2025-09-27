// scripts/chatbot/chatbotInit.js
// 챗봇 초기화 및 이벤트 연결 담당

import { ChatbotCore } from './chatbotCore.js';
import { ChatbotUI } from './chatbotUI.js';

export class ChatbotManager {
  constructor() {
    this.core = new ChatbotCore();
    this.ui = new ChatbotUI();
    this.isInitialized = false;
    this.init();
  }

  async init() {
    try {
      // QnaStore 준비
      await QnaStore.ready();
      
      this.setupEventListeners();
      this.setupUIFeatures();
      this.ui.renderWelcomeCards();
      
      this.isInitialized = true;
      console.log('[ChatbotManager] 초기화 완료');
    } catch (error) {
      console.error('[ChatbotManager] 초기화 실패:', error);
      this.showInitError();
    }
  }

  setupEventListeners() {
    // 입력 버튼 이벤트
    if (this.ui.sendBtn) {
      this.ui.sendBtn.addEventListener('click', () => this.handleInput());
    }

    // 입력창 키보드 이벤트
    if (this.ui.inputBox) {
      this.ui.inputBox.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleInput();
        }
      });

      // 자동 높이 조절
      this.ui.inputBox.addEventListener('input', this.handleInputResize.bind(this));
      
      // 스크롤 처리
      this.ui.inputBox.addEventListener('wheel', this.handleInputScroll.bind(this));
      this.ui.inputBox.addEventListener('focus', this.handleInputFocus.bind(this));
      this.ui.inputBox.addEventListener('blur', this.handleInputBlur.bind(this));
    }

    // 칩 버튼 이벤트 (동적 생성되므로 이벤트 위임)
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('chip') && !e.target.classList.contains('chip-more')) {
        this.handleInput(e.target.textContent.trim());
      }
    });

    // 더보기 버튼 이벤트
    document.addEventListener('click', (e) => {
      if (e.target.id === 'chip-more') {
        this.toggleMoreChips(e.target);
      }
    });

    // 챗봇 패널 열기/닫기 이벤트
    this.setupPanelEvents();
  }

  setupPanelEvents() {
    const chatbotBtn = document.getElementById("chatbot-button");
    const chatbotPanel = document.getElementById("chatbot-panel");
    const chatbotClose = document.getElementById("chatbot-close");

    // 아이콘 클릭 → 패널 열기
    chatbotBtn?.addEventListener("click", () => {
      chatbotPanel.style.display = "flex";
      requestAnimationFrame(() => {
        chatbotPanel.classList.add("is-open");
        this.ui.scrollToBottom();
      });
    });

    // 닫기 버튼 클릭 → 패널 닫기
    chatbotClose?.addEventListener("click", () => {
      chatbotPanel.classList.remove("is-open");
      setTimeout(() => {
        if (!chatbotPanel.classList.contains("is-open")) {
          chatbotPanel.style.display = "none";
        }
      }, 250);
    });
  }

  setupUIFeatures() {
    // 입력창 placeholder 개선
    if (this.ui.inputBox) {
      const placeholders = [
        "메시지를 입력하세요…",
        "압력용기 검사에 대해 물어보세요",
        "궁금한 점을 입력해주세요"
      ];
      
      let currentIndex = 0;
      this.placeholderInterval = setInterval(() => {
        // 조건식 버그 수정: 우선순위 명확히
        if (!this.ui.inputBox.value && document.activeElement !== this.ui.inputBox) {
          this.ui.inputBox.placeholder = placeholders[currentIndex];
          currentIndex = (currentIndex + 1) % placeholders.length;
        }
      }, 3000);
    }
  }

  async handleInput(text = null) {
    if (!this.isInitialized) {
      console.warn('챗봇이 아직 초기화되지 않았습니다.');
      return;
    }

    const query = text || this.ui.inputBox?.value.trim();
    if (!query) return;

    // UI 상태 업데이트
    this.ui.setInputDisabled(true);
    
    // 사용자 메시지 표시
    const userMessage = this.ui.createMessage('user', query);
    this.ui.appendMessage(userMessage);
    
    // 입력창 초기화 (사용자 입력인 경우)
    if (!text) {
      this.ui.resetInput();
    }

    // 로딩 표시
    this.ui.showLoading();

    try {
      // 핵심 로직 처리
      const response = await this.core.processUserInput(query);
      
      // 응답 유효성 검사 (undefined 방지)
      if (!response) {
        throw new Error('응답이 생성되지 않았습니다.');
      }
      
      // UI 렌더링
      await this.ui.renderResponse(response);
      
      // 로그 기록
      this.logConversation(query, response);
      
    } catch (error) {
      console.error('입력 처리 오류:', error);
      this.ui.renderErrorResponse({
        type: 'error',
        content: '⚠️ 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      });
    } finally {
      this.ui.setInputDisabled(false);
      this.ui.inputBox?.focus();
    }
  }

  // 입력창 크기 조절
  handleInputResize(event) {
    const inputBox = event.target;
    inputBox.style.height = 'auto';
    
    const currentScrollHeight = inputBox.scrollHeight;
    
    if (currentScrollHeight <= this.ui.baseHeight) {
      inputBox.style.height = this.ui.baseHeight + 'px';
    } else {
      inputBox.style.height = currentScrollHeight + 'px';
    }
  }

  // 입력창 스크롤 처리
  handleInputScroll(event) {
    const inputBox = event.target;
    if (inputBox.scrollHeight > inputBox.clientHeight) {
      event.preventDefault();
      event.stopPropagation();
      inputBox.scrollTop += event.deltaY;
    }
  }

  // 입력창 포커스 처리
  handleInputFocus() {
    const chatbotBody = document.querySelector('.chatbot-body');
    if (chatbotBody) {
      chatbotBody.style.overflow = 'hidden';
    }
  }

  handleInputBlur() {
    const chatbotBody = document.querySelector('.chatbot-body');
    if (chatbotBody) {
      chatbotBody.style.overflow = 'auto';
    }
  }

  // 더보기 칩 토글
  toggleMoreChips(button) {
    const chips = button.parentElement;
    const isExpanded = button.getAttribute('aria-expanded') === 'true';
    
    if (isExpanded) {
      chips.classList.remove('expanded');
      button.textContent = '더보기 ▾';
      button.setAttribute('aria-expanded', 'false');
    } else {
      // 추가 칩들을 동적으로 생성
      this.loadMoreChips(chips);
      chips.classList.add('expanded');
      button.textContent = '접기 ▴';
      button.setAttribute('aria-expanded', 'true');
    }
  }

  // 추가 칩 로드
  async loadMoreChips(chipsContainer) {
    try {
      await QnaStore.ready();
      const index = QnaStore.index();
      const categories = Object.keys(index.categoryMap);
      
      const moreChips = [
        '재검사 주기',
        '수리검사 절차',
        '제조등록업체 확인',
        '수입 압력용기',
        '설계조건 변경',
        ...categories.slice(0, 3)
      ];
      
      // 기존 더보기 칩들 제거
      const existingMoreChips = chipsContainer.querySelectorAll('.chip-extra');
      existingMoreChips.forEach(chip => chip.remove());
      
      // 새 칩들 추가 (더보기 버튼 앞에)
      const moreButton = chipsContainer.querySelector('.chip-more');
      moreChips.forEach(chipText => {
        const chip = document.createElement('div');
        chip.className = 'chip chip-extra';
        chip.textContent = chipText;
        chipsContainer.insertBefore(chip, moreButton);
      });
    } catch (error) {
      console.error('추가 칩 로드 실패:', error);
    }
  }

  // 대화 로그 기록
  logConversation(query, response) {
    if (window.DEBUG_MODE) {
      console.log('[대화 로그]', {
        timestamp: new Date().toISOString(),
        query: query,
        response_type: response.type,
        response_length: response.content?.length || 0,
        score: response.score || null
      });
    }
  }

  // 초기화 오류 표시
  showInitError() {
    if (this.ui.stream) {
      this.ui.stream.innerHTML = `
        <div class="chatbot-message bot error-response">
          <div class="chatbot-content">
            <div class="chatbot-bubble bot">
              <div>⚠️ 챗봇 초기화에 실패했습니다.<br/>페이지를 새로고침 해주세요.</div>
            </div>
          </div>
        </div>
      `;
    }
  }

  // 공개 메서드들
  getStatus() {
    return {
      initialized: this.isInitialized,
      processing: this.core.getProcessingStatus(),
      messagesCount: this.ui.messages.length
    };
  }

  clearConversation() {
    if (this.ui.stream) {
      this.ui.stream.innerHTML = '';
      this.ui.messages = [];
      this.ui.renderWelcomeCards();
    }
  }

  setDebugMode(enabled) {
    window.DEBUG_MODE = enabled;
    console.log(`[ChatbotManager] 디버그 모드: ${enabled ? '활성화' : '비활성화'}`);
  }

  // 정리 함수 (SPA 전환 시 메모리 관리)
  cleanup() {
    if (this.placeholderInterval) {
      clearInterval(this.placeholderInterval);
      this.placeholderInterval = null;
    }
    console.log('[ChatbotManager] 정리 완료');
  }
}

// 전역 초기화
document.addEventListener('DOMContentLoaded', () => {
  // 기존 common_chatbot.js와의 충돌 방지
  if (!window.chatbotManager) {
    window.chatbotManager = new ChatbotManager();
  }
});

// 개발자 도구용 전역 함수들
window.chatbotDebug = {
  getStatus: () => window.chatbotManager?.getStatus(),
  clearChat: () => window.chatbotManager?.clearConversation(),
  enableDebug: () => window.chatbotManager?.setDebugMode(true),
  disableDebug: () => window.chatbotManager?.setDebugMode(false)
};
