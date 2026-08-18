document.getElementById("signupForm").addEventListener("submit", async (e) => {
    e.preventDefault(); // Prevent the form's default submission behavior (which would normally refresh the page)

    // take the value of users input from the input field
    const email = document.getElementById("email").value;
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
        // Send POST request to backend
        const res = await fetch("/api/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password })
        });

        const data = await res.json();

        if (res.ok) {
            alert(data.message);
            window.location.href = "login.html"; // register successfull direct go to login page
        } else {
            alert(data.message); 
            // Display the error message returned by the backend (such as the email address has been registered)
        }
    } catch (err) {
        console.error(err);
        alert("Internet error, pls try later");
    }
});