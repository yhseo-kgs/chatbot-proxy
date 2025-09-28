function toggleMenu() {
  setTimeout(() => {
    document.getElementById('menuPanel').classList.toggle('open');
  }, 180);
}

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

  // 메뉴 열기 (딜레이)
  setTimeout(() => {
    document.getElementById('menuPanel').classList.toggle('open');
  }, 180);
});

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
