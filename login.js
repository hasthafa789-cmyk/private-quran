// Data Akun yang Didaftarkan ke Sistem (Gunakan ini untuk login)
const databaseUser = [
    {
        username: "guru",
        password: "123",
        nama: "Ustadz Hasnan",
        role: "guru"
    },
    {
        username: "bintang",
        password: "123",
        nama: "bintang",
        role: "murid"
    },
    {
        username: "dimaz",
        password: "123",
        nama: "dimaz",
        role: "murid"
    }
];

function login() {
    const usernameInput = document.getElementById("username").value.trim();
    const passwordInput = document.getElementById("password").value.trim();

    if (!usernameInput || !passwordInput) {
        alert("Username dan password tidak boleh kosong!");
        return;
    }

    // Cari user di dalam databaseUser
    const userTerpilih = databaseUser.find(
        user => user.username.toLowerCase() === usernameInput.toLowerCase() && user.password === passwordInput
    );

    if (userTerpilih) {
        // Set semua session data ke LocalStorage sesuai kebutuhan script.js utama
        localStorage.setItem("login", "true");
        localStorage.setItem("username", userTerpilih.username);
        localStorage.setItem("nama", userTerpilih.nama);
        localStorage.setItem("role", userTerpilih.role);

        alert(`Login Berhasil! Selamat datang, ${userTerpilih.nama} (${userTerpilih.role})`);
        
        // Pindah ke halaman dashboard utama
        window.location.href = "index.html";
    } else {
        alert("Username atau Password salah! Periksa kembali data Anda.");
    }
}

// Fitur Tambahan: Mengaktifkan tombol Enter untuk login
document.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        login();
    }
});