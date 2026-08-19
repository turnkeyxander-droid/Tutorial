async function checkAdminAccess() {
    const res = await fetch("/api/me");
    const data = await res.json();

    if (!data.loggedIn) {
        alert("Please log in first");
        window.location.href = "/pages/login.html";
        return;
    }

    if (data.role !== "admin") {
        alert("Admin access only");
        window.location.href = "/pages/product.html";
        return;
    }
}

checkAdminAccess();

window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
        checkAdminAccess();
    }
});