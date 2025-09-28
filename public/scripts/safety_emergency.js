// 메뉴 토글 기능
function toggleMenu() {
  setTimeout(() => {
    document.getElementById('menuPanel').classList.toggle('open');
  }, 180);
}

// 메뉴 아이콘 클릭 이벤트 (ripple 효과 포함)
document.querySelector(".menu-icon").addEventListener("click", function (e) {
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

// 아코디언 기능 (간단한 버전 제거)

// 탭 기능
document.querySelectorAll('.tab-item').forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.target;

    // 모든 카드 초기화
    document.querySelectorAll('.gas-card').forEach(card => {
      card.classList.remove('active');
      card.style.display = 'none';
    });

    // 탭 상태 초기화 및 적용
    document.querySelectorAll('.tab-item').forEach(t => {
      t.classList.remove('active');
    });
    tab.classList.add('active');

    // 선택된 카드만 표시
    const activeCard = document.querySelector(`.gas-card[data-gas="${target}"]`);
    if (activeCard) {
      activeCard.classList.add('active');
      activeCard.style.display = 'block';
    }
  });
});

// details 요소 애니메이션
document.querySelectorAll("details").forEach(detail => {
  detail.addEventListener("toggle", () => {
    const content = detail.querySelector("ul");
    if (!content) return;
    if (detail.open) {
      content.style.animation = "accordion-slide-down 0.4s ease-out";
    } else {
      content.style.animation = "none";
    }
  });
});

// 아코디언 패널 애니메이션
document.querySelectorAll(".accordion-header").forEach((header) => {
  header.addEventListener("click", () => {
    const accordion = header.parentElement;
    const panel = accordion.querySelector('.accordion-panel');
    const arrow = header.querySelector('.arrow');

    const isOpen = accordion.classList.contains("open");

    if (isOpen) {
      panel.style.maxHeight = null;
      arrow.textContent = "▼";
    } else {
      panel.style.maxHeight = panel.scrollHeight + "px";
      arrow.textContent = "▲";
    }

    accordion.classList.toggle("open");
  });
});

// Swiper 초기화
const swiper = new Swiper('.gas-swiper', {
  autoHeight: true,
  spaceBetween: 12,
  pagination: {
    el: '.swiper-pagination',
    clickable: true,
  },
  on: {
    slideChange: function () {
      const tabs = document.querySelectorAll('.tab-item');
      tabs.forEach(tab => tab.classList.remove('active'));
      const activeTab = tabs[this.activeIndex];
      activeTab?.classList.add('active');
      activeTab?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }
});

// 탭 클릭 시 Swiper 슬라이드 이동
document.querySelectorAll('.tab-item').forEach((tab, index) => {
  tab.addEventListener('click', () => {
    swiper.slideTo(index);
  });
});

// 사이드 메뉴 아코디언 기능
document.querySelectorAll('.side-menu h4').forEach(h => {
  const ul = h.nextElementSibling;
  if (!ul || ul.tagName !== 'UL') return;
  h.style.cursor = "pointer";
  h.addEventListener('click', () => {
    ul.classList.toggle('open');
    const arrow = h.querySelector('span');
    if (ul.classList.contains('open')) {
      ul.style.maxHeight = ul.scrollHeight + 'px';
      if (arrow) arrow.textContent = '﹀';
    } else {
      ul.style.maxHeight = 0;
      if (arrow) arrow.textContent = '︿';
    }
  });
});

// 메뉴 외부 클릭 시 닫기
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
