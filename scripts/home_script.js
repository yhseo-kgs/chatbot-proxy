// ====== home_script.js ======
// 홈 페이지 전용 기능 (검색 기능)

document.addEventListener("DOMContentLoaded", function() {
    // 검색 기능 초기화
    initializeSearch();
});

// 검색 관련 기능
function initializeSearch() {
    const searchInput = document.getElementById("searchInput");
    const recentContainer = document.getElementById("recent-searches-container");
    const recentList = document.getElementById("recent-searches-list");
    const clearButton = document.getElementById("clearButton");

    if (!searchInput || !recentContainer || !recentList) return;

    // 최근 검색어 클릭 이벤트
    recentList.addEventListener("click", function(e) {
        const target = e.target;
        if (target.tagName === "SPAN" && target.parentElement && target.parentElement.parentElement === recentList) {
            if (target.textContent === "X") {
                const index = Array.from(recentList.children).indexOf(target.parentElement);
                deleteRecentSearch(index);
            } else {
                searchFromRecent(target.textContent);
            }
        }
    });

    // 검색 입력 필드 이벤트
    searchInput.addEventListener("focus", showRecentSearches);
    searchInput.addEventListener("keydown", function(e) {
        if (e.key === "Enter" || e.keyCode === 13) {
            e.preventDefault();
            search();
        }
    });

    // 입력 필드 변경 시 클리어 버튼 표시/숨김
    searchInput.addEventListener("input", function () {
        clearButton.style.display = this.value ? "block" : "none";
    });

    // 클리어 버튼 클릭 이벤트
    clearButton.addEventListener("click", function () {
        searchInput.value = "";
        clearButton.style.display = "none";
        searchInput.focus();
    });

    // 외부 클릭 시 최근 검색어 숨김
    document.addEventListener("click", (e) => {
        if (!recentContainer.contains(e.target) && e.target !== searchInput) {
            hideRecentSearches();
        }
    });
}

// 최근 검색어 표시
function showRecentSearches() {
    const items = JSON.parse(localStorage.getItem("recentSearches") || "[]");
    const recentList = document.getElementById("recent-searches-list");
    const recentContainer = document.getElementById("recent-searches-container");
    
    recentList.innerHTML = "";

    if (items.length === 0) {
        recentList.innerHTML = '<li style="padding: 8px 12px; color:#999;">최근 검색어 없음</li>';
    } else {
        items.forEach((item) => {
            const li = document.createElement("li");
            li.style.display = "flex";
            li.style.justifyContent = "space-between";
            li.style.alignItems = "center";
            li.style.padding = "8px 12px";
            li.style.cursor = "pointer";

            const textSpan = document.createElement("span");
            textSpan.textContent = item;
            textSpan.style.flex = "1";

            const deleteSpan = document.createElement("span");
            deleteSpan.textContent = "X";
            deleteSpan.style.color = "#999";
            deleteSpan.style.fontSize = "12px";
            deleteSpan.style.marginLeft = "12px";

            li.appendChild(textSpan);
            li.appendChild(deleteSpan);
            recentList.appendChild(li);
        });
    }
    recentContainer.style.display = "block";
}

// 최근 검색어 숨김
function hideRecentSearches() {
    const recentContainer = document.getElementById("recent-searches-container");
    recentContainer.style.display = "none";
}

// 최근 검색어 전체 삭제
function clearRecentSearches() {
    localStorage.removeItem("recentSearches");
    showRecentSearches();
}

// 개별 최근 검색어 삭제
function deleteRecentSearch(index) {
    const items = JSON.parse(localStorage.getItem("recentSearches") || "[]");
    items.splice(index, 1);
    localStorage.setItem("recentSearches", JSON.stringify(items));
    showRecentSearches();
}

// 최근 검색어에서 검색
function searchFromRecent(query) {
    const searchInput = document.getElementById("searchInput");
    searchInput.value = query;
    search();
}

// 검색 실행
function search() {
    const searchInput = document.getElementById("searchInput");
    var query = searchInput.value.replace(/-/g, '').toUpperCase();
    if (!query) return;

    if (query.length === 8 && /^[0-9]+$/.test(query)) {
        query = "KGS" + query;
    }

    let list = JSON.parse(localStorage.getItem("recentSearches") || "[]");
    list = list.filter(item => item !== query);
    list.unshift(query);
    if (list.length > 3) list.pop();
    localStorage.setItem("recentSearches", JSON.stringify(list));

    window.location.href = "qrinfo_vessel.html?code=" + encodeURIComponent(query);
}
