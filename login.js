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

// ==========================================================
// FITUR LOGIN MENGGUNAKAN QR CODE (FIREBASE AUTH)
// ==========================================================
let loginQrcodeScanner;

function bukaLoginQR() {
    document.getElementById('areaLoginQR').classList.remove('hidden');
    
    // Beri jeda sedikit agar modal muncul sebelum merender kamera
    setTimeout(() => {
        if (!loginQrcodeScanner) {
            loginQrcodeScanner = new Html5QrcodeScanner("loginReader", { fps: 10, qrbox: {width: 250, height: 250} }, false);
            loginQrcodeScanner.render(onScanLoginSuccess, onScanLoginFailure);
        }
    }, 300);
}

function tutupLoginQR() {
    document.getElementById('areaLoginQR').classList.add('hidden');
    if (loginQrcodeScanner) {
        loginQrcodeScanner.clear().then(() => loginQrcodeScanner = null);
    }
    document.getElementById('statusLoginQR').innerText = "Menunggu scan...";
    document.getElementById('statusLoginQR').className = "w-full text-sm font-bold text-slate-500 mb-5";
}

function onScanLoginSuccess(decodedText) {
    if (loginQrcodeScanner) loginQrcodeScanner.pause(true);
    
    let statusDiv = document.getElementById('statusLoginQR');

    // Memecah teks QR Code (Format: LOGIN|email|password)
    let dataLogin = decodedText.split('|');

    if (dataLogin.length >= 3 && dataLogin[0] === 'LOGIN') {
        let emailAkun = dataLogin[1];
        let passwordAkun = dataLogin[2];
        
        statusDiv.innerHTML = "✅ QR Valid! Sedang memproses...";
        statusDiv.className = "w-full text-sm font-bold text-emerald-600 mb-5 animate-pulse";

        setTimeout(() => {
            tutupLoginQR();
            
            // =======================================================
            // ROBOT PENGETIK SESUAI KODE ASLI
            // =======================================================
            
            // 1. Masukkan email ke input dengan id "username"
            document.getElementById('username').value = emailAkun;

            // 2. Masukkan password ke input dengan id "password"
            document.getElementById('password').value = passwordAkun;

            // 3. Langsung eksekusi fungsi login() bawaan aplikasimu!
            // Sistem akan otomatis mengambil data Firestore dan pindah halaman
            if (typeof login === 'function') {
                login();
            } else {
                console.error("Fungsi login() tidak ditemukan!");
            }

        }, 500);
        
    } else {
        statusDiv.innerHTML = "❌ Format QR Code tidak valid!";
        statusDiv.className = "w-full text-sm font-bold text-rose-600 mb-5";
        
        setTimeout(() => {
            if(loginQrcodeScanner) loginQrcodeScanner.resume();
            statusDiv.innerHTML = "Silakan scan QR Code Login Anda";
            statusDiv.className = "w-full text-sm font-bold text-slate-500 mb-5";
        }, 2000);
    }
}
function onScanLoginFailure(error) { /* Abaikan */ }