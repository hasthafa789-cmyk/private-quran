function login() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    // ADMIN LOGIN
    if (username === "admin" && password === "1234") {
        localStorage.setItem("role", "admin");
        localStorage.setItem("login", "true");
        window.location.href = "index.html";
        return;
    }

    // MURID LOGIN
    if (username !== "") {
        localStorage.setItem("role", "murid");
        localStorage.setItem("login", "true");
        localStorage.setItem("nama", username);
        window.location.href = "index.html";
        return;
    }

    alert("Isi username!");
}