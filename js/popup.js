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

