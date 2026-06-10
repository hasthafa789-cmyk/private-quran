// ==========================================
// CONFIG & INITIALIZATION FIREBASE
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyCIBGqJVfrRZikYeQDtQynWDxybsFFtY-0",
    authDomain: "hasnanprivate.firebaseapp.com",
    projectId: "hasnanprivate",
    storageBucket: "hasnanprivate.firebasestorage.app",
    messagingSenderId: "737022132780",
    appId: "1:737022132780:web:8ab47b587f13ee53900789"
};

// Aktifkan Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ==========================================
// FUNGSI UTAMA LOGIN
// ==========================================
async function login() {
    const emailInput = document.getElementById("username").value.trim();
    const passwordInput = document.getElementById("password").value.trim();

    if (!emailInput || !passwordInput) {
        tampilkanPeringatan ("Email dan password tidak boleh kosong!");
        return;
    }

    // Indikator loading tombol
    const btn = document.querySelector("button"); 
    const originalText = btn.innerText;
    btn.innerText = "Memproses...";
    btn.disabled = true;

    try {
        // 1. Verifikasi akun ke Firebase Authentication
        const userCredential = await auth.signInWithEmailAndPassword(emailInput, passwordInput);
        const user = userCredential.user;

        // 2. Ambil data profil tambahan (nama & role) dari Firestore
        const userDoc = await db.collection("users").doc(user.uid).get();

        if (userDoc.exists) {
            const userData = userDoc.data();

            // Set data ke LocalStorage untuk dipakai index.js
            localStorage.setItem("login", "true");
            localStorage.setItem("nama", userData.nama || "Tanpa Nama");
            localStorage.setItem("role", userData.role || "murid");
            localStorage.setItem("username", emailInput);

            // Arahkan ke halaman utama monitoring
            window.location.href = "index.html";
        } else {
            // Jika akun terdaftar di auth tapi data role tidak ditemukan di firestore database
            tampilkanPeringatan ("Data profil akun Anda belum terkonfigurasi di sistem Firestore.");
            btn.innerText = originalText;
            btn.disabled = false;
        }

} catch (error) {
        console.error("Error Login:", error);
        
        // Pemetaan error sederhana agar user mengerti masalahnya
        let pesanError = "Gagal masuk. Periksa kembali jaringan internet Anda.";
        if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
            pesanError = "Email atau Password salah! Periksa kembali ketikan Anda.";
        } else if (error.code === "auth/invalid-email") {
            pesanError = "Format penulisan email salah (Contoh: nama@gmail.com).";
        }
        
        // BARIS YANG DIUBAH: Menggunakan popup kustom, bukan alert browser lagi
        tampilkanPeringatan(pesanError);
        
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// Fitur Tombol Enter Keyboard
document.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        login();
    }
});

// ==========================================
// FUNGSI POPUP PERINGATAN KUSTOM
// ==========================================
function tampilkanPeringatan(pesan) {
    const modal = document.getElementById("modalPeringatan");
    const teksEl = document.getElementById("teksPeringatan");
    
    if (teksEl) teksEl.innerText = pesan;
    if (modal) modal.classList.remove("hidden");
}

function tutupPeringatan() {
    const modal = document.getElementById("modalPeringatan");
    if (modal) modal.classList.add("hidden");
}