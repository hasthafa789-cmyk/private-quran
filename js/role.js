// ==========================================
// PENGATURAN HAK AKSES TOMBOL REGISTRASI MASSAL
// ==========================================
document.addEventListener("DOMContentLoaded", function() {
    // Cari tombolnya menggunakan ID
    const btnFiturMassal = document.getElementById("btnFiturMassal");
    
    // Ambil data role yang sedang login
    const currentRole = localStorage.getItem("role"); 
    
    if (btnFiturMassal) {
        if (currentRole === "admin") {
            // Jika admin, munculkan tombolnya. 
            // Kita pakai "inline-flex" agar desain tombol Tailwind tetap rapi
            btnFiturMassal.style.display = "inline-flex"; 
        } else {
            // Jika bukan admin, pastikan tombol tetap hilang
            btnFiturMassal.style.display = "none"; 
        }
    }
});

// ==========================================
// PENGATURAN HAK AKSES TOMBOL (ROLE BASED)
// ==========================================
document.addEventListener("DOMContentLoaded", function() {
    const btnFiturMassal = document.getElementById("btnFiturMassal");
    const btnDaftarSantri = document.getElementById("btnDaftarSantri");
    
    // Ambil data role yang sedang login
    const currentRole = localStorage.getItem("role"); 
    
    // 1. Logika untuk tombol Registrasi Massal (KHUSUS ADMIN)
    if (btnFiturMassal) {
        if (currentRole === "admin") {
            btnFiturMassal.style.display = "inline-flex"; 
        } else {
            btnFiturMassal.style.display = "none"; 
        }
    }

    // 2. Logika untuk tombol Daftar Santri (UBAH: HANYA ADMIN)
    if (btnDaftarSantri) {
        if (currentRole === "admin") { // Sebelumnya: currentRole === "admin" || currentRole === "guru"
            btnDaftarSantri.style.display = "inline-flex";
        } else {
            btnDaftarSantri.style.display = "none";
        }
    }
});

// ==========================================
// PENGATURAN HAK AKSES TOMBOL (ROLE BASED)
// ==========================================
document.addEventListener("DOMContentLoaded", function() {
    const btnFiturMassal = document.getElementById("btnFiturMassal");
    const btnDaftarSantri = document.getElementById("btnDaftarSantri");
    const btnDaftarAkun = document.getElementById("btnDaftarAkun"); // Tambahan variabel baru
    
    // Ambil data role yang sedang login
    const currentRole = localStorage.getItem("role"); 
    
    // 1. Tombol Registrasi Massal (KHUSUS ADMIN)
    if (btnFiturMassal) {
        if (currentRole === "admin") {
            btnFiturMassal.style.display = "inline-flex"; 
        } else {
            btnFiturMassal.style.display = "none"; 
        }
    }

    // 2. Tombol Daftar Santri (KHUSUS ADMIN)
    if (btnDaftarSantri) {
        if (currentRole === "admin") {
            btnDaftarSantri.style.display = "inline-flex";
        } else {
            btnDaftarSantri.style.display = "none";
        }
    }

    // 3. Tombol Manajemen Semua Akun (KHUSUS ADMIN)
    if (btnDaftarAkun) {
        if (currentRole === "admin") {
            btnDaftarAkun.style.display = "inline-flex"; // Tampilkan jika admin
        } else {
            btnDaftarAkun.style.display = "none"; // Sembunyikan untuk guru/murid
        }
    }
});

// ==========================================
// PENGATURAN HAK AKSES TOMBOL (ROLE BASED)
// ==========================================
document.addEventListener("DOMContentLoaded", function() {
    const btnFiturMassal = document.getElementById("btnFiturMassal");
    const btnDaftarSantri = document.getElementById("btnDaftarSantri");
    const btnDaftarAkun = document.getElementById("btnDaftarAkun"); 
    const btnMuridBimbingan = document.getElementById("btnMuridBimbingan"); // Tambahan Variabel Baru
    
    const currentRole = localStorage.getItem("role"); 
    
    // 1. Fitur Massal (Admin)
    if (btnFiturMassal) {
        btnFiturMassal.style.display = (currentRole === "admin") ? "inline-flex" : "none"; 
    }

    // 2. Daftar Santri & Progres (Admin)
    if (btnDaftarSantri) {
        btnDaftarSantri.style.display = (currentRole === "admin") ? "inline-flex" : "none";
    }

    // 3. Manajemen Semua Akun (Admin)
    if (btnDaftarAkun) {
        btnDaftarAkun.style.display = (currentRole === "admin") ? "inline-flex" : "none";
    }

    // 4. Murid Bimbingan Saya (KHUSUS GURU)
    if (btnMuridBimbingan) {
        if (currentRole === "guru" || currentRole === "admin") {
            btnMuridBimbingan.style.display = "inline-flex"; // Munculkan untuk Guru
        } else {
            btnMuridBimbingan.style.display = "none"; // Sembunyikan untuk Admin dan Murid
        }
    }
});