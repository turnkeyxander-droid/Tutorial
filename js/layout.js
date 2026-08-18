document.addEventListener("DOMContentLoaded", function () {
    const basePath =
        window.location.pathname.includes("/pages/")
            ? "../"
            : "";

    const loadPartial = (path, selector) =>
        fetch(`${basePath}${path}`)
            .then(response => response.text())
            .then(data => {

                const container = document.querySelector(selector);

                if (container) container.innerHTML = data;
            });

    Promise.all([
        loadPartial("components/header.html", "#header-container"),
        loadPartial("components/footer.html", "#footer-container"),
    ]).then(() => {
        document.dispatchEvent(new Event("partials:loaded"));
    });

});