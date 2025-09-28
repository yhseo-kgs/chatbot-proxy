// ====== common_sidebar.js ======
// 사이드메뉴 관련 공통 기능

// 사이드메뉴 토글 기능
function toggleMenu() {
    setTimeout(() => {
        document.getElementById('menuPanel').classList.toggle('open');
    }, 180);
}

// 메뉴 아이콘 클릭 이벤트 (ripple 효과 포함)
function initMenuIcon() {
    const menuIcon = document.querySelector(".menu-icon");
    if (!menuIcon) return;
    
    menuIcon.addEventListener("click", function (e) {
        const button = e.currentTarget;

        // ripple 효과
        const circle = document.createElement("span");
        const diameter = Math.min(32, Math.max(button.clientWidth, button.clientHeight));
        const radius = diameter / 2;
        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${(button.clientWidth - diameter) / 2}px`;
        circle.style.top = `${(button.clientHeight - diameter) / 2}px`;
        circle.classList.add("ripple-effect");

        const ripple = button.getElementsByClassName("ripple-effect")[0];
        if (ripple) ripple.remove();
        button.appendChild(circle);

        // 메뉴 열기
        toggleMenu();
    });
}

// 메뉴 외부 클릭 시 닫기
function initMenuOutsideClick() {
    document.addEventListener("click", function(e) {
        const menu = document.getElementById("menuPanel");
        const isMenuOpen = menu.classList.contains("open");
        const isClickInsideMenu = menu.contains(e.target);
        const isMenuIcon = e.target.closest(".menu-icon");
        const isCloseButton = e.target.closest(".side-menu-close");
        const isSubMenuLink = e.target.closest(".side-menu a");

        if (isMenuOpen && !isClickInsideMenu && !isMenuIcon && !isCloseButton && !isSubMenuLink) {
            menu.classList.remove("open");
        }
    });
}

// 사이드메뉴 아코디언 기능
function initSideMenuAccordion() {
    document.querySelectorAll('.side-menu h4').forEach(h => {
        const ul = h.nextElementSibling;
        if (!ul || ul.tagName !== 'UL') return;
        h.style.cursor = "pointer";
        h.addEventListener('click', () => {
            ul.classList.toggle('open');
            const arrow = h.querySelector('span');
            if (ul.classList.contains('open')) {
                if (arrow) arrow.textContent = '﹀';
            } else {
                if (arrow) arrow.textContent = '︿';
            }
        });
    });
}

// 탭 기능 (필요한 페이지만 사용)
function switchTab(tabId) {
    // 모든 탭 비활성화
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // 모든 탭 컨텐츠 숨기기
    document.querySelectorAll('.card-list').forEach(content => {
        content.style.display = 'none';
    });
    
    // 선택된 탭 활성화
    const activeTab = document.querySelector(`[onclick="switchTab('${tabId}')"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    // 선택된 탭 컨텐츠 표시
    const activeContent = document.getElementById(tabId);
    if (activeContent) {
        activeContent.style.display = 'block';
    }
}

// 사이드메뉴 초기화 함수
function initSideMenu() {
    initMenuIcon();
    initMenuOutsideClick();
    initSideMenuAccordion();
}

// DOM 로드 완료 후 초기화 (약간의 지연을 두어 동적 로딩된 요소들이 준비될 때까지 기다림)
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initSideMenu, 100);
});

// 동적으로 로드된 컴포넌트를 위한 추가 초기화
setTimeout(initSideMenu, 500);
