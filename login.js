// URL Web App Google Apps Script Anda
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyGx6yRAZEc98peIMYxQ-aNo3rvsoBfMmNWhSADDfthQoAa7CBumg2ma5EWenXXxroY/exec"; 

async function login() {
    const usernameInput = document.getElementById("username").value.trim();
    const passwordInput = document.getElementById("password").value.trim();

    if (!usernameInput || !passwordInput) {
        alert("Username dan password tidak boleh kosong!");
        return;
    }

    // Indikator loading sederhana
    const btn = document.querySelector("button"); 
    const originalText = btn.innerText;
    btn.innerText = "Memproses...";
    btn.disabled = true;

    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ 
                action: "login", 
                username: usernameInput, 
                password: passwordInput 
            })
        });

        // Mengambil respons dari server
        const result = await response.json();

        if (result.status === "success") {
            // Set data ke LocalStorage
            localStorage.setItem("login", "true");
            localStorage.setItem("nama", result.nama);
            localStorage.setItem("role", result.role);
            localStorage.setItem("username", usernameInput);

            // Pindah ke halaman dashboard utama
            window.location.href = "index.html";
        } else {
            // Menampilkan error (Entah itu salah password atau error dari Google Script)
            alert(result.message);
            btn.innerText = originalText;
            btn.disabled = false;
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Gagal terhubung ke server. Periksa koneksi internet atau konfigurasi Deployment Anda.");
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// Fitur Tombol Enter
document.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        login();
    }
});