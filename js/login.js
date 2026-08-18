document.getElementById("loginForm").addEventListener("submit", async (e) =>{
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try{
        const res = await fetch("/api/login", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok) {
            localStorage.setItem("loggedInUser", data.username); //remember who's logged in
            alert(data.message);
            window.location.href = "index.html";
        }

        else{
            alert(data.message);
        }
    }catch (err) {
        console.error(err);
        alert("Internet error, pls try later");
    }
});