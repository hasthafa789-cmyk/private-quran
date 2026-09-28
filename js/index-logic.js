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
// 2. ROUTING DASAR & OVERRIDE NAVIGASI (ANTI-BOCOR)
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    history.replaceState({ level: 'viewDashboard' }, "Dashboard", "#dashboard");
    
    // Sensor Pencarian
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

// [PERBAIKAN SUPER]: Menambal fungsi bawaan secara paksa agar tidak ada halaman yang tumpang tindih
const fungsiAsliNavigateTo = window.navigateTo;
window.navigateTo = function(viewId) {
    // 1. TUTUP PAKSA SEMUA HALAMAN (Menambal array yang kurang di navigation.js)
    document.querySelectorAll('.page-view').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove("animate-entry");
    });

    // 2. Catat Sejarah URL
    if (viewId !== 'viewDashboard') {
        history.pushState({ level: viewId }, viewId, "#" + viewId);
    } else {
        history.pushState({ level: 'viewDashboard' }, "Dashboard", "#dashboard");
    }

    // 3. Jalankan fungsi spesifik dari sistem lama
    if (typeof fungsiAsliNavigateTo === 'function') {
        fungsiAsliNavigateTo(viewId);
    }

    // 4. Pastikan target benar-benar terbuka
    const target = document.getElementById(viewId);
    if (target) {
        target.classList.remove("hidden");
        setTimeout(() => target.classList.add("animate-entry"), 10); 
    }
};

window.bukaHalamanJuz = function(nomorJuz) {
    history.pushState({ level: 'subPageDetailSuratJuz' }, 'Surat', "#subPageDetailSuratJuz"); 
    document.getElementById('subPageDaftarJuz').classList.add('hidden');
    document.getElementById('subPageDetailSuratJuz').classList.remove('hidden');
    document.getElementById('txtJudulHalamanJuz').innerText = "Daftar Surat - Juz " + nomorJuz;
    if(typeof renderSuratBerdasarkanJuz === "function") renderSuratBerdasarkanJuz(nomorJuz);
};

window.kembaliKeDaftarJuz = function() { history.back(); };

window.bukaSubMenuPenilaian = function(tipe) {
    document.getElementById('subPageMenuPenilaian').classList.add('hidden');
    if (tipe === 'hijaiyah') {
        history.pushState({ level: 'subPageDetailHijaiyah' }, 'Hijaiyah', "#subPageDetailHijaiyah"); 
        document.getElementById('subPageDetailHijaiyah').classList.remove('hidden');
    } else if (tipe === 'tajwid') {
        history.pushState({ level: 'subPageDetailTajwid' }, 'Tajwid', "#subPageDetailTajwid"); 
        document.getElementById('subPageDetailTajwid').classList.remove('hidden');
    }
};

window.kembaliKeMenuPenilaian = function() { history.back(); };

// ==========================================
// 4. DETEKSI AKSI BACK (ANTI-FREEZE)
// ==========================================
window.isPopStateRunning = false;

window.addEventListener('popstate', function(event) {
    window.isPopStateRunning = true;
    
    const modalsLayer1 = ['suratDetail', 'ummiDetail']; 
    const modalsLayer2 = ['modalPenilaianUmmi', 'modalPeringatan', 'modalPilihLevel'];

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
        } else if (modalsLayer2.includes(targetModal)) {
            document.getElementById(targetModal).classList.remove('hidden');
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
        }else if (stateSekarang === 'subPageAreaKuis') {
            document.getElementById('viewLatihan').classList.remove('hidden');
            document.getElementById('subPageMenuLatihan').classList.add('hidden');
            document.getElementById('subPageAreaKuis').classList.remove('hidden');
        }
        else if (stateSekarang === 'viewLatihan') {
            document.getElementById('viewLatihan').classList.remove('hidden');
            document.getElementById('subPageMenuLatihan').classList.remove('hidden');
            document.getElementById('subPageAreaKuis').classList.add('hidden');
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
    history.pushState({ level: 'viewAbsensi' }, 'Absensi', "#viewAbsensi");
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
    let currentRole = (localStorage.getItem("role") || "murid").toLowerCase();
    let targetSantri = null;

    if (currentRole === "murid" || currentRole === "santri" || currentRole === "siswa") {
        let namaAkunLogin = localStorage.getItem("nama") || localStorage.getItem("username") || "";
        if (!namaAkunLogin) {
            let elemenNama = document.getElementById('namaSantri');
            if (elemenNama && elemenNama.innerText !== "-") namaAkunLogin = elemenNama.innerText.replace('!', '').trim();
        }
        if (typeof dataSantri !== 'undefined' && namaAkunLogin) {
            targetSantri = dataSantri.find(s => s.nama && s.nama.trim().toLowerCase() === namaAkunLogin.trim().toLowerCase());
        }
    } 
    else {
        let inputPencarian = document.getElementById('namaInput');
        let namaDicari = inputPencarian ? inputPencarian.value.trim().toLowerCase() : "";
        if (namaDicari !== "" && typeof dataSantri !== 'undefined') {
            targetSantri = dataSantri.find(s => s.nama && s.nama.toLowerCase().includes(namaDicari));
            if (targetSantri) window.santriAktif = targetSantri; 
        }
        if (!targetSantri && window.santriAktif) targetSantri = window.santriAktif;
    }

    if (!targetSantri || !targetSantri.absensi || targetSantri.absensi.length === 0) {
        let inputPencarian = document.getElementById('namaInput');
        let sedangMencari = (inputPencarian && inputPencarian.value.trim() !== "");
        let pesanKosong = (currentRole === "murid" || currentRole === "santri" || currentRole === "siswa")
            ? "Kamu belum memiliki riwayat absensi."
            : sedangMencari ? "Santri tersebut belum memiliki riwayat absen." : "Ketik nama santri di atas atau scan QR untuk melihat log.";
            
        container.innerHTML = `
        <div class="flex flex-col items-center justify-center opacity-50 mt-10">
            <span class="material-symbols-outlined text-4xl mb-2 text-slate-300">inbox</span>
            <p class="text-xs font-semibold text-center text-slate-400 px-4">${pesanKosong}</p>
        </div>`; 
        return;
    }

    const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    const esc = (typeof escapeHtml === 'function') ? escapeHtml : (x => String(x));
    const bisaHapus = (currentRole === "admin" || currentRole === "guru");

    // Parse "28/9/2026, 07.45.12" (format bisa beda per perangkat) -> tanggal + jam
    const daftar = targetSantri.absensi.map((item, idx) => {
        const w = String(item.waktu || '');
        const tgl = w.split(',')[0].split(' ')[0].trim();
        const jam = w.replace(tgl, '').replace(/^[,\s]+/, '').replace(/\./g, ':').slice(0, 5);
        const m = tgl.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        return { idx, jam, d: m ? new Date(+m[3], +m[2] - 1, +m[1]) : null };
    }).reverse(); // terbaru di atas

    // Kelompokkan per bulan
    const grup = []; const peta = {};
    daftar.forEach(a => {
        const key = a.d ? `${a.d.getFullYear()}-${a.d.getMonth()}` : 'lain';
        if (!peta[key]) { peta[key] = { judul: a.d ? `${BULAN[a.d.getMonth()]} ${a.d.getFullYear()}` : 'Lainnya', items: [] }; grup.push(peta[key]); }
        peta[key].items.push(a);
    });

    const sekarang = new Date();
    const bulanIni = daftar.filter(a => a.d && a.d.getMonth() === sekarang.getMonth() && a.d.getFullYear() === sekarang.getFullYear()).length;

    let html = `
    <div class="flex items-center justify-between gap-3 mb-4 p-3.5 bg-blue-50 border border-blue-100 rounded-2xl">
        <p class="text-sm font-extrabold text-slate-800 truncate">${esc(targetSantri.nama)}</p>
        <div class="flex gap-2 flex-shrink-0 text-center">
            <div><p class="text-lg font-extrabold text-blue-700 leading-none">${daftar.length}</p><p class="text-[11px] font-semibold text-slate-500">Total hadir</p></div>
            <div class="pl-2 border-l border-blue-200"><p class="text-lg font-extrabold text-blue-700 leading-none">${bulanIni}</p><p class="text-[11px] font-semibold text-slate-500">Bulan ini</p></div>
        </div>
    </div>`;

    grup.forEach(g => {
        html += `<h4 class="sticky top-0 bg-white/95 backdrop-blur py-1.5 mb-1.5 text-xs font-extrabold text-slate-500 uppercase tracking-wide">${g.judul} · ${g.items.length} hadir</h4>`;
        g.items.forEach(a => {
            const label = a.d ? `${HARI[a.d.getDay()]}, ${a.d.getDate()} ${BULAN[a.d.getMonth()].slice(0, 3)}` : 'Tanggal tidak dikenal';
            const btn = bisaHapus
                ? `<button type="button" data-hapus="${a.idx}" data-nama="${esc(targetSantri.nama)}" aria-label="Hapus absen ${label}" class="w-11 h-11 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition active:scale-90 flex-shrink-0"><span class="material-symbols-outlined text-lg">delete</span></button>`
                : '';
            html += `
            <div class="flex items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl mb-2">
                <div class="flex items-center gap-3 min-w-0">
                    <span class="material-symbols-outlined text-emerald-500 flex-shrink-0">check_circle</span>
                    <p class="text-sm font-bold text-slate-800 truncate">${label}</p>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                    <span class="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">${a.jam || '-'}</span>
                    ${btn}
                </div>
            </div>`;
        });
    });
    container.innerHTML = html;

    if (!container.dataset.bound) {
        container.dataset.bound = "1";
        container.addEventListener('click', e => {
            const b = e.target.closest('[data-hapus]');
            if (b) window.hapusDataAbsen(b.dataset.nama, parseInt(b.dataset.hapus, 10));
        });
    }
};

window.hapusDataAbsen = async function(namaPemilik, indexAsli) {
    const yakin = await tampilkanKonfirmasi("Hapus riwayat absen ini?", { ya: "Hapus", bahaya: true });
    if (!yakin) return;
    const target = dataSantri.find(s => s.nama === namaPemilik);
    if (!target || !target.absensi) return;
    const cadangan = target.absensi.slice();
    target.absensi.splice(indexAsli, 1);
    try {
        await db.collection("database_hafalan").doc(target.nama).set({ absensi: target.absensi }, { merge: true });
        if (window.santriAktif && window.santriAktif.nama === target.nama) window.santriAktif = target;
        window.renderRiwayatAbsensi();
        showToast("Riwayat absen dihapus", "sukses");
    } catch (e) {
        target.absensi = cadangan; // kembalikan jika gagal
        window.renderRiwayatAbsensi();
        showToast("Gagal menghapus data di Cloud", "error");
    }
};

window.onScanSuccess = function(decodedText) {
    if (html5QrcodeScanner) html5QrcodeScanner.pause(true);
    if (navigator.vibrate) navigator.vibrate(200);
    let divHasil = document.getElementById('hasil');
    
    let namaYangDiScan = decodedText, qrDataAman = decodedText; 
    
    if (decodedText.startsWith("LOGIN|")) {
        let pecahan = decodedText.split('|');
        if (pecahan.length >= 5) { namaYangDiScan = pecahan[4].trim(); qrDataAman = "QR Terpadu (Aman)"; } 
        else { window.resetScan(divHasil, "❌ QR Login tidak lengkap!", "rose"); return; }
    } else { namaYangDiScan = namaYangDiScan.trim(); }

    let queryScan = namaYangDiScan.toLowerCase();
    let siswaDitemukan = (typeof dataSantri !== 'undefined') ? dataSantri.find(s => (s.nama && s.nama.trim().toLowerCase() === queryScan) || (s.id && s.id.trim().toLowerCase() === queryScan)) : null;
    if (!siswaDitemukan) { window.resetScan(divHasil, "❌ Santri tidak terdaftar!", "rose"); return; }

    let inputPencarian = document.getElementById('namaInput');
    if (inputPencarian) inputPencarian.value = siswaDitemukan.nama;

    let dateObj = new Date(); 
    let waktuLengkap = dateObj.toLocaleString("id-ID"); 
    let tanggalHariIni = dateObj.toLocaleDateString("id-ID"); 
    
    let riwayatAbsen = siswaDitemukan.absensi || [];
    if (riwayatAbsen.some(a => a.waktu && a.waktu.includes(tanggalHariIni))) { 
        window.santriAktif = siswaDitemukan; window.renderRiwayatAbsensi();
        window.resetScan(divHasil, `⚠️ ${siswaDitemukan.nama} sudah absen!`, "amber"); return; 
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

document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && event.target.id === 'inputNilaiUmmi' && typeof simpanNilaiUmmi === "function") {
        event.preventDefault(); simpanNilaiUmmi();
    }
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js'); });
}

window.addEventListener('DOMContentLoaded', () => {
    const daftarModal = ['suratDetail', 'ummiDetail', 'modalPenilaianUmmi', 'modalPilihLevel'];
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
                            if (!window.isPopStateRunning) { history.pushState({ isModal: true, id: idModal }, "Modal", "#modal-" + idModal); }
                        } else if (isHidden && wasOpen) {
                            elemenModal.dataset.sedangTerbuka = "false";
                            if (!window.isPopStateRunning && history.state && history.state.isModal && history.state.id === idModal) { history.back(); }
                        }
                    }
                });
            });
            pengamat.observe(elemenModal, { attributes: true });
        }
    });
});