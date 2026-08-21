// 5. INISIALISASI HALAMAN
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    mulaiSinkronisasiOtomatis(); 
    initGreeting();
    tampilkanHaditsAcak();
    batasiTampilanSesuaiRole();

    const namaInput = document.getElementById("namaInput");
    if (namaInput) {
        namaInput.removeAttribute("oninput");
        namaInput.removeAttribute("onkeyup");
        namaInput.removeAttribute("onchange");
        
        namaInput.addEventListener("keydown", function(event) {
            if (event.key === "Enter") {
                event.preventDefault(); 
                setSantriAktif(); 
            }
        });
    }
});

function batasiTampilanSesuaiRole() {
    if (role === "murid") {
        const areaPencarian = document.getElementById("areaPencarianGuru");
        if (areaPencarian) areaPencarian.style.display = "none";
        
        const tombolSimpan = document.querySelectorAll(".btn-simpan-nilai"); 
        tombolSimpan.forEach(btn => btn.style.display = "none");
    }
}

function initGreeting() {
    const jam = new Date().getHours();
    let ucapan = "Selamat Malam"; let iconName = "nights_stay";
    if (jam >= 4 && jam < 10) { ucapan = "Selamat Pagi"; iconName = "sunny"; } 
    else if (jam >= 10 && jam < 15) { ucapan = "Selamat Siang"; iconName = "wb_sunny"; } 
    else if (jam >= 15 && jam < 18) { ucapan = "Selamat Sore"; iconName = "partly_cloudy_day"; }

    const el = document.getElementById("txtGreeting");
    if (el) el.innerHTML = `<span class="flex items-center justify-center gap-1.5"><span class="material-symbols-outlined text-sm leading-none">${iconName}</span>${ucapan}</span>`;
}

function initUser() {
    if (dataSantri.length === 0 || !namaLogin) return;
    
    if (role === "murid") {
       santriAktif = dataSantri.find(s => s.nama && s.nama.toLowerCase() === namaLogin.toLowerCase());
       
       if (!santriAktif) {
           santriAktif = { id: String(Date.now()), nama: namaLogin, progress: {}, huruf: {}, tajwid: {}, ummi: {} };
           save(); 
       }
       
       const input = document.getElementById("namaInput");
       if (input) { input.value = namaLogin; input.disabled = true; }
       
       const namaEl = document.getElementById("namaSantri");
       if (namaEl) namaEl.innerText = namaLogin;
       
       updateLiveDashboardStats();
    }
}

function tampilkanHaditsAcak() {
    const teksEl = document.querySelector("blockquote");
    if (!teksEl) return;
    let riwayatEl = teksEl.nextElementSibling;
    if (riwayatEl && riwayatEl.tagName === 'DIV') { riwayatEl = riwayatEl.nextElementSibling; }
    
    if (teksEl && riwayatEl && riwayatEl.tagName === 'P') {
        const indexAcak = Math.floor(Math.random() * kumpulanHadits.length);
        const haditsTerpilih = kumpulanHadits[indexAcak];
        teksEl.innerText = `"${haditsTerpilih.teks}"`;
        riwayatEl.innerText = haditsTerpilih.riwayat;
    }
}

