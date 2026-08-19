// 1.Use authentic JavaScript to dynamically generate the HTML for the overlay and insert it into the page.
const overlayHTML = `
    <div id="pageLoadingOverlay" class="page-loading__overlay">
        <div class="page-loading__spinner"></div>
    </div>
`;
document.body.insertAdjacentHTML("afterbegin", overlayHTML);

const loadingOverlay = document.getElementById("pageLoadingOverlay");

// 2. function to show/hide overlay
function showPageLoading() {
    loadingOverlay.classList.add("active");
}

function hidePageLoading() {
    loadingOverlay.classList.remove("active");
}

// 3. Block all clicks on "internal links"
document.addEventListener("click", (e) => {
    const link = e.target.closest("a");

    if (!link) return; // 点的不是连结，不处理

    const href = link.getAttribute("href");

    // Ignore these situations: empty links, anchor points (#), new tabs open, external websites
    if (!href || href.startsWith("#") || link.target === "_blank" || href.startsWith("http")) {
        return;
    }

    e.preventDefault(); // Prevent immediate redirection
    showPageLoading();

    setTimeout(() => {
        window.location.href = href;
    }, 300);
});

// 4. When the page is redisplayed (including returning from bfcache), hide the loading
window.addEventListener("pageshow", () => {
    hidePageLoading();
});