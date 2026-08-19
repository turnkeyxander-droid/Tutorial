(async function requireLogin() {
    const res = await fetch("/api/me");
    const data = await res.json();

    if (!data.loggedIn) {
        alert("Please log in to view products");
        window.location.href = "/pages/login.html";
    }
})();

window.addEventListener("pageshow", async (event) => {
    if (event.persisted) {
        const res = await fetch("/api/me");
        const data = await res.json();

        if (!data.loggedIn) {
            window.location.href = "/pages/login.html";
        }
    }
});