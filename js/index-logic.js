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
// 2. ROUTING DASAR & REAL-TIME SEARCH SENSOR
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    history.replaceState({ level: 'viewDashboard' }, "Dashboard", "#dashboard");
    
    // SENSOR PENCARIAN REAL-TIME: 
    // Jika guru mengetik nama di kolom pencarian saat menu Absen terbuka, log akan langsung update!
    let inputCari = document.getElementById('namaInput');
    if (inputCari) {
        inputCari.addEventListener('input', function() {
            let viewAbsensi = document.getElementById('viewAbsensi');
            if (viewAbsensi && !viewAbsensi.classList.contains('hidden')) {
                window.renderRiwayatAbsensi();
            }
        });
    }
});

function catatSejarah(levelId) {
    history.pushState({ level: levelId }, levelId, "#" + levelId);
}

setTimeout(() => {
    if (typeof window.navigateTo === 'function') {
        const fungsiAsliNavigateTo = window.navigateTo;
        window.navigateTo = function(viewId) {
            if (viewId !== 'viewDashboard') catatSejarah(viewId);
            else history.pushState({ level: 'viewDashboard' }, "Dashboard", "#dashboard");
            fungsiAsliNavigateTo(viewId);
        };
    }
}, 500);

// ==========================================
// 3. NAVIGASI SUB-MENU EKSPLISIT
// ==========================================
window.bukaHalamanJuz = function(nomorJuz) {
    catatSejarah('subPageDetailSuratJuz'); 
    document.getElementById('subPageDaftarJuz').classList.add('hidden');
    document.getElementById('subPageDetailSuratJuz').classList.remove('hidden');
    document.getElementById('txtJudulHalamanJuz').innerText = "Daftar Surat - Juz " + nomorJuz;
    if(typeof renderSuratBerdasarkanJuz === "function") renderSuratBerdasarkanJuz(nomorJuz);
};

window.kembaliKeDaftarJuz = function() { history.back(); };

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

window.kembaliKeMenuPenilaian = function() { history.back(); };

// ==========================================
// 4. DETEKSI AKSI BACK (ANTI-FROZEN & SADAR LAPISAN)
// ==========================================
window.isPopStateRunning = false;

window.addEventListener('popstate', function(event) {
    window.isPopStateRunning = true;
    
    const modalsLayer1 = ['suratDetail', 'ummiDetail']; 
    const modalsLayer2 = ['modalPenilaianUmmi', 'modalPeringatan'];

    if (typeof html5QrcodeScanner !== 'undefined' && html5QrcodeScanner) {
        try { html5QrcodeScanner.clear().then(() => html5QrcodeScanner = null); } catch(e) {}
    }

    if (event.state && event.state.isModal) {
        const targetModal = event.state.id;
        if (modalsLayer1.includes(targetModal)) {
            modalsLayer2.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add('hidden');
            });
            document.getElementById(targetModal).classList.remove('hidden');
            document.getElementById('backdropDetail').classList.remove('hidden');
            document.body.classList.add('overflow-hidden');
        }
    } 
    else {
        document.body.classList.remove('overflow-hidden', 'overflow-y-hidden', 'fixed');
        document.body.style.overflow = '';
        document.documentElement.classList.remove('overflow-hidden', 'overflow-y-hidden');
        
        [...modalsLayer1, ...modalsLayer2, 'backdropDetail'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });

        const stateSekarang = event.state ? event.state.level : 'viewDashboard';
        document.querySelectorAll('.page-view').forEach(el => el.classList.add('hidden'));

        if (stateSekarang === 'subPageDetailHijaiyah') {
            document.getElementById('viewPenilaian').classList.remove('hidden');
            document.getElementById('subPageMenuPenilaian').classList.add('hidden');
            document.getElementById('subPageDetailHijaiyah').classList.remove('hidden');
            document.getElementById('subPageDetailTajwid').classList.add('hidden');
        }
        else if (stateSekarang === 'subPageDetailTajwid') {
            document.getElementById('viewPenilaian').classList.remove('hidden');
            document.getElementById('subPageMenuPenilaian').classList.add('hidden');
            document.getElementById('subPageDetailHijaiyah').classList.add('hidden');
            document.getElementById('subPageDetailTajwid').classList.remove('hidden');
        }
        else if (stateSekarang === 'viewPenilaian') {
            document.getElementById('viewPenilaian').classList.remove('hidden');
            document.getElementById('subPageMenuPenilaian').classList.remove('hidden');
            document.getElementById('subPageDetailHijaiyah').classList.add('hidden');
            document.getElementById('subPageDetailTajwid').classList.add('hidden');
        }
        else if (stateSekarang === 'subPageDetailSuratJuz') {
            document.getElementById('viewHafalan').classList.remove('hidden');
            document.getElementById('subPageDaftarJuz').classList.add('hidden');
            document.getElementById('subPageDetailSuratJuz').classList.remove('hidden');
        }
        else if (stateSekarang === 'viewHafalan') {
            document.getElementById('viewHafalan').classList.remove('hidden');
            document.getElementById('subPageDaftarJuz').classList.remove('hidden');
            document.getElementById('subPageDetailSuratJuz').classList.add('hidden');
        }
        else {
            const viewTarget = document.getElementById(stateSekarang);
            if (viewTarget) viewTarget.classList.remove('hidden');
            else document.getElementById('viewDashboard').classList.remove('hidden');
        }
    }
    setTimeout(() => { window.isPopStateRunning = false; }, 100);
});

// ==========================================
// 5. SISTEM ABSENSI & LOG AKTIVITAS 
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

window.tutupMenuAbsensi = function() { history.back(); };

window.renderRiwayatAbsensi = function() {
    let container = document.getElementById('listRiwayatAbsensi');
    
    let currentRole = localStorage.getItem("role") || "murid";
    currentRole = currentRole.toLowerCase();
    
    let targetSantri = null;

    if (currentRole === "murid" || currentRole === "santri" || currentRole === "siswa") {
        // [ATURAN MURID]: HANYA lihat riwayat sendiri secara mutlak
        let namaAkunLogin = localStorage.getItem("nama") || localStorage.getItem("username") || "";
        if (!namaAkunLogin) {
            let elemenNama = document.getElementById('namaSantri');
            if (elemenNama && elemenNama.innerText !== "-") {
                namaAkunLogin = elemenNama.innerText.replace('!', '').trim();
            }
        }
        if (typeof dataSantri !== 'undefined' && namaAkunLogin) {
            let queryNama = namaAkunLogin.trim().toLowerCase();
            targetSantri = dataSantri.find(s => s.nama && s.nama.trim().toLowerCase() === queryNama);
        }
    } 
    else {
        // [ATURAN GURU]: Tarik data otomatis dari Kolom Pencarian (Search Bar)
        let inputPencarian = document.getElementById('namaInput');
        let namaDicari = inputPencarian ? inputPencarian.value.trim().toLowerCase() : "";

        if (namaDicari !== "" && typeof dataSantri !== 'undefined') {
            // Cocokkan nama yang diketik dengan database
            targetSantri = dataSantri.find(s => s.nama && s.nama.toLowerCase().includes(namaDicari));
            if (targetSantri) window.santriAktif = targetSantri; // Set jadi murid aktif
        }
        
        // Jika kolom pencarian kosong, gunakan data yang baru saja di-scan (jika ada)
        if (!targetSantri && window.santriAktif) {
            targetSantri = window.santriAktif;
        }
    }

    // Jika Target Tidak Ditemukan
    if (!targetSantri || !targetSantri.absensi || targetSantri.absensi.length === 0) {
        let inputPencarian = document.getElementById('namaInput');
        let sedangMencari = (inputPencarian && inputPencarian.value.trim() !== "");
        
        let pesanKosong = (currentRole === "murid" || currentRole === "santri" || currentRole === "siswa")
            ? "Kamu belum memiliki riwayat absensi."
            : sedangMencari 
                ? "Santri tersebut belum memiliki riwayat absen."
                : "Ketik nama santri di atas atau scan QR untuk melihat log.";
            
        container.innerHTML = `
        <div class="flex flex-col items-center justify-center opacity-50 mt-10">
            <span class="material-symbols-outlined text-4xl mb-2 text-slate-300">inbox</span>
            <p class="text-xs font-semibold text-center text-slate-400 px-4">${pesanKosong}</p>
        </div>`; 
        return;
    }

    // Jika Data Ditemukan, Render Lognya
    let html = '';
    for (let i = targetSantri.absensi.length - 1; i >= 0; i--) {
        let item = targetSantri.absensi[i];
        let btnHapus = (currentRole === "admin" || currentRole === "guru") 
            ? `<button onclick="hapusDataAbsen('${targetSantri.nama}', ${i})" class="w-8 h-8 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition active:scale-90 flex-shrink-0" title="Hapus"><span class="material-symbols-outlined text-sm">delete</span></button>` 
            : '';
        
        html += `
        <div class="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl mb-2 hover:border-blue-200 hover:shadow-sm transition-all group">
            <div class="flex items-center gap-3 w-full overflow-hidden">
                <div class="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <span class="material-symbols-outlined text-base">check_circle</span>
                </div>
                <div class="truncate pr-2">
                    <p class="text-sm font-extrabold text-slate-800 truncate">${targetSantri.nama}</p>
                    <div class="flex items-center gap-2 mt-0.5">
                        <span class="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 shadow-sm">${item.waktu}</span>
                    </div>
                </div>
            </div>
            ${btnHapus}
        </div>`;
    }
    container.innerHTML = html;
};

// Fungsi Hapus
window.hapusDataAbsen = function(namaPemilik, indexAsli) {
    if (confirm("Yakin ingin menghapus riwayat absen ini?")) {
        let target = dataSantri.find(s => s.nama === namaPemilik);
        if (target && target.absensi) {
            target.absensi.splice(indexAsli, 1);
            
            db.collection("database_hafalan").doc(target.nama).set({ 
                absensi: target.absensi 
            }, { merge: true })
            .then(() => {
                if (window.santriAktif && window.santriAktif.nama === target.nama) window.santriAktif = target; 
                window.renderRiwayatAbsensi();
            })
            .catch(e => alert("Gagal menghapus data di Cloud."));
        }
    }
};

window.onScanSuccess = function(decodedText) {
    if (html5QrcodeScanner) html5QrcodeScanner.pause(true);
    if (navigator.vibrate) navigator.vibrate(200);
    let divHasil = document.getElementById('hasil');
    
    let namaYangDiScan = decodedText; 
    let qrDataAman = decodedText; 
    
    if (decodedText.startsWith("LOGIN|")) {
        let pecahan = decodedText.split('|');
        if (pecahan.length >= 5) { 
            namaYangDiScan = pecahan[4].trim(); 
            qrDataAman = "QR Terpadu (Aman)"; 
        } 
        else { window.resetScan(divHasil, "❌ QR Login tidak lengkap!", "rose"); return; }
    } else {
        namaYangDiScan = namaYangDiScan.trim();
    }

    let queryScan = namaYangDiScan.toLowerCase();
    let siswaDitemukan = null;
    if (typeof dataSantri !== 'undefined') {
        siswaDitemukan = dataSantri.find(s => 
            (s.nama && s.nama.trim().toLowerCase() === queryScan) || 
            (s.id && s.id.trim().toLowerCase() === queryScan)
        );
    }

    if (!siswaDitemukan) { window.resetScan(divHasil, "❌ Santri tidak terdaftar!", "rose"); return; }

    // OTOMATIS MENGISI KOLOM PENCARIAN SAAT BERHASIL SCAN!
    let inputPencarian = document.getElementById('namaInput');
    if (inputPencarian) inputPencarian.value = siswaDitemukan.nama;

    let dateObj = new Date(); 
    let waktuLengkap = dateObj.toLocaleString("id-ID"); 
    let tanggalHariIni = dateObj.toLocaleDateString("id-ID"); 
    
    let riwayatAbsen = siswaDitemukan.absensi || [];
    if (riwayatAbsen.some(a => a.waktu && a.waktu.includes(tanggalHariIni))) { 
        window.santriAktif = siswaDitemukan; 
        window.renderRiwayatAbsensi();
        window.resetScan(divHasil, `⚠️ ${siswaDitemukan.nama} sudah absen!`, "amber"); 
        return; 
    }

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
        event.preventDefault(); simpanNilaiUmmi();
    }
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js'); });
}

// ==========================================
// 7. SENSOR PENGAMAT LAPISAN POP-UP 
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
                        
                        if (!isHidden && !wasOpen) {
                            elemenModal.dataset.sedangTerbuka = "true";
                            if (!window.isPopStateRunning) {
                                history.pushState({ isModal: true, id: idModal }, "Modal Terbuka", "#modal-" + idModal);
                            }
                        } 
                        else if (isHidden && wasOpen) {
                            elemenModal.dataset.sedangTerbuka = "false";
                            if (!window.isPopStateRunning) {
                                if (history.state && history.state.isModal && history.state.id === idModal) {
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