// ====== common_loader.js ======
// 공통 컴포넌트 로더

// 사이드메뉴 로드
function loadSideMenu() {
    const isPagesFolder = window.location.pathname.includes('/pages/');
    const basePath = isPagesFolder ? '../' : '';
    
    fetch(basePath + 'components/common_sidebar.html')
        .then(response => response.text())
        .then(html => {
            // 사이드메뉴가 이미 있는지 확인
            const existingSideMenu = document.querySelector('.side-menu');
            if (!existingSideMenu) {
                document.body.insertAdjacentHTML('afterbegin', html);
            }
        })
        .catch(error => console.error('사이드메뉴 로드 실패:', error));
}

// 헤더 로드
function loadHeader() {
    const isPagesFolder = window.location.pathname.includes('/pages/');
    const basePath = isPagesFolder ? '../' : '';
    
    fetch(basePath + 'components/common_header.html')
        .then(response => response.text())
        .then(html => {
            const container = document.querySelector('.container');
            if (container && !container.querySelector('.header-bar')) {
                container.insertAdjacentHTML('afterbegin', html);
            }
        })
        .catch(error => console.error('헤더 로드 실패:', error));
}

// 공통 CSS 로드
function loadCommonCSS() {
    const isPagesFolder = window.location.pathname.includes('/pages/');
    const basePath = isPagesFolder ? '../' : '';
    
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = basePath + 'styles/common_layout.css';
    
    // 이미 로드되었는지 확인
    const existingCSS = document.querySelector(`link[href="${basePath}styles/common_layout.css"]`);
    if (!existingCSS) {
        document.head.appendChild(cssLink);
    }
}

// 공통 JavaScript 로드
function loadCommonJS() {
    const isPagesFolder = window.location.pathname.includes('/pages/');
    const basePath = isPagesFolder ? '../' : '';
    
    return new Promise((resolve, reject) => {
        const existingScript = document.querySelector(`script[src="${basePath}scripts/common_sidebar.js"]`);
        if (existingScript) {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = basePath + 'scripts/common_sidebar.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// 모든 공통 컴포넌트 로드
async function loadCommonComponents() {
    try {
        loadCommonCSS();
        loadSideMenu();
        loadHeader();
        await loadCommonJS();
        console.log('공통 컴포넌트 로드 완료');
    } catch (error) {
        console.error('공통 컴포넌트 로드 실패:', error);
    }
}

// DOM 로드 완료 후 실행
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadCommonComponents);
} else {
    loadCommonComponents();
}
