// ==========================================
// 1. RENDER TOMBOL JUZ (HAFALAN)
// ==========================================
document.addEventListener("DOMContentLoaded", function() {
    const containerJuz = document.getElementById('gridContainerJuz');
    let htmlJuz = '';
    for(let i = 1; i <= 30; i++) {
        htmlJuz += `
        <button onclick="bukaHalamanJuz(${i})" class="bg-slate-50 border border-slate-200 p-4 rounded-2xl hover:bg-blue-50 hover:border-blue-300 hover:shadow-md hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-3 group">
            <div class="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 text-base font-bold group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all">
                ${i}
            </div>
            <span class="text-sm font-extrabold text-slate-600 group-hover:text-blue-700 transition-colors">Juz ${i}</span>
        </button>
        `;
    }
    if(containerJuz) containerJuz.innerHTML = htmlJuz;
});

// ==========================================
// 2. SISTEM PENGAMAN TOMBOL BACK HP (HISTORY API)
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    history.replaceState({ level: 'dashboard' }, "Dashboard Utama", "#dashboard");
});

function catatSejarah(levelId) {
    history.pushState({ level: levelId }, levelId, "#" + levelId);
}

// Menyadap Navigasi Utama
setTimeout(() => {
    if (typeof window.navigateTo === 'function') {
        const fungsiAsliNavigateTo = window.navigateTo;
        window.navigateTo = function(viewId) {
            if (viewId !== 'viewDashboard') catatSejarah(viewId);
            else history.pushState({ level: 'dashboard' }, "Dashboard", "#dashboard");
            fungsiAsliNavigateTo(viewId);
        };
    }
}, 500);

// ==========================================
// 3. NAVIGASI BERSARANG (SUB-MENU HAFALAN & PENILAIAN)
// ==========================================
window.bukaHalamanJuz = function(nomorJuz) {
    catatSejarah('subPageDetailSuratJuz'); 
    document.getElementById('subPageDaftarJuz').classList.add('hidden');
    document.getElementById('subPageDetailSuratJuz').classList.remove('hidden');
    document.getElementById('txtJudulHalamanJuz').innerText = "Daftar Surat - Juz " + nomorJuz;
    if(typeof renderSuratBerdasarkanJuz === "function") renderSuratBerdasarkanJuz(nomorJuz);
};

window.kembaliKeDaftarJuz = function() {
    history.back(); 
};

window.bukaSubMenuPenilaian = function(tipe) {
    document.getElementById('subPageMenuPenilaian').classList.add('hidden');
    if (tipe === 'hijaiyah') {
        catatSejarah('subPageDetailHijaiyah'); 
        document.getElementById('subPageDetailHijaiyah').classList.remove('hidden');
    } else if (tipe === 'tajwid') {
        catatSejarah('subPageDetailTajwid'); 
        document.getElementById('subPageDetailTajwid').classList.remove('hidden');
    }
};

window.kembaliKeMenuPenilaian = function() {
    history.back(); 
};

// ==========================================
// 4. DETEKSI AKSI FISIK TOMBOL BACK DI HP/TAB (SADAR LAPISAN)
// ==========================================
window.isPopStateRunning = false; // Bendera pengaman agar sensor tidak bertabrakan

window.addEventListener('popstate', function(event) {
    window.isPopStateRunning = true; // Nyalakan bendera pengaman
    
    // a. Buka kunci scroll secara default
    document.body.classList.remove('overflow-hidden', 'overflow-y-hidden');
    document.documentElement.classList.remove('overflow-hidden', 'overflow-y-hidden');
    
    // b. Matikan scanner kamera jika sedang aktif
    if (typeof html5QrcodeScanner !== 'undefined' && html5QrcodeScanner) {
        try { html5QrcodeScanner.clear().then(() => html5QrcodeScanner = null); } catch(e) {}
    }

    // c. Sembunyikan SEMUA Pop-Up terlebih dahulu
    const modals = ['suratDetail', 'ummiDetail', 'modalPenilaianUmmi', 'backdropDetail', 'modalPeringatan'];
    modals.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    // d. Baca Memori HP (State)
    const stateSekarang = event.state ? event.state.level : null;
    const stateModal = event.state ? event.state.targetModal : null;

    // SKENARIO 1: MUNDUR KE POP-UP LAPISAN 1 (Contoh: Menutup form nilai Ummi -> Kembali ke Halaman Jilid)
    if (event.state && event.state.iniModal && stateModal) {
        const modalTarget = document.getElementById(stateModal);
        if (modalTarget) {
            modalTarget.classList.remove('hidden'); // Hidupkan kembali Pop-up Lapisan 1
            document.body.classList.add('overflow-hidden'); // Kunci scroll lagi karena Pop-up masih terbuka
            
            // Khusus Pop-Up utama, hidupkan juga layar gelap di belakangnya (Backdrop)
            if (stateModal === 'suratDetail' || stateModal === 'ummiDetail') {
                const backdrop = document.getElementById('backdropDetail');
                if (backdrop) backdrop.classList.remove('hidden');
            }
        }
    } 
    // SKENARIO 2: MUNDUR KE HALAMAN BIASA
    else if (stateSekarang) {
        if (stateSekarang === 'viewPenilaian') {
            document.getElementById('subPageDetailHijaiyah').classList.add('hidden');
            document.getElementById('subPageDetailTajwid').classList.add('hidden');
            document.getElementById('subPageMenuPenilaian').classList.remove('hidden');
            document.querySelectorAll('.page-view').forEach(el => el.classList.add('hidden'));
            document.getElementById('viewPenilaian').classList.remove('hidden');
        }
        else if (stateSekarang === 'viewHafalan') {
            document.getElementById('subPageDetailSuratJuz').classList.add('hidden');
            document.getElementById('subPageDaftarJuz').classList.remove('hidden');
            document.querySelectorAll('.page-view').forEach(el => el.classList.add('hidden'));
            document.getElementById('viewHafalan').classList.remove('hidden');
        }
        else if (stateSekarang === 'dashboard') {
            document.querySelectorAll('.page-view').forEach(el => el.classList.add('hidden'));
            document.getElementById('viewDashboard').classList.remove('hidden');
        }
        else {
            const viewTarget = document.getElementById(stateSekarang);
            if (viewTarget && viewTarget.classList.contains('page-view')) {
                document.querySelectorAll('.page-view').forEach(el => el.classList.add('hidden'));
                viewTarget.classList.remove('hidden');
            }
        }
    } 
    // SKENARIO DARURAT
    else {
        document.querySelectorAll('.page-view').forEach(el => el.classList.add('hidden'));
        if (document.getElementById('viewDashboard')) document.getElementById('viewDashboard').classList.remove('hidden');
    }

    // Matikan bendera pengaman dengan sangat cepat
    setTimeout(() => { window.isPopStateRunning = false; }, 50);
});

// ==========================================
// 5. SISTEM ABSENSI & QR SCANNER
// ==========================================
let html5QrcodeScanner;
const scriptURLAbsen = 'https://script.google.com/macros/s/AKfycbzRY0tcV6SnDy_ESEyBeE4PwoY9GVmyAg4Omu5M43WtK0_XvmCuQqS-zQqlQ7NIMeGWow/exec';

window.bukaMenuAbsensi = function() {
    catatSejarah('viewAbsensi'); 
    document.querySelectorAll('.page-view').forEach(h => h.classList.add('hidden'));
    document.getElementById('viewAbsensi').classList.remove('hidden');
    window.renderRiwayatAbsensi();
    setTimeout(() => {
        if (!html5QrcodeScanner) {
            html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: {width: 250, height: 250} }, false);
            html5QrcodeScanner.render(window.onScanSuccess, window.onScanFailure);
        }
    }, 300);
};

window.tutupMenuAbsensi = function() {
    history.back(); 
};

window.renderRiwayatAbsensi = function() {
    let container = document.getElementById('listRiwayatAbsensi');
    if (!window.santriAktif || !window.santriAktif.absensi || window.santriAktif.absensi.length === 0) {
        container.innerHTML = `<div class="flex flex-col items-center justify-center opacity-50 mt-10"><span class="material-symbols-outlined text-4xl mb-2">inbox</span><p class="text-xs font-semibold text-center">Belum ada absen.</p></div>`; 
        return;
    }
    const currentRole = localStorage.getItem("role"); 
    let html = '';
    for (let i = window.santriAktif.absensi.length - 1; i >= 0; i--) {
        let item = window.santriAktif.absensi[i];
        let btnHapus = (currentRole === "admin" || currentRole === "guru") ? `<button onclick="hapusDataAbsen(${i})" class="w-8 h-8 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition"><span class="material-symbols-outlined text-sm">delete</span></button>` : '';
        html += `<div class="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl mb-2 hover:border-slate-200 transition"><div class="flex gap-3"><div class="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><span class="material-symbols-outlined text-base">check_circle</span></div><div><p class="text-xs font-bold text-slate-700">${item.waktu}</p><p class="text-[10px] text-slate-400">Data: ${item.qrData}</p></div></div>${btnHapus}</div>`;
    }
    container.innerHTML = html;
};

window.hapusDataAbsen = function(index) {
    if (confirm("Yakin hapus riwayat absen?")) {
        window.santriAktif.absensi.splice(index, 1);
        db.collection("database_hafalan").doc(window.santriAktif.nama).set({ absensi: window.santriAktif.absensi }, { merge: true })
        .then(() => window.renderRiwayatAbsensi()).catch(e => alert("Gagal hapus data."));
    }
};

window.onScanSuccess = function(decodedText) {
    if (html5QrcodeScanner) html5QrcodeScanner.pause(true);
    if (navigator.vibrate) navigator.vibrate(200);
    let divHasil = document.getElementById('hasil');
    let namaYangDiScan = decodedText; let qrDataAman = decodedText; 
    
    if (decodedText.startsWith("LOGIN|")) {
        let pecahan = decodedText.split('|');
        if (pecahan.length >= 5) { namaYangDiScan = pecahan[4]; qrDataAman = "QR Terpadu (Aman)"; } 
        else { window.resetScan(divHasil, "❌ QR Login tidak lengkap!", "rose"); return; }
    }

    let siswaDitemukan = null;
    if (typeof dataSantri !== 'undefined') {
        siswaDitemukan = dataSantri.find(s => (s.nama && s.nama.toLowerCase() === namaYangDiScan.toLowerCase()) || (s.id && s.id.toLowerCase() === namaYangDiScan.toLowerCase()));
    }

    if (!siswaDitemukan) { window.resetScan(divHasil, "❌ Santri tidak terdaftar!", "rose"); return; }

    let dateObj = new Date(); let waktuLengkap = dateObj.toLocaleString("id-ID"); let tanggalHariIni = dateObj.toLocaleDateString("id-ID"); 
    let riwayatAbsen = siswaDitemukan.absensi || [];
    if (riwayatAbsen.some(a => a.waktu && a.waktu.includes(tanggalHariIni))) { window.resetScan(divHasil, `⚠️ ${siswaDitemukan.nama} sudah absen!`, "amber"); return; }

    window.santriAktif = siswaDitemukan;
    divHasil.innerHTML = "⏳ Menyimpan..."; 
    divHasil.className = "text-sm font-bold text-blue-700 bg-blue-50 px-6 py-4 rounded-xl border border-blue-200";

    if (!window.santriAktif.absensi) window.santriAktif.absensi = [];
    window.santriAktif.absensi.push({ waktu: waktuLengkap, qrData: qrDataAman });

    db.collection("database_hafalan").doc(window.santriAktif.nama).set({ absensi: window.santriAktif.absensi }, { merge: true })
    .then(() => {
        window.renderRiwayatAbsensi();
        fetch(`${scriptURLAbsen}?nama=${encodeURIComponent(window.santriAktif.nama)}&waktu=${encodeURIComponent(waktuLengkap)}&qr_data=${encodeURIComponent(qrDataAman)}`, { method: 'GET', mode: 'no-cors' }).catch(e => console.error(e));
        window.resetScan(divHasil, "✅ Tersimpan: " + window.santriAktif.nama, "emerald");
    }).catch(e => window.resetScan(divHasil, "❌ Gagal koneksi Cloud", "rose"));
};

window.resetScan = function(div, msg, color) {
    div.innerHTML = msg; div.className = `text-sm font-bold text-${color}-700 bg-${color}-50 px-6 py-4 rounded-xl border border-${color}-200`;
    setTimeout(() => { if (html5QrcodeScanner) html5QrcodeScanner.resume(); div.innerHTML = "Menunggu scan..."; div.className = "text-sm font-bold text-slate-500 bg-slate-50 px-6 py-4 rounded-xl border border-slate-200"; }, 2500);
};

window.onScanFailure = function(error) { /* Abaikan */ };

// ==========================================
// 6. UTILITIES (ENTER KEY & PWA)
// ==========================================
document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && event.target.id === 'inputNilaiUmmi' && typeof simpanNilaiUmmi === "function") {
        event.preventDefault(); 
        simpanNilaiUmmi();
    }
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js'); });
}

// ==========================================
// 7. SENSOR PENGAMAT POP-UP BERTUMPUK (SMART OBSERVER)
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const daftarModal = ['suratDetail', 'ummiDetail', 'modalPenilaianUmmi'];
    
    daftarModal.forEach(idModal => {
        const elemenModal = document.getElementById(idModal);
        if (elemenModal) {
            elemenModal.dataset.sedangTerbuka = elemenModal.classList.contains('hidden') ? "false" : "true";
            
            const pengamat = new MutationObserver((mutasiList) => {
                mutasiList.forEach((mutasi) => {
                    if (mutasi.attributeName === 'class') {
                        const isHidden = elemenModal.classList.contains('hidden');
                        const wasOpen = elemenModal.dataset.sedangTerbuka === "true";
                        
                        // JIKA POP-UP BARU SAJA TERBUKA
                        if (!isHidden && !wasOpen) {
                            elemenModal.dataset.sedangTerbuka = "true";
                            // JANGAN catat sejarah jika pop-up terbuka otomatis karena restorasi tombol Back
                            if (!window.isPopStateRunning) {
                                history.pushState({ iniModal: true, targetModal: idModal }, "Modal Terbuka", "#modal-" + idModal);
                            }
                        } 
                        // JIKA POP-UP BARU SAJA DITUTUP (Oleh klik UI pengguna)
                        else if (isHidden && wasOpen) {
                            elemenModal.dataset.sedangTerbuka = "false";
                            // Pastikan yang menutup adalah kursor pengguna, bukan fungsi tombol Back
                            if (!window.isPopStateRunning) {
                                // Tarik mundur memori HP 1 langkah
                                if (history.state && history.state.iniModal && history.state.targetModal === idModal) {
                                    history.back();
                                }
                            }
                        }
                    }
                });
            });
            pengamat.observe(elemenModal, { attributes: true });
        }
    });
});