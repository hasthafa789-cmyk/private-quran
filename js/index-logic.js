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
        // Pencarian langsung (tanpa Enter): Absensi dirender ulang, halaman lain otomatis mencari santri + menyegarkan grafik
        let tmrCari;
        inputCari.addEventListener('input', function() {
            let viewAbsensi = document.getElementById('viewAbsensi');
            if (viewAbsensi && !viewAbsensi.classList.contains('hidden')) { window.renderRiwayatAbsensi(); return; }
            clearTimeout(tmrCari); tmrCari = setTimeout(window.cariSantriLangsung, 500);
        });
        inputCari.addEventListener('keydown', function(e) { if (e.key === 'Enter') window.segarkanGrafikSantri(); });
        // Saat kolom ditinggalkan: lengkapi nama otomatis ("has" -> "Hasnan") agar semua fitur memakai santri yang sama dengan yang tampil
        inputCari.addEventListener('blur', function() {
            const s = window._santriLiveObj, v = inputCari.value.trim().toLowerCase();
            if (s && v && s.nama.toLowerCase() !== v && s.nama.toLowerCase().includes(v) && window.santriAktif && window.santriAktif.nama === s.nama) inputCari.value = s.nama;
        });
    }
});


// Cari santri saat mengetik: meniru tekan Enter, lalu gambar ulang grafik (tanpa pindah halaman)
window.segarkanGrafikSantri = function(santri) {
    [150, 900].forEach(ms => setTimeout(() => {
        if (santri && (!window.santriAktif || window.santriAktif.nama !== santri.nama)) window.santriAktif = santri;
        if (typeof renderProgressChart === 'function') renderProgressChart();
    }, ms));
};
window.cariSantriLangsung = function() {
    const el = document.getElementById('namaInput'), q = el ? el.value.trim().toLowerCase() : '';
    if (!q) { window._santriDicariLangsung = ''; return; }
    if (q.length < 3 || typeof dataSantri === 'undefined') return; // tunggu minimal 3 huruf
    const ada = dataSantri.filter(x => x.nama && x.nama.toLowerCase().includes(q));
    const s = ada.find(x => x.nama.toLowerCase().startsWith(q)) || ada[0];
    if (!s || window._santriDicariLangsung === s.nama) return; // tidak cocok / sudah dimuat -> diam, tanpa popup
    window._santriDicariLangsung = s.nama;
    window._santriLiveObj = s;
    // Isi nama lengkap sesaat agar pencarian lama pasti berhasil (tanpa popup "tidak ditemukan"), lalu kembalikan ketikan Anda
    const asli = el.value, a = el.selectionStart, b = el.selectionEnd, toast = window._toastAsli || (window._toastAsli = window.showToast);
    window.showToast = function() {};
    try {
        el.value = s.nama;
        ['keydown', 'keypress', 'keyup'].forEach(t => el.dispatchEvent(new KeyboardEvent(t, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true })));
    } finally {
        el.value = asli; try { el.setSelectionRange(a, b); } catch (e) {}
        setTimeout(() => { window.showToast = toast; }, 900);
    }
    window.segarkanGrafikSantri(s);
};

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
    divHasil.innerHTML = '<span class="spinner"></span>Menyimpan...'; 
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
    const mi = String(msg).match(/^(❌|✅|⚠️)\s*/), teks = mi ? String(msg).slice(mi[0].length) : msg;
    const ikon = mi ? `<span class="material-symbols-outlined" style="font-size:18px;vertical-align:-4px;margin-right:6px">${{'❌':'error','✅':'check_circle','⚠️':'warning'}[mi[1]]}</span>` : '';
    window.showToast(teks, {emerald:'success', rose:'error', amber:'warning'}[color] || 'info');
    div.innerHTML = ikon + teks; div.className = `text-sm font-bold text-${color}-700 bg-${color}-50 px-6 py-4 rounded-xl border border-${color}-200`;
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

// ==========================================
// 6. UI/UX: TOAST, ESC MODAL, ARIA, BOTTOM NAV
// ==========================================
window.showToast = function(msg, type = 'info', ms = 3000) {
    let box = document.getElementById('toastBox');
    if (!box) { box = document.createElement('div'); box.id = 'toastBox'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    const t = document.createElement('div');
    t.className = 'toast toast-' + type; t.setAttribute('role', 'status'); t.textContent = msg;
    box.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, ms);
};

(function uiUpgrade() {
    // Modal: [id elemen, fungsi penutup]
    const modals = [['modalHasilKuis','tutupHasilKuis'],['modalPilihLevel','tutupModalLevel'],['modalPeringatan','tutupPeringatan'],
                    ['modalPenilaianUmmi','tutupFormNilaiUmmi'],['ummiDetail','closeUmmiDetail'],['suratDetail','closeDetail']];
    const terbuka = el => el && !el.classList.contains('hidden') && getComputedStyle(el).display !== 'none';

    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        for (const [id, fn] of modals) {
            if (terbuka(document.getElementById(id)) && typeof window[fn] === 'function') { window[fn](); break; }
        }
    });

    // Bottom nav (mobile). Ubah daftar ini untuk menambah/menghapus menu.
    const items = [['viewDashboard','home','Beranda'],['viewHafalan','menu_book','Hafalan'],['viewUmmi','school','Ummi'],
                   ['viewLatihan','quiz','Latihan'],['viewAbsensi','qr_code_scanner','Absen']];

    function init() {
        modals.forEach(([id]) => { const el = document.getElementById(id); if (el) { el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true'); } });

        // aria-label otomatis untuk tombol yang hanya berisi ikon
        const label = { logout:'Keluar', close:'Tutup', search:'Cari', arrow_back:'Kembali', menu:'Menu' };
        document.querySelectorAll('button').forEach(b => {
            if (b.getAttribute('aria-label') || b.textContent.replace(/\s|[a-z_]+$/i, '').trim()) return;
            const ic = b.querySelector('.material-symbols-outlined');
            if (ic && label[ic.textContent.trim()]) b.setAttribute('aria-label', label[ic.textContent.trim()]);
        });
        const s = document.getElementById('namaInput'); if (s) s.setAttribute('aria-label', 'Cari santri');

        const nav = document.createElement('nav');
        nav.id = 'bottomNav'; nav.setAttribute('aria-label', 'Navigasi utama');
        items.forEach(([view, icon, text]) => {
            if (!document.getElementById(view)) return;
            const b = document.createElement('button');
            b.dataset.view = view;
            b.innerHTML = `<span class="material-symbols-outlined">${icon}</span>${text}`;
            b.onclick = () => view === 'viewAbsensi' ? window.bukaMenuAbsensi() : window.navigateTo(view);
            nav.appendChild(b);
        });
        document.body.appendChild(nav);

        const sync = () => {
            const aktif = [...document.querySelectorAll('.page-view')].find(v => !v.classList.contains('hidden'));
            nav.querySelectorAll('button').forEach(b => b.classList.toggle('active', !!aktif && b.dataset.view === aktif.id));
        };
        new MutationObserver(sync).observe(document.querySelector('main'), { attributes: true, subtree: true, attributeFilter: ['class'] });
        sync();
    }
    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();


// ==========================================
// 7. ANALISIS PERKEMBANGAN: filter periode + insight (data grafik bersifat kumulatif)
// ==========================================
window.periodeGrafik = (function() { try { const v = localStorage.getItem('periodeGrafik'); return v === '7' || v === '30' ? Number(v) : 'all'; } catch (e) { return 'all'; } })();

const _tglOnly = w => String(w || '').split(',')[0].split(' ')[0].trim();
window.parseTglRiwayat = function(waktu) {
    const t = _tglOnly(waktu);
    let m = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
    m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
};

window.riwayatHarianSantri = function() {
    const src = (typeof santriAktif !== 'undefined' && santriAktif && santriAktif.riwayatHafalan) || [];
    const out = []; let last = '';
    src.forEach(it => { const t = _tglOnly(it.waktu); if (t === last) out[out.length - 1] = it; else { out.push(it); last = t; } });
    return out;
};

window.batasPeriode = function(hari, akhir) {
    const t = akhir || new Date(), b = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    b.setDate(b.getDate() - (hari - 1)); return b;
};

// Dipanggil dari dashboard.js: potong data grafik sesuai periode (titik terakhir sebelum periode dipakai sebagai titik awal)
window.terapkanFilterPeriode = function(harian) {
    const p = window.periodeGrafik;
    if (p === 'all' || !harian.length) return harian;
    const batas = window.batasPeriode(p), tgl = harian.map(it => window.parseTglRiwayat(it.waktu));
    if (tgl.some(d => !d)) return harian;
    const idx = tgl.findIndex(d => d >= batas);
    const dalam = idx === -1 ? [] : harian.slice(idx);
    const awal = (idx === -1 ? harian.length : idx) - 1;
    const hasil = awal >= 0 ? [harian[awal], ...dalam] : dalam;
    return hasil.length ? hasil : harian.slice(-1);
};

window.hitungInsight = function(harian, field, unit, p, hariIni) {
    const seri = harian.map(it => ({ d: window.parseTglRiwayat(it.waktu), v: Number(it[field]) || 0, w: _tglOnly(it.waktu) }));
    const now = seri[seri.length - 1].v, chips = [[`Total: ${now} ${unit}`, 'ci-info', 'flag']];
    if (!seri.every(s => s.d)) return chips;
    const today = new Date(hariIni.getFullYear(), hariIni.getMonth(), hariIni.getDate());
    const sampai = tgl => { let v = 0; seri.forEach(s => { if (s.d <= tgl) v = s.v; }); return v; };
    const tanda = n => (n > 0 ? '+' : '') + n;

    if (p !== 'all') {
        const sb = window.batasPeriode(p, today); sb.setDate(sb.getDate() - 1);
        const ap = new Date(sb); ap.setDate(ap.getDate() - p);
        const gain = now - sampai(sb), prev = sampai(sb) - sampai(ap);
        chips.push([`${tanda(gain)} ${unit} · ${p} hari`, gain > 0 ? 'ci-good' : '', gain < 0 ? 'trending_down' : gain > 0 ? 'trending_up' : 'remove']);
        if (prev > 0) {
            const pct = Math.round((gain - prev) / prev * 100);
            if (pct !== 0) chips.push([`${Math.abs(pct)}% vs ${p} hari lalu`, pct > 0 ? 'ci-good' : '', pct > 0 ? 'arrow_upward' : 'arrow_downward']);
        }
    } else if (seri.length > 1) {
        const d = now - seri[0].v;
        chips.push([`${tanda(d)} sejak ${seri[0].w}`, d > 0 ? 'ci-good' : '', d < 0 ? 'trending_down' : 'trending_up']);
    }

    for (let i = seri.length - 1; i > 0; i--) if (seri[i].v > seri[i - 1].v) {
        const hari = Math.round((today - seri[i].d) / 86400000);
        chips.push([hari <= 0 ? 'Terakhir naik hari ini' : `Terakhir naik ${hari} hari lalu`, '', 'schedule']);
        break;
    }
    return chips;
};

// Fitur laporan hanya untuk Admin & Guru (murid = akses lihat saja)
window.bolehLaporan = function() {
    const r = String(typeof role !== 'undefined' ? role : '').toLowerCase();
    return !!r && r !== 'murid';
};

window.renderPeriodeBar = function() {
    const cv = document.getElementById('progressChart'), grid = cv && cv.closest('.grid');
    if (!grid) return;
    let bar = document.getElementById('periodeBar');
    if (!bar) {
        bar = document.createElement('div'); bar.id = 'periodeBar'; bar.className = 'ci-pills';
        bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Periode analisis'); grid.before(bar);
        [['7', '7 Hari'], ['30', '30 Hari'], ['all', 'Semua']].forEach(([v, t]) => {
            const b = document.createElement('button'); b.textContent = t; b.dataset.p = v;
            b.onclick = () => {
                window.periodeGrafik = v === 'all' ? 'all' : Number(v);
                try { localStorage.setItem('periodeGrafik', v); } catch (e) {}
                if (typeof renderProgressChart === 'function') renderProgressChart();
            };
            bar.appendChild(b);
        });
        const sh = document.createElement('button'); sh.className = 'ci-share'; sh.setAttribute('aria-label', 'Buat laporan PDF');
        sh.innerHTML = '<span class="material-symbols-outlined">picture_as_pdf</span>Laporan PDF'; sh.onclick = () => window.bukaLaporan && window.bukaLaporan(); bar.appendChild(sh);
    }
    bar.querySelectorAll('button[data-p]').forEach(b => { const on = String(window.periodeGrafik) === b.dataset.p; b.classList.toggle('active', on); b.setAttribute('aria-pressed', on); });
    const shb = bar.querySelector('.ci-share'); if (shb) shb.style.display = window.bolehLaporan() ? '' : 'none';
};

// Dipanggil dari dashboard.js setiap grafik selesai dirender
window.renderInsightPerkembangan = function(kosong) {
    const KONF = [['progressChart', 'skor', 'Ayat'], ['ummiChart', 'skorUmmi', 'Hal'], ['hijaiyahChart', 'skorHijaiyah', 'Huruf'], ['tajwidChart', 'skorTajwid', 'Hukum']];
    const harian = kosong ? [] : window.riwayatHarianSantri(), hariIni = new Date();
    KONF.forEach(([id, field, unit]) => {
        const cv = document.getElementById(id); if (!cv || !cv.parentElement) return;
        let box = document.getElementById('insight-' + id);
        if (!box) { box = document.createElement('div'); box.id = 'insight-' + id; box.className = 'ci-box'; cv.parentElement.after(box); }
        if (!harian.length) { box.style.display = 'none'; return; }
        const chips = window.hitungInsight(harian, field, unit, window.periodeGrafik, hariIni);
        box.innerHTML = '';
        chips.forEach(([txt, cls, ico]) => { const s = document.createElement('span'); s.className = 'ci-chip ' + cls; s.innerHTML = `<span class="material-symbols-outlined">${ico}</span>`; s.append(txt); box.appendChild(s); });
        box.style.display = 'flex';
        cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', chips.map(c => c[0]).join(', '));
    });
    const stamp = document.getElementById('chartUpdated');
    if (stamp) stamp.textContent = 'Diperbarui ' + hariIni.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    window.renderPeriodeBar();
};

// ==========================================
// ABSENSI MANUAL (Admin & Guru): target = santri yang diketik di kolom pencarian; guru hanya murid binaannya
// ==========================================
(function absenManual() {
    const peran = () => String(localStorage.getItem('role') || '').toLowerCase();
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const norm = s => String(s == null ? '' : s).trim().toLowerCase();
    const entriHariIni = s => { const h = new Date().toLocaleDateString('id-ID'); return (s.absensi || []).find(a => a.waktu && a.waktu.includes(h)); };
    const inputCari = () => document.getElementById('namaInput');
    let izin = null, izinGagal = false; // izin = daftar nama murid milik guru ini

    if (!document.getElementById('amStyle')) {
        const st = document.createElement('style'); st.id = 'amStyle';
        st.textContent = `.am-tabs{display:flex;gap:6px;padding:4px;background:#f1f5f9;border-radius:14px;width:fit-content;margin:0 4px}
        .am-tab{display:inline-flex;align-items:center;gap:6px;padding:0 16px;min-height:40px;border-radius:11px;font-size:13px;font-weight:700;color:#64748b}
        .am-tab.on{background:#fff;color:#2563eb;box-shadow:0 1px 4px rgba(15,23,42,.12)} .am-tab .material-symbols-outlined{font-size:18px}
        .am-head{width:100%;margin-bottom:14px;text-align:left} .am-head h2{font-size:18px;font-weight:800;color:#1e293b} .am-head p{font-size:12px;color:#64748b;font-weight:600}
        .am-body{width:100%} .am-hint{padding:28px 12px;color:#94a3b8;font-size:13px;font-weight:600;text-align:center}
        .am-target{display:flex;flex-direction:column;align-items:center;gap:6px;padding:20px 16px;border:1px solid #e2e8f0;border-radius:18px;background:#f8fafc;width:100%}
        .am-target.ok{background:#ecfdf5;border-color:#a7f3d0}
        .am-ava{width:56px;height:56px;border-radius:18px;background:linear-gradient(135deg,#2563eb,#6366f1);color:#fff;font-size:22px;font-weight:800;display:flex;align-items:center;justify-content:center}
        .am-tn{font-size:17px;font-weight:800;color:#1e293b;text-align:center} .am-ts{font-size:12px;font-weight:700;color:#64748b} .am-ts.ok{color:#047857}
        .am-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;margin-top:10px;width:100%;min-height:52px;border-radius:14px;font-size:15px;font-weight:800;background:linear-gradient(135deg,#2563eb,#6366f1);color:#fff}
        .am-btn:disabled{background:#d1fae5;color:#047857} .am-btn:not(:disabled):active{transform:scale(.97)}
        .am-chips{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:12px}
        .am-chip{padding:9px 14px;border:1px solid #c7d2fe;background:#eef2ff;color:#4338ca;border-radius:999px;font-size:13px;font-weight:700}
        .am-note{font-size:11px;color:#b45309;font-weight:600;margin-top:12px;text-align:center}`;
        document.head.appendChild(st);
    }

    // Guru: hanya murid dengan guruPembimbing = nama guru. Jika data akun tak bisa dibaca -> jatuh ke dataSantri apa adanya (dan diberi catatan)
    async function muatIzin() {
        if (peran() !== 'guru') return;
        try {
            const snap = await db.collection('users').where('role', '==', 'murid').get();
            if (snap.empty) throw new Error('tidak ada data akun murid');
            const me = norm(localStorage.getItem('nama')), set = new Set();
            snap.forEach(d => { const u = d.data(); if (u && u.nama && norm(u.guruPembimbing) === me) set.add(norm(u.nama)); });
            izin = set;
        } catch (e) { console.warn('Filter murid per guru tidak aktif:', e.message); izin = null; izinGagal = true; }
        render();
    }
    const boleh = s => peran() === 'admin' || izinGagal || (!!izin && izin.has(norm(s.nama)));
    const kandidat = () => {
        const q = norm(inputCari() && inputCari().value); if (!q) return [];
        const semua = (typeof dataSantri !== 'undefined' ? dataSantri : []).filter(s => s && s.nama && boleh(s));
        const persis = semua.filter(s => norm(s.nama) === q);
        return persis.length ? persis : semua.filter(s => norm(s.nama).includes(q));
    };

    function render() {
        const box = document.getElementById('am-body'); if (!box) return;
        const note = document.getElementById('am-note'); if (note) note.textContent = peran() === 'guru' && izinGagal ? 'Filter murid per guru tidak aktif (data akun tidak terbaca).' : '';
        const q = norm(inputCari() && inputCari().value), guru = peran() === 'guru';
        if (guru && izin === null && !izinGagal) { box.innerHTML = '<div class="am-hint">Memuat daftar murid Anda...</div>'; return; }
        if (!q) { box.innerHTML = '<div class="am-hint">Ketik nama santri di kolom pencarian atas, lalu tekan Hadir.</div>'; return; }
        const k = kandidat();
        if (!k.length) { box.innerHTML = `<div class="am-hint">${guru ? 'Tidak ada murid Anda dengan nama itu.' : 'Santri tidak ditemukan.'}</div>`; return; }
        if (k.length > 1) {
            box.innerHTML = `<div class="am-hint" style="padding-bottom:0">${k.length} nama cocok. Pilih salah satu:</div><div class="am-chips">${k.slice(0, 8).map(s => `<button class="am-chip" data-p="${esc(s.nama)}">${esc(s.nama)}</button>`).join('')}</div>`; return;
        }
        const s = k[0], e = entriHariIni(s), jam = e ? (String(e.waktu).split(',')[1] || '').trim() : '';
        box.innerHTML = `<div class="am-target ${e ? 'ok' : ''}"><div class="am-ava">${esc(s.nama.trim().charAt(0).toUpperCase())}</div><div class="am-tn">${esc(s.nama)}</div>` +
            `<div class="am-ts ${e ? 'ok' : ''}">${e ? 'Sudah hadir hari ini' + (jam ? ' - ' + esc(jam) : '') : 'Belum absen hari ini'}</div>` +
            `<button class="am-btn" data-n="${esc(s.nama)}" ${e ? 'disabled' : ''}><span class="material-symbols-outlined" style="font-size:20px">${e ? 'check_circle' : 'how_to_reg'}</span>${e ? 'Sudah hadir' : 'Tandai Hadir'}</button></div>`;
    }

    async function catat(nama) {
        const s = (typeof dataSantri !== 'undefined' ? dataSantri : []).find(x => x.nama === nama);
        if (!s || !boleh(s) || entriHariIni(s)) return; // hanya santri yang boleh & belum absen
        const waktu = new Date().toLocaleString('id-ID'), oleh = localStorage.getItem('nama') || peran(), entri = { waktu, qrData: 'Manual (' + oleh + ')' };
        if (!s.absensi) s.absensi = [];
        s.absensi.push(entri); window.santriAktif = s; render();
        try {
            await db.collection('database_hafalan').doc(s.nama).set({ absensi: s.absensi }, { merge: true });
            if (typeof scriptURLAbsen !== 'undefined') fetch(`${scriptURLAbsen}?nama=${encodeURIComponent(s.nama)}&waktu=${encodeURIComponent(waktu)}&qr_data=${encodeURIComponent(entri.qrData)}`, { method: 'GET', mode: 'no-cors' }).catch(() => {});
            window.showToast('Tersimpan: ' + s.nama, 'success');
            if (typeof window.renderRiwayatAbsensi === 'function') window.renderRiwayatAbsensi();
        } catch (er) {
            s.absensi = s.absensi.filter(x => x !== entri); render(); window.showToast('Gagal menyimpan ke Cloud', 'error');
        }
    }

    function setMode(m) {
        try { localStorage.setItem('absenMode', m); } catch (e) {}
        const grid = document.querySelector('#viewAbsensi .grid'), scan = grid.firstElementChild, kartu = document.getElementById('am-card');
        scan.style.display = m === 'scan' ? '' : 'none'; kartu.style.display = m === 'manual' ? '' : 'none';
        document.querySelectorAll('#am-tabs .am-tab').forEach(b => b.classList.toggle('on', b.dataset.m === m));
        try { if (typeof html5QrcodeScanner !== 'undefined' && html5QrcodeScanner) m === 'manual' ? html5QrcodeScanner.pause(true) : html5QrcodeScanner.resume(); } catch (e) {}
        if (m === 'manual') { render(); const i = inputCari(); if (i) i.focus(); }
    }

    function bangun() {
        const view = document.getElementById('viewAbsensi'), grid = view && view.querySelector('.grid');
        if (!grid || document.getElementById('am-card') || !['admin', 'guru'].includes(peran())) return;
        const scan = grid.firstElementChild, kartu = document.createElement('div');
        kartu.id = 'am-card'; kartu.className = scan.className; kartu.style.display = 'none';
        kartu.innerHTML = `<div class="am-head"><h2>Absen Manual</h2><p>Hanya santri yang namanya ada di kolom pencarian yang diabsen</p></div><div id="am-body" class="am-body"></div><p id="am-note" class="am-note"></p>`;
        scan.after(kartu);
        const tabs = document.createElement('div'); tabs.id = 'am-tabs'; tabs.className = 'am-tabs'; tabs.setAttribute('role', 'tablist');
        tabs.innerHTML = `<button class="am-tab on" data-m="scan"><span class="material-symbols-outlined">qr_code_scanner</span>Scan QR</button><button class="am-tab" data-m="manual"><span class="material-symbols-outlined">touch_app</span>Manual</button>`;
        grid.before(tabs);
        tabs.addEventListener('click', e => { const b = e.target.closest('.am-tab'); if (b) setMode(b.dataset.m); });
        kartu.addEventListener('click', e => {
            const p = e.target.closest('.am-chip'), b = e.target.closest('.am-btn');
            if (p) { const i = inputCari(); if (i) { i.value = p.dataset.p; i.dispatchEvent(new Event('input', { bubbles: true })); render(); } }
            else if (b && !b.disabled) catat(b.dataset.n);
        });
        if (inputCari()) inputCari().addEventListener('input', render);
        muatIzin();
        let simpan = 'scan'; try { simpan = localStorage.getItem('absenMode') || 'scan'; } catch (e) {}
        if (simpan === 'manual') setMode('manual');
    }

    const asli = window.renderRiwayatAbsensi;
    if (typeof asli === 'function') window.renderRiwayatAbsensi = function() { const h = asli.apply(this, arguments); render(); return h; };
    bangun(); document.addEventListener('DOMContentLoaded', bangun);
})();
