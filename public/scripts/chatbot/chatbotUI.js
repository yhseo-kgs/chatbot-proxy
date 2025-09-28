// scripts/chatbot/chatbotUI.js
// 챗봇 UI 렌더링 및 DOM 조작 담당

export class ChatbotUI {
  constructor() {
    this.stream = document.getElementById('chatbot-stream');
    this.inputBox = document.getElementById('chatbot-input-box');
    this.sendBtn = document.getElementById('chatbot-send');
    this.messages = [];
    this.baseHeight = this.inputBox?.scrollHeight || 40;
  }

  // 메시지 생성
  createMessage(role, text) {
    return {
      id: Date.now(),
      role: role,
      text: text,
      createdAt: Date.now()
    };
  }

  // 메시지 추가
  appendMessage(message) {
    if (!this.stream) return;

    this.messages.push(message);
    
    const wrapper = document.createElement('div');
    wrapper.classList.add('chatbot-message', message.role);
    wrapper.setAttribute('data-message-id', message.id);

    // 말풍선과 시간을 묶는 컨테이너
    const content = document.createElement('div');
    content.classList.add('chatbot-content');

    // 말풍선
    const bubble = document.createElement('div');
    bubble.classList.add('chatbot-bubble', this.getRoleClass(message.role));

    // 텍스트
    const text = document.createElement('div');
    text.textContent = message.text || '';
    bubble.appendChild(text);

    content.appendChild(bubble);

    // 시간 (말풍선 아래)
    const time = document.createElement('div');
    time.classList.add('chatbot-time');
    const date = new Date(message.createdAt || Date.now());
    time.textContent = date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    content.appendChild(time);

    // 아바타 (bot 전용) - 맨 앞에 삽입
    if (message.role === 'bot') {
      const avatar = document.createElement('img');
      avatar.src = '/images/icon_chatbot.png';
      avatar.alt = '챗봇';
      avatar.classList.add('chatbot-avatar');
      wrapper.appendChild(avatar);
    }
    
    wrapper.appendChild(content);
    this.stream.appendChild(wrapper);
    this.scrollToBottom();

    return wrapper;
  }

  // 응답 렌더링
  async renderResponse(response) {
    // 로딩 메시지 제거
    this.removeLoadingMessage();

    // 응답 타입별 처리
    switch (response.type) {
      case 'qna':
        this.renderQnaResponse(response);
        break;
      case 'ai':
        this.renderAIResponse(response);
        break;
      case 'fallback':
        this.renderFallbackResponse(response);
        break;
      case 'error':
        this.renderErrorResponse(response);
        break;
      default:
        this.renderErrorResponse({
          content: '⚠️ 알 수 없는 응답 형식입니다.'
        });
    }
  }

  renderQnaResponse(response) {
    const message = this.createMessage('bot', response.content);
    const wrapper = this.appendMessage(message);
    
    // 액션 버튼 추가
    if (response.data?.action) {
      this.addActionButtons(wrapper, response.data.action);
    }

    // QNA 소스 표시 (개발 모드)
    if (window.DEBUG_MODE) {
      this.addDebugInfo(wrapper, `QNA ID: ${response.data.id}, Score: ${response.score?.toFixed(2)}`);
    }
  }

  renderAIResponse(response) {
    const message = this.createMessage('bot', response.content);
    const wrapper = this.appendMessage(message);

    // AI 소스 표시 (개발 모드)
    if (window.DEBUG_MODE) {
      this.addDebugInfo(wrapper, 'Source: Clova AI');
    }
  }

  renderFallbackResponse(response) {
    const message = this.createMessage('bot', response.content);
    const wrapper = this.appendMessage(message);
    
    // 액션 버튼 추가
    if (response.data?.action) {
      this.addActionButtons(wrapper, response.data.action);
    }

    // 폴백 표시
    wrapper.classList.add('fallback-response');
  }

  renderErrorResponse(response) {
    const message = this.createMessage('bot', response.content);
    const wrapper = this.appendMessage(message);
    wrapper.classList.add('error-response');
  }

  // 액션 버튼 추가
  addActionButtons(wrapper, action) {
    const actionContainer = document.createElement('div');
    actionContainer.className = 'action-buttons';
    
    const actions = action.split('\n').filter(a => a.trim());
    actions.forEach(actionText => {
      const button = document.createElement('button');
      button.className = 'action-btn';
      button.textContent = actionText.trim();
      button.onclick = () => this.handleAction(actionText.trim());
      actionContainer.appendChild(button);
    });
    
    wrapper.appendChild(actionContainer);
  }

  // 액션 처리
  handleAction(actionText) {
    // ID 패턴 매칭 [id숫자]
    const idMatch = actionText.match(/\[id(\d+)\]/);
    if (idMatch) {
      const qnaId = parseInt(idMatch[1]);
      this.showRelatedQna(qnaId);
      return;
    }

    // URL 패턴 매칭
    if (actionText.includes('http')) {
      window.open(actionText, '_blank');
      return;
    }

    // 기본: 텍스트를 새 질문으로 처리
    if (window.chatbotManager) {
      window.chatbotManager.handleInput(actionText);
    }
  }

  // 관련 QNA 표시
  async showRelatedQna(qnaId) {
    try {
      await QnaStore.ready();
      const qna = QnaStore.findById(qnaId);
      if (qna) {
        const message = this.createMessage('bot', qna.answer);
        this.appendMessage(message);
      }
    } catch (error) {
      console.error('관련 QNA 로드 실패:', error);
    }
  }

  // 로딩 메시지 표시 (최적화)
  showLoading() {
    const loadingMsg = this.createMessage('bot', '💭 답변 준비 중...');
    const wrapper = this.appendMessage(loadingMsg);
    wrapper.classList.add('loading-message');
    // 스크롤 최적화: 로딩 메시지는 즉시 스크롤
    requestAnimationFrame(() => {
      const scroller = document.querySelector('.chatbot-body');
      if (scroller) scroller.scrollTop = scroller.scrollHeight;
    });
    return wrapper;
  }

  // 로딩 메시지 제거
  removeLoadingMessage() {
    const loadingElements = this.stream?.querySelectorAll('.loading-message');
    loadingElements?.forEach(el => el.remove());
  }

  // 마지막 메시지 업데이트
  updateLastMessage(content) {
    const lastMessage = this.stream?.querySelector('.chatbot-message:last-child .chatbot-bubble');
    if (lastMessage) {
      lastMessage.textContent = content;
    }
  }

  // 디버그 정보 추가
  addDebugInfo(wrapper, info) {
    const debugDiv = document.createElement('div');
    debugDiv.className = 'debug-info';
    debugDiv.style.cssText = 'font-size:11px; color:#999; margin-top:4px;';
    debugDiv.textContent = info;
    wrapper.appendChild(debugDiv);
  }

  // 허용된 role 클래스 반환
  getRoleClass(role) {
    return (role === 'user' || role === 'bot' || role === 'notice') ? role : 'bot';
  }

  // 스크롤 보정 (성능 최적화)
  scrollToBottom() {
    if (!this.stream) return;
    
    const scroller = document.querySelector('.chatbot-body');
    if (!scroller) return;
    
    // 성능 최적화: 이미 스크롤 중이면 스킵
    if (this.isScrolling) return;
    this.isScrolling = true;
    
    const nearBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 50;
    if (!nearBottom) {
      this.isScrolling = false;
      return;
    }
    
    // 부드러운 스크롤 대신 즉시 스크롤 (성능 향상)
    requestAnimationFrame(() => { 
      scroller.scrollTop = scroller.scrollHeight;
      this.isScrolling = false;
    });
  }

  // 입력창 초기화
  resetInput() {
    if (this.inputBox) {
      this.inputBox.value = '';
      this.inputBox.style.height = this.baseHeight + 'px';
    }
    
    if (this.sendBtn) {
      this.sendBtn.disabled = false;
    }
  }

  // 입력창 비활성화/활성화
  setInputDisabled(disabled) {
    if (this.inputBox) this.inputBox.disabled = disabled;
    if (this.sendBtn) this.sendBtn.disabled = disabled;
  }

  // 웰컴 카드 렌더링
  renderWelcomeCards() {
    if (!this.stream) return;
    
    // 기존 웰컴카드 제거 (중복 방지)
    this.stream.innerHTML = '';
    this.messages = [];
    console.log('[ChatbotUI] 기존 웰컴카드 제거 후 V2 웰컴카드 렌더링');
    
    const welcomeMessages = [
      "안녕하세요 🙂 저는 KGS AI 챗봇입니다.\n특정설비 검사·안전 정보를 안내해드려요.",
      "현재는 시범사업 단계로,\n압력용기와 관련된 내용만 안내해드립니다.",
      "본 대화 내용은 서비스 품질 향상과 원활한\n지원을 위해 기록·저장됨을 알려드립니다.",
      "아래 버튼을 눌러보시거나\n검색창에 궁금한 걸 입력해 보세요 🙂"
    ];
    
    welcomeMessages.forEach(text => {
      const msg = this.createMessage("bot", text);
      this.appendMessage(msg);
    });
    
    // 칩 버튼과 안내문 추가
    this.stream.innerHTML += `
      <div class="chips">
        <div class="chip">압력용기 법정 검사</div>
        <div class="chip">검사 신청 방법</div>
        <div class="chip">검사 수수료</div>
        <div class="chip">안전관리 요령</div>
        <div class="chip">관할 지사 찾기</div>
        <button class="chip chip-more" id="chip-more" aria-expanded="false">더보기 ▾</button>
      </div>
      <p style="font-size:13px; color:#666; margin-top:16px;">
        ※ 본 챗봇은 참고용 안내 서비스이며, 법적 효력은 없습니다.<br/>
        정확한 확인은 관할 지사에 문의하시기 바랍니다.
      </p>
    `;
  }
}
