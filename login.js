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
        tampilkanPeringatan("Email dan password tidak boleh kosong!");
        return;
    }

    const btn = document.querySelector("button"); 
    const originalText = btn.innerText;
    btn.innerText = "Memproses...";
    btn.disabled = true;

    try {
        const userCredential = await auth.signInWithEmailAndPassword(emailInput, passwordInput);
        const user = userCredential.user;

        const userDoc = await db.collection("users").doc(user.uid).get();

        if (userDoc.exists) {
            const userData = userDoc.data();

            localStorage.setItem("login", "true");
            localStorage.setItem("nama", userData.nama || "Tanpa Nama");
            localStorage.setItem("role", userData.role || "murid");
            localStorage.setItem("username", emailInput);

            window.location.href = "index.html";
        } else {
            tampilkanPeringatan("Data profil akun Anda belum terkonfigurasi di sistem Firestore.");
            btn.innerText = originalText;
            btn.disabled = false;
        }

    } catch (error) {
        console.error("Error Login:", error);
        
        let pesanError = "Gagal masuk. Periksa kembali jaringan internet Anda.";
        if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
            pesanError = "Email atau Password salah! Periksa kembali ketikan Anda.";
        } else if (error.code === "auth/invalid-email") {
            pesanError = "Format penulisan email salah (Contoh: nama@gmail.com).";
        }
        
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
// FITUR SCANNER QR CODE LOGIN
// ==========================================================
let loginScanner = null;

function bukaLoginQR() {
    const areaQR = document.getElementById('areaLoginQR');
    if (areaQR) {
        areaQR.classList.remove('hidden');
    }

    setTimeout(() => {
        if (!loginScanner) {
            loginScanner = new Html5QrcodeScanner(
                "loginReader", 
                { fps: 10, qrbox: { width: 250, height: 250 } }, 
                false
            );
            // Fungsi onScanSuccess dipanggil di sini
            loginScanner.render(onScanSuccess, onScanFailure);
        }
    }, 300);
}

function tutupLoginQR() {
    const areaQR = document.getElementById('areaLoginQR');
    if (areaQR) {
        areaQR.classList.add('hidden');
    }

    if (loginScanner) {
        loginScanner.clear().then(() => {
            loginScanner = null;
        }).catch(error => console.error("Gagal mematikan kamera:", error));
    }

    const statusDiv = document.getElementById('statusLoginQR');
    if (statusDiv) {
        statusDiv.innerHTML = '<span class="material-symbols-outlined text-base animate-pulse">flip_camera_ios</span> Menunggu scan...';
        statusDiv.className = "text-sm font-bold text-slate-500 flex items-center justify-center gap-2 transition-all";
    }
}

// MENGUBAH FUNGSI INI MENJADI ASYNC AGAR BISA MEMBACA DATABASE
async function onScanSuccess(decodedText) {
    if (loginScanner) loginScanner.pause(true);
    if (navigator.vibrate) navigator.vibrate(200);

    const statusDiv = document.getElementById('statusLoginQR');
    
    if (decodedText.startsWith("LOGIN|")) {
        statusDiv.innerHTML = "⏳ Sedang memverifikasi...";
        statusDiv.className = "text-sm font-bold text-blue-600 flex items-center justify-center gap-2 transition-all";
        
        let data = decodedText.split("|");
        
        if (data.length >= 4) {
            let userEmail = data[1];
            let userPass = data[2];

            try {
                // 1. Verifikasi ke Firebase Auth
                const userCredential = await auth.signInWithEmailAndPassword(userEmail, userPass);
                const user = userCredential.user;

                // 2. Ambil data dari Firestore (KODE YANG SEBELUMNYA HILANG)
                const userDoc = await db.collection("users").doc(user.uid).get();

                if (userDoc.exists) {
                    const userData = userDoc.data();

                    // 3. Simpan ke LocalStorage agar tidak ditendang oleh index.html
                    localStorage.setItem("login", "true");
                    localStorage.setItem("nama", userData.nama || "Tanpa Nama");
                    localStorage.setItem("role", userData.role || "murid");
                    localStorage.setItem("username", userEmail);

                    statusDiv.innerHTML = "✅ Login Berhasil!";
                    statusDiv.className = "text-sm font-bold text-emerald-600 flex items-center justify-center gap-2 transition-all";
                    
                    // 4. Arahkan ke dashboard dengan aman
                    setTimeout(() => {
                        window.location.href = "index.html";
                    }, 1000);

                } else {
                    statusDiv.innerHTML = "❌ Data profil tidak ditemukan di sistem!";
                    statusDiv.className = "text-sm font-bold text-rose-600 flex items-center justify-center gap-2 transition-all";
                    resetKameraQR(statusDiv);
                }

            } catch (error) {
                statusDiv.innerHTML = "❌ Gagal: " + error.message;
                statusDiv.className = "text-sm font-bold text-rose-600 flex items-center justify-center gap-2 transition-all";
                resetKameraQR(statusDiv);
            }
        } else {
            statusDiv.innerHTML = "❌ Format QR Code tidak valid!";
            statusDiv.className = "text-sm font-bold text-rose-600 flex items-center justify-center gap-2 transition-all";
            resetKameraQR(statusDiv);
        }
    } else {
        statusDiv.innerHTML = "❌ Ini bukan QR Code Login!";
        statusDiv.className = "text-sm font-bold text-amber-600 flex items-center justify-center gap-2 transition-all";
        resetKameraQR(statusDiv);
    }
}

function onScanFailure(error) {
    // Abaikan error saat sedang mencari QR
}

// Fungsi pembantu agar kode tidak berulang
function resetKameraQR(statusDiv) {
    setTimeout(() => {
        if (loginScanner) loginScanner.resume();
        statusDiv.innerHTML = '<span class="material-symbols-outlined text-base animate-pulse">flip_camera_ios</span> Menunggu scan...';
        statusDiv.className = "text-sm font-bold text-slate-500 flex items-center justify-center gap-2 transition-all";
    }, 2500);
}