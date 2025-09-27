document.addEventListener("DOMContentLoaded", () => {
  function formatCodeWithHyphen(code) {
    return code.replace(/^([A-Z]+)(\d{2})(\d{2})(\d{4})$/, "$1-$2-$3$4");
  }

  const params = new URLSearchParams(window.location.search);
  const inputCode = (params.get("code") || "").toUpperCase().replace(/-/g, "");
  
  fetch("../qr_data.json")
    .then(res => res.json())
    .then(data => {
      const result = data.find(item =>
        (item.code || "").toUpperCase().replace(/-/g, "") === inputCode ||
        (item.mgmt_no || "").toUpperCase().replace(/-/g, "") === inputCode
      );

      if (result) {
        const oldMessage = document.getElementById("not-found-message");
        if (oldMessage) oldMessage.remove();
        
        document.querySelector(".qr-number").textContent = formatCodeWithHyphen(result.code || "-");
        document.querySelector(".profile-device-type").textContent = result.device_type || "-";
        document.querySelector(".profile-status-active").innerHTML =
          '<span style="background: white; color: #2a9d74; font-size: 11px; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; line-height: 1;">✔</span> ' + (result.status || "-");

        document.querySelector(".info_data_capacity").textContent = result.capacity || "-";
        document.querySelector(".info_data_inspection_date").textContent = result.inspection_date || "-";
        document.querySelector(".info_data_next_inspection_date").textContent = result.next_inspection_date || "-";
        document.querySelector(".info_data_address").textContent = result.install_address || "-";
        document.querySelector(".info_data_inspection_org").textContent = result.inspection_org || "-";
        document.querySelector(".info_data_mgmt_no").textContent = result.mgmt_no || "-";
        document.querySelector(".info_data_install_year").textContent = result.first_inspection_date ? result.first_inspection_date.split("-")[0] + "년" : "-";
        
        const mgmtPrefix = (result.mgmt_no || "").substring(0, 3).toUpperCase();
        const imageFile = `../images/qrinfo_vessel_profile_${mgmtPrefix}.png`;
        document.querySelector(".profile-avatar img").src = imageFile;
        document.querySelector(".info_data_install_company").textContent = result.install_company || "-";
        document.querySelector(".info_data_serial_no").textContent = result.serial_no || "-";
        document.querySelector(".info_data_manufacturer").textContent = result.manufacturer || "-";
      } else {
        document.getElementById("profile-card").style.display = "none";
        document.getElementById("vessel-info").style.display = "none";
        
        const footer = document.querySelector(".footer-nav");
        if (footer) footer.style.display = "none";

        const container = document.querySelector(".container");
        const notFound = document.createElement("div");
        notFound.id = "not-found-message";
        notFound.style = "min-height:160px;padding:24px 16px;font-size:16px;color:#444;display:flex;align-items:center;justify-content:center;gap:6px;line-height:1.5;";
        notFound.innerHTML = `
        <svg xmlns='http://www.w3.org/2000/svg' height='20' viewBox='0 0 24 24' width='20' fill='#d9534f' style='flex-shrink:0; vertical-align: middle;'>
            <path d='M1 21h22L12 2 1 21z'/><path fill='#fff' d='M13 16h-2v2h2v-2zm0-6h-2v4h2V10z'/>
        </svg>
        <span>등록되지 않은 특정설비입니다. QR 번호 또는 관리번호를 다시 확인해주세요.</span>`;
        container.appendChild(notFound);
      }
    });
});

// 메뉴 토글 기능
document.addEventListener("DOMContentLoaded", function () {
  const menuIcon = document.querySelector(".menu-icon");
  const sideMenu = document.getElementById("menuPanel");

  if (menuIcon && sideMenu) {
    menuIcon.addEventListener("click", function () {
      sideMenu.classList.toggle("open");
    });
  }
});

function toggleMenu() {
  const sideMenu = document.getElementById("menuPanel");
  if (sideMenu) {
    sideMenu.classList.toggle("open");
  }
}

// 메뉴 외부 클릭 시 닫기
document.addEventListener("click", function (event) {
  const sideMenu = document.getElementById("menuPanel");
  const menuIcon = document.querySelector(".menu-icon");

  // 메뉴가 열려있고, 클릭된 곳이 메뉴영역 바깥이고, 햄버거 아이콘도 아닌 경우
  if (
    sideMenu &&
    sideMenu.classList.contains("open") &&
    !sideMenu.contains(event.target) &&
    !menuIcon.contains(event.target)
  ) {
    sideMenu.classList.remove("open");
  }
});

// 재검사 대상 뱃지 추가
(function () {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attachReinspectionBadge);
  } else {
    attachReinspectionBadge();
  }

  function attachReinspectionBadge() {
    try {
      const nextDate = document.querySelector(".info_data_next_inspection_date")?.textContent?.trim() || "";
      const nextYear = nextDate.split("-")[0];
      const thisYear = new Date().getFullYear().toString();

      if (nextYear === thisYear) {
        const labelEl = document.querySelector(".info_label_next_inspection_date");
        if (labelEl) {
          const badge = document.createElement("span");
          badge.textContent = "재검사대상";
          badge.className = "badge badge-red";
          badge.style = `
            margin-left: 8px;
            background: rgba(217, 83, 79, 0.12);
            color: #d9534f;
            font-size: 12px;
            font-weight: bold;
            padding: 2px 6px;
            border-radius: 6px;
          `;
          labelEl.appendChild(badge);
        }
      }
    } catch (e) {
      console.error("재검사대상 뱃지 처리 중 오류:", e);
    }
  }
})();

// 제작년도 뱃지 추가
(function () {
  function attachInstallYearBadge() {
    try {
      const yearEl = document.querySelector(".info_data_install_year");

      if (!yearEl) return;

      let yearText = yearEl.textContent.trim();
      const match = yearText.match(/\d{4}/); // Extract 4-digit year
      if (!match) return;

      const installYear = parseInt(match[0]);
      const currentYear = new Date().getFullYear();
      const elapsed = currentYear - installYear;

      if (elapsed < 0 || installYear < 1900) return;

      const badge = document.createElement("span");
      badge.textContent = `${elapsed}년차`;
      badge.className = "badge badge-blue";
      badge.style = `
        margin-left: 8px;
        background: rgba(17, 77, 109, 0.12);
        color: #114d6d;
        font-size: 12px;
        font-weight: bold;
        padding: 2px 6px;
        border-radius: 6px;
      `;

      yearEl.appendChild(badge);
    } catch (e) {
      console.error("제작년도 뱃지 처리 오류:", e);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(attachInstallYearBadge, 300);
  });
})();

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

// 페이지 표시 시 메뉴 닫기
window.addEventListener('pageshow', function () {
  const sideMenu = document.getElementById('menuPanel');
  if (sideMenu) {
    sideMenu.classList.remove('open');
  }
});
