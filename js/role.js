// ==========================================
// HAK AKSES TOMBOL (ROLE BASED) - satu blok
// Catatan: ini hanya tampilan. Keamanan sebenarnya harus di Firestore Rules.
// Tombol di HTML sudah 'hidden' secara default, jadi tidak berkedip.
// ==========================================
document.addEventListener("DOMContentLoaded", function () {
    const currentRole = localStorage.getItem("role");
    const aturan = {
        btnFiturMassal:    ["admin"],
        btnDaftarSantri:   ["admin"],
        btnDaftarAkun:     ["admin"],
        btnMuridBimbingan: ["guru", "admin"]
    };
    Object.entries(aturan).forEach(([id, roleDiizinkan]) => {
        const el = document.getElementById(id);
        if (!el) return;
        const boleh = roleDiizinkan.includes(currentRole);
        el.classList.toggle("hidden", !boleh);
        el.style.display = boleh ? "inline-flex" : "none";
    });
});
