document.addEventListener("partials:loaded", async () => {

    //mobile menu logic
    const menu = document.querySelector('#mobile-menu');
    const menuLinks = document.querySelector('.navbar__menu');

    menu.addEventListener('click', function() {
        menu.classList.toggle('is-active');
        menuLinks.classList.toggle('active');
    });

    // profile modal open/close logic - now inside header.html, so must live here
    const profileOverlay = document.getElementById("profileOverlay");
    const profileClose = document.getElementById("profileClose");

    if (profileOverlay) {
        profileClose.addEventListener("click", () => {
            profileOverlay.classList.remove("active");
        });

        profileOverlay.addEventListener("click", (e) => {
            if (e.target === profileOverlay) {
                profileOverlay.classList.remove("active");
            }
        });
    }

    const profileForm = document.getElementById('profileForm');
    if (profileForm){
        profileForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const username = document.getElementById("profileUsername").value;
            const email = document.getElementById("profileEmail").value;

            const res = await fetch("/api/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email })
            });

            const data = await res.json();
            alert(data.message);

            if (res.ok) {
                document.getElementById("logoutBtn").textContent = `Logout (${data.username})`;
            }
        });
    }

    const passwordForm = document.getElementById("passwordForm");
    if(passwordForm){
        passwordForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const currentPassword = document.getElementById("currentPassword").value;
            const newPassword = document.getElementById("newPassword").value;
            const confirmPassword = document.getElementById("confirmPassword").value;

            if (newPassword !== confirmPassword) {
                alert("New passwords don't match");
                return;
            }

            const res = await fetch("/api/profile/password", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            const data = await res.json();
            alert(data.message);

            if (res.ok) {
                e.target.reset();
            }
        });
    }



    //Login stastus checking logic
    const res = await fetch("/api/me");
    const data = await res.json();

    const loginBtn = document.querySelector(".navbar__btn");
    const profileBtn = document.querySelector(".navbar__item");

    if (data.loggedIn && loginBtn) {
        loginBtn.innerHTML = `<a href="#" class="button" id="logoutBtn">Logout (${data.username})</a>`;
        profileBtn.innerHTML = `<a href="#" class="navbar__links" id="profileLink">Profile</a>`;

        document.getElementById("logoutBtn").addEventListener("click", async (e) => {
            e.preventDefault();
            await fetch("/api/logout", { method: "POST" });
            window.location.href = "/pages/index.html";
        });

        document.getElementById("profileLink").addEventListener("click", async (e) => {
            e.preventDefault();

            const profileRes = await fetch("/api/profile");
            const profileData = await profileRes.json();

            if (profileRes.ok) {
                document.getElementById("profileUsername").value = profileData.username;
                document.getElementById("profileEmail").value = profileData.email;
            }

            profileOverlay.classList.add("active");
        });
    }

    const dropdown = document.querySelector('.navbar__dropdown');
    const dropdownToggle = document.querySelector('.navbar__dropdown--toggle');

    if (dropdown && dropdownToggle) {
        dropdownToggle.addEventListener('click', (e) => {
            e.preventDefault();

            if (!data.loggedIn) {
                window.location.href = "/pages/login.html";
                return;
            }

            dropdown.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target)){
                dropdown.classList.remove('active');
            }
        });

    }
});