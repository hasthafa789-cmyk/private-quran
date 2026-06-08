// ==========================================
// CONFIGURATION GOOGLE SPREADSHEET
// ==========================================
// URL Web App dari Google Apps Script Anda
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbwaUxlHpQJBN4pS9MbHCCy_IAhhqXxaMAYARPKJVyv7A6w1QMk04uSjZ_iYB9y7NNr1/exec";

// Memuat data dari localStorage terlebih dahulu sebagai cache awal agar UI langsung berjalan lancar
let dataSantri = JSON.parse(localStorage.getItem("dataSantri")) || [];
let santriAktif = null;
let currentView = 'viewDashboard'; 
let currentJuzAkses = null; // Menyimpan Juz yang sedang dibuka

const role = localStorage.getItem("role");
const namaLogin = localStorage.getItem("nama");

// Proteksi Halaman
if (localStorage.getItem("login") !== "true") {
    window.location.href = "login.html";
}

// ==========================================
// DATA REFERENSI (HIJAIYAH, TAJWID, SURAT)
// ==========================================
const daftarHijaiyah = ["Alif (ا)", "Ba (ب)", "Ta (ت)", "Tsa (ث)", "Jim (ج)", "Ha (ح)", "Kho (خ)", "Dal (د)", "Dzal (ذ)", "Ro (ر)", "Zai (ز)", "Sin (س)", "Syin (ش)", "Shod (ص)", "Dhod (ض)", "Tho (ط)", "Zho (ظ)", "Ain (ع)", "Gho (غ)", "Fa (ف)", "Qof (ق)", "Kaf (ك)", "Lam (ل)", "Mim (م)", "Nun (ن)", "Wawu (و)", "Ha' (هـ)", "Ya (ي)"];

const klasifikasiTajwid = [
    { kategori: "1. Hukum Nun Sukun & Tanwin", items: [{ id: "ns_izhar", nama: "Idzhar Halqi" }, { id: "ns_idg_bi", nama: "Idgham Bighunnah" }, { id: "ns_idg_bila", nama: "Idgham Bilaghunnah" }, { id: "ns_iqlab", nama: "Iqlab" }, { id: "ns_ikhfa", nama: "Ikhfa Haqiqi" }] },
    { kategori: "2. Hukum Mim Sukun", items: [{ id: "ms_ikhfa", nama: "Ikhfa Syafawi" }, { id: "ms_idgham", nama: "Idgham Mimi" }, { id: "ms_izhar", nama: "Idzhar Syafawi" }] },
    { kategori: "3. Hukum Mad (Panjang Bacaan)", items: [{ id: "mad_thabii", nama: "Mad Thabi'i" }, { id: "mad_wajib", nama: "Mad Wajib Muttasil" }, { id: "mad_jaiz", nama: "Mad Jaiz Munfasil" }, { id: "mad_arid", nama: "Mad 'Arid Lissukun" }, { id: "mad_iwadl", nama: "Mad Iwadl" }, { id: "mad_shilah_qashirah", nama: "Mad Shilah Qashirah" }, { id: "mad_shilah_thawilah", nama: "Mad Shilah Thawilah" }, { id: "mad_badal", nama: "Mad Badal" }, { id: "mad_tamkin", nama: "Mad Tamkin" }, { id: "mad_lin", nama: "Mad Lin" }, { id: "mad_lazim_mutsaqal_kalimi", nama: "Mad Lazim Mutsaqal Kalimi" }, { id: "mad_lazim_mukhoffaf_kalimi", nama: "Mad Lazim Mukhoffaf Kalimi" }, { id: "mad_lazim_mutsaqol_harfi", nama: "Mad Lazim Mutsaqol Harfi" }, { id: "mad_lazim_mukhoffaf_harfi", nama: "Mad Lazim Mukhoffaf Harfi" }, { id: "mad_farq", nama: "Mad Farq" }] },
    { kategori: "4. Sifat & Hukum Huruf Utama", items: [{ id: "sif_qalqalah", nama: "Qalqalah (Sughra/Kubra)" }, { id: "sif_ghunnah", nama: "Ghunnah Musyaddadah" }, { id: "sif_tafkhim", nama: "Tafkhim & Tarqiq" }] },
    { kategori: "5. Hukum Alif Lam", items: [{ id: "al_qomariyah", nama: "Alif Lam Qomariyah" }, { id: "al_syamsiah", nama: "Alif Lam Syamsiah" }] },
    { kategori: "6. Hukum Idgham", items: [{ id: "idg_mutamasilain", nama: "Idgham Mutamasilain" }, { id: "idg_mutajanisain", nama: "Idgham Mutajanisain" }, { id: "idg_mutaqaribain", nama: "Idgham Mutaqaribain" }] },
    { kategori: "7. Bacaan Gharib", items: [{ id: "gh_saktah", nama: "Saktah" }, { id: "gh_isymam", nama: "Isymam" }, { id: "gh_imalah", nama: "Imalah" }, { id: "gh_tashil", nama: "Tashil" }, { id: "gh_naql", nama: "Naql" }, { id: "gh_shad_sin", nama: "Shad dibaca Sin" }] },
    { kategori: "8. Tanda Waqaf", items: [{ id: "wq_lazim", nama: "Waqaf Lazim (م)" }, { id: "wq_mutlaq", nama: "Waqaf Mutlaq (ط)" }, { id: "wq_jaiz", nama: "Waqaf Jaiz (ج)" }, { id: "wq_washlu_aula", nama: "Waqaf Al-Washlu Aula (صلى)" }, { id: "wq_waqfu_aula", nama: "Waqaf Al-Waqfu Aula (قلى)" }, { id: "wq_la_washal", nama: "Waqaf La Washal (لا)" }, { id: "wq_muanaqah", nama: "Waqaf Mu'anaqah (∴)" }, { id: "wq_saktah", nama: "Saktah (س)" }] }
];

const databaseJuz = {
    30: [{ nama: "An-Naba", ayat: 40 }, { nama: "An-Nazi'at", ayat: 46 }, { nama: "Abasa", ayat: 42 }, { nama: "At-Takwir", ayat: 29 }, { nama: "Al-Infitar", ayat: 19 }, { nama: "Al-Mutaffifin", ayat: 36 }, { nama: "Al-Inshiqaq", ayat: 25 }, { nama: "Al-Buruj", ayat: 22 }, { nama: "At-Tariq", ayat: 17 }, { nama: "Al-A'la", ayat: 19 }, { nama: "Al-Ghashiyah", ayat: 26 }, { nama: "Al-Fajr", ayat: 30 }, { nama: "Al-Balad", ayat: 20 }, { nama: "Ash-Shams", ayat: 15 }, { nama: "Al-Lail", ayat: 21 }, { nama: "Ad-Duha", ayat: 11 }, { nama: "Al-Inshirah", ayat: 8 }, { nama: "At-Tin", ayat: 8 }, { nama: "Al-Alaq", ayat: 19 }, { nama: "Al-Qadr", ayat: 5 }, { nama: "Al-Bayyinah", ayat: 8 }, { nama: "Az-Zalzalah", ayat: 8 }, { nama: "Al-Adiyat", ayat: 11 }, { nama: "Al-Qari'ah", ayat: 11 }, { nama: "At-Takathur", ayat: 8 }, { nama: "Al-Asr", ayat: 3 }, { nama: "Al-Humazah", ayat: 9 }, { nama: "Al-Fil", ayat: 5 }, { nama: "Quraysh", ayat: 4 }, { nama: "Al-Ma'un", ayat: 7 }, { nama: "Al-Kawthar", ayat: 3 }, { nama: "Al-Kafirun", ayat: 6 }, { nama: "An-Nasr", ayat: 3 }, { nama: "Al-Lahab", ayat: 5 }, { nama: "Al-Ikhlas", ayat: 4 }, { nama: "Al-Falaq", ayat: 5 }, { nama: "An-Nas", ayat: 6 }],
    29: [{ nama: "Al-Mulk", ayat: 30 }, { nama: "Al-Qalam", ayat: 52 }, { nama: "Al-Haqqah", ayat: 52 }, { nama: "Al-Ma'arij", ayat: 44 }, { nama: "Nuh", ayat: 28 }, { nama: "Al-Jinn", ayat: 28 }, { nama: "Al-Muzzammil", ayat: 20 }, { nama: "Al-Muddaththir", ayat: 56 }, { nama: "Al-Qiyamah", ayat: 40 }, { nama: "Al-Insan", ayat: 31 }, { nama: "Al-Mursalat", ayat: 50 }],
    28: [{ nama: "Al-Mujadilah", ayat: 22 }, { nama: "Al-Hashr", ayat: 24 }, { nama: "Al-Mumtahanah", ayat: 13 }, { nama: "As-Saff", ayat: 14 }, { nama: "Al-Jumu'ah", ayat: 11 }, { nama: "Al-Munafiqun", ayat: 11 }, { nama: "At-Taghabun", ayat: 18 }, { nama: "At-Talaq", ayat: 12 }, { nama: "At-Tahrim", ayat: 12 }],
    1: [{ nama: "Al-Fatihah", ayat: 7 }, { nama: "Al-Baqarah (Ayat 1-141)", ayat: 141 }]
};

// ==========================================
// MUTIARA HADITS DINAMIS (ACAK)
// ==========================================
const kumpulanHadits = [
    { teks: "Sebaik-baik kalian adalah orang yang mempelajari Al-Qur'an dan mengajarkannya.", riwayat: "HR. Bukhari" },
    { teks: "Bacalah Al-Qur'an, karena sesungguhnya ia akan datang pada hari kiamat memberikan syafaat bagi pembacanya.", riwayat: "HR. Muslim" },
    { teks: "Barangsiapa membaca satu huruf dari Kitabullah, maka baginya satu kebaikan. Dan satu kebaikan itu dilipatgandakan menjadi sepuluh kebaikan.", riwayat: "HR. Tirmidzi" },
    { teks: "Orang yang mahir membaca Al-Qur'an kelak akan bersama para malaikat yang mulia lagi taat.", riwayat: "HR. Bukhari & Muslim" },
    { teks: "Tidaklah berkumpul suatu kaum di salah satu rumah Allah (masjid) membaca Kitabullah dan saling mempelajarinya, melainkan akan turun kepada mereka ketenangan.", riwayat: "HR. Muslim" }
];

function tampilkanHaditsAcak() {
    // Mencari elemen berdasarkan Tag tanpa memerlukan penambahan ID di HTML
    const teksEl = document.querySelector("blockquote");
    if (!teksEl) return;

    // Mencari elemen paragraf (riwayat) yang berada setelah blockquote
    let riwayatEl = teksEl.nextElementSibling;
    if (riwayatEl && riwayatEl.tagName === 'DIV') {
        riwayatEl = riwayatEl.nextElementSibling;
    }
    
    if (teksEl && riwayatEl && riwayatEl.tagName === 'P') {
        const indexAcak = Math.floor(Math.random() * kumpulanHadits.length);
        const haditsTerpilih = kumpulanHadits[indexAcak];
        teksEl.innerText = `"${haditsTerpilih.teks}"`;
        riwayatEl.innerText = haditsTerpilih.riwayat;
    }
}


// ==========================================
// INIT APP
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
    await sinkronisasiDataOnline(); 
    initGreeting();
    initUser(); 
    updateLiveDashboardStats();
    tampilkanHaditsAcak(); // Menjalankan hadits acak saat aplikasi dimuat
});

function initGreeting() {
    const jam = new Date().getHours();
    let ucapan = "Selamat Malam"; let iconName = "nights_stay";
    if (jam >= 4 && jam < 10) { ucapan = "Selamat Pagi"; iconName = "sunny"; } 
    else if (jam >= 10 && jam < 15) { ucapan = "Selamat Siang"; iconName = "wb_sunny"; } 
    else if (jam >= 15 && jam < 18) { ucapan = "Selamat Sore"; iconName = "partly_cloudy_day"; }

    const el = document.getElementById("txtGreeting");
    if (el) {
        el.innerHTML = `<span class="flex items-center justify-center gap-1.5"><span class="material-symbols-outlined text-sm leading-none">${iconName}</span>${ucapan}</span>`;
    }
}

function initUser() {
    if (dataSantri.length === 0) return;
    if (role === "murid") {
       santriAktif = dataSantri.find(s => s.nama.toLowerCase() === namaLogin.toLowerCase());
       if (!santriAktif) {
           santriAktif = { id: Date.now(), nama: namaLogin, progress: {}, huruf: {}, tajwid: {} };
           dataSantri.push(santriAktif);
           save(); 
       }
       const input = document.getElementById("namaInput");
       if (input) { input.value = namaLogin; input.disabled = true; }
       const namaEl = document.getElementById("namaSantri");
       if (namaEl) namaEl.innerText = namaLogin;
    }
}

function setSantriAktif() {
    if (role === "murid") return;
    const nama = document.getElementById("namaInput").value.trim();
    
    if (!nama) {
        santriAktif = null;
        document.getElementById("namaSantri").innerText = "-";
        updateLiveDashboardStats();
        return;
    }

    let found = dataSantri.find(s => s.nama.toLowerCase() === nama.toLowerCase());
    if (!found) {
        found = { id: Date.now(), nama, progress: {}, huruf: {}, tajwid: {} };
        dataSantri.push(found);
    }
    santriAktif = found;
    document.getElementById("namaSantri").innerText = found.nama;
    save();
    
    updateLiveDashboardStats();
    if (currentView === 'viewHafalan' && currentJuzAkses) renderSuratBerdasarkanJuz(currentJuzAkses);
    if (currentView === 'viewPenilaian') renderPenilaianModul();
}

// ==========================================
// NAVIGASI UTAMA & SUB-HALAMAN
// ==========================================
function navigateTo(viewId) {
    currentView = viewId;
    const views = ["viewDashboard", "viewHafalan", "viewPenilaian"];

    // 1. Sembunyikan semua view & Reset animasi
    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add("hidden");
            el.classList.remove("animate-entry");
        }
    });

    // 2. Reset Sub-Pages untuk Hafalan agar selalu mulai dari daftar Juz
    if(viewId === 'viewHafalan') {
        document.getElementById('subPageDaftarJuz').classList.remove('hidden');
        document.getElementById('subPageDetailSuratJuz').classList.add('hidden');
    }

    // 3. Reset Sub-Pages untuk Penilaian agar selalu mulai dari Menu Utama
    if(viewId === 'viewPenilaian') {
        document.getElementById('subPageMenuPenilaian').classList.remove('hidden');
        document.getElementById('subPageDetailHijaiyah').classList.add('hidden');
        document.getElementById('subPageDetailTajwid').classList.add('hidden');
        renderPenilaianModul();
    }
    
    // 4. Update Hadits & Stats tiap kali balik ke Dashboard
    if(viewId === 'viewDashboard') {
        tampilkanHaditsAcak();
        updateLiveDashboardStats();
    }

    // 5. Tampilkan Target View dengan delay untuk re-trigger animasi CSS
    const target = document.getElementById(viewId);
    if (target) {
        target.classList.remove("hidden");
        setTimeout(() => target.classList.add("animate-entry"), 10); 
    }
}

// ==========================================
// STATISTIK DASHBOARD
// ==========================================
function updateLiveDashboardStats() {
    let totalSuratSistem = 0; let totalSuratSelesai = 0;
    
    Object.keys(databaseJuz).forEach(juzNum => {
        databaseJuz[juzNum].forEach((surat, sIdx) => {
            totalSuratSistem++; 
            const keyProgres = `juz${juzNum}_surat${sIdx}`;
            const progressSurat = santriAktif?.progress?.[keyProgres];
            if (progressSurat && Array.isArray(progressSurat)) {
                if (progressSurat.filter(Boolean).length === surat.ayat) totalSuratSelesai++;
            }
        });
    });

    let totalLulusH = 0;
    daftarHijaiyah.forEach((_, idx) => {
        if(parseInt(santriAktif?.huruf?.[`h_${idx}`] || "0") === 5) totalLulusH++;
    });

    let totalFasihT = 0; let totalItemTajwid = 0;
    klasifikasiTajwid.forEach(k => {
        k.items.forEach(item => {
            totalItemTajwid++;
            if(parseInt(santriAktif?.tajwid?.[item.id] || "0") === 5) totalFasihT++;
        });
    });

    const persenHafalan = totalSuratSistem > 0 ? Math.round((totalSuratSelesai / totalSuratSistem) * 100) : 0;
    const persenHijaiyah = Math.round((totalLulusH / 28) * 100);
    const persenTajwid = totalItemTajwid > 0 ? Math.round((totalFasihT / totalItemTajwid) * 100) : 0;

    const elHafalan = document.getElementById("totalSelesaiAyat");
    const elHuruf = document.getElementById("totalLulusHijaiyah");
    const elTajwid = document.getElementById("totalFasihTajwid");

    if (elHafalan) elHafalan.innerText = totalSuratSelesai; 
    if (elHuruf) elHuruf.innerText = `${totalLulusH} / 28`;
    if (elTajwid) elTajwid.innerText = `${totalFasihT} / ${totalItemTajwid}`;

    const cHafalan = document.getElementById("statCircleHafalan");
    const cHuruf = document.getElementById("statCircleHijaiyah");
    const cTajwid = document.getElementById("statCircleTajwid");

    if (cHafalan) cHafalan.innerHTML = circularProgress(persenHafalan, "#3b82f6");
    if (cHuruf) cHuruf.innerHTML = circularProgress(persenHijaiyah, "#10b981");
    if (cTajwid) cTajwid.innerHTML = circularProgress(persenTajwid, "#6366f1");
}

// ==========================================
// MODUL HAFALAN (RENDER SURAT & AYAT)
// ==========================================
function renderSuratBerdasarkanJuz(num) {
    currentJuzAkses = num;
    const grid = document.getElementById("containerListSuratJuz");
    if (!grid) return;
    grid.innerHTML = "";
    
    const daftarSurat = databaseJuz[num];

    if (!daftarSurat || daftarSurat.length === 0) {
        grid.innerHTML = `<div class="col-span-full p-8 text-center text-slate-500 font-bold bg-slate-50 rounded-2xl border border-slate-100">Data surat untuk Juz ${num} belum tersedia.</div>`;
        return;
    }

    daftarSurat.forEach((s, i) => {
        const total = s.ayat;
        const keyProgres = `juz${num}_surat${i}`;
        const progress = santriAktif?.progress?.[keyProgres] || Array(total).fill(false);
        const done = progress.filter(Boolean).length;
        const persen = Math.round((done / total) * 100);

        let color = "#ef4444"; let bgLight = "bg-white";
        if (persen >= 50) color = "#f59e0b";
        if (persen >= 80) color = "#3b82f6";
        if (persen === 100) bgLight = "bg-blue-50/50 border-blue-200";

        grid.innerHTML += `
        <div onclick="openSurat(${num}, ${i})" class="flex items-center gap-3 p-4 rounded-2xl border border-slate-100 cursor-pointer ${bgLight} hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
            <div class="flex-shrink-0 group-hover:scale-105 transition-transform">${circularProgress(persen, color)}</div>
            <div>
                <h4 class="font-extrabold text-slate-800 text-sm tracking-tight group-hover:text-blue-700 transition-colors">${s.nama}</h4>
                <span class="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md mt-1 inline-block">${s.ayat} Ayat</span>
            </div>
        </div>`;
    });
}

function openSurat(juzNum, suratIndex) {
    if (!santriAktif) return alert("Pilih atau masukkan nama santri terlebih dahulu di kolom pencarian atas!");
    
    document.body.style.overflow = 'hidden'; 
    document.getElementById("backdropDetail").classList.remove("hidden");
    document.getElementById("suratDetail").classList.remove("hidden");
    
    const surat = databaseJuz[juzNum][suratIndex];
    document.getElementById("judulSurat").innerText = `${surat.nama} (${surat.ayat} Ayat) - Juz ${juzNum}`;
    renderAyat(juzNum, suratIndex);
}

function renderAyat(juzNum, suratIndex) {
    const container = document.getElementById("ayatList");
    if (!container) return; container.innerHTML = "";
    const total = databaseJuz[juzNum][suratIndex].ayat;
    const keyProgres = `juz${juzNum}_surat${suratIndex}`;
    const isMurid = (role === "murid");

    if (!santriAktif.progress[keyProgres]) santriAktif.progress[keyProgres] = Array(total).fill(false);

    for (let i = 0; i < total; i++) {
        const done = santriAktif.progress[keyProgres][i];
        container.innerHTML += `
        <button onclick="event.stopPropagation(); ${isMurid ? "alert('Penandaan ayat hanya boleh dilakukan oleh Guru!')" : `toggleAyat(${juzNum}, ${suratIndex}, ${i})`}" 
                class="w-10 h-10 rounded-xl font-bold text-xs flex items-center justify-center transition focus:outline-none ${done ? 'bg-blue-600 text-white shadow-md shadow-blue-500/40 ring-2 ring-blue-500 ring-offset-2' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">
            ${i + 1}
        </button>`;
    }
}

function toggleAyat(juzNum, suratIndex, ayatIndex) {
    if (!santriAktif || role === "murid") return; 
    const keyProgres = `juz${juzNum}_surat${suratIndex}`;
    santriAktif.progress[keyProgres][ayatIndex] = !santriAktif.progress[keyProgres][ayatIndex];
    save();
    renderAyat(juzNum, suratIndex);
    if (currentJuzAkses) renderSuratBerdasarkanJuz(currentJuzAkses); 
}

function closeDetail() {
    document.body.style.overflow = 'auto'; 
    document.getElementById("suratDetail").classList.add("hidden");
    document.getElementById("backdropDetail").classList.add("hidden");
    
    if (currentJuzAkses) renderSuratBerdasarkanJuz(currentJuzAkses);
    updateLiveDashboardStats();
}


// ==========================================
// MODUL KUALITAS BACAAN (HIJAIYAH & TAJWID)
// ==========================================
function renderPenilaianModul() {
    const containerHuruf = document.getElementById("listHurufHijaiyah");
    const containerTajwid = document.getElementById("listHukumTajwidKlasifikasi");
    if (!containerHuruf || !containerTajwid) return;

    containerHuruf.innerHTML = ""; containerTajwid.innerHTML = "";
    const isMurid = (role === "murid");

    const levelHijaiyah = [
        { teks: "Belum Dinilai", warna: "#ef4444", bg: "bg-white" },
        { teks: "Sangat Kurang", warna: "#f43f5e", bg: "bg-rose-50/40" },
        { teks: "Kurang", warna: "#f97316", bg: "bg-orange-50/40" },
        { teks: "Cukup", warna: "#f59e0b", bg: "bg-amber-50/40" },
        { teks: "Baik", warna: "#3b82f6", bg: "bg-blue-50/30" },
        { teks: "Lancar (Mumtaz)", warna: "#10b981", bg: "bg-emerald-50/50" }
    ];

    daftarHijaiyah.forEach((huruf, idx) => {
        const currentVal = parseInt(santriAktif?.huruf?.[`h_${idx}`] || "0");
        const persenCard = Math.round((currentVal / 5) * 100); 
        const infoLevel = levelHijaiyah[currentVal] || levelHijaiyah[0];

        containerHuruf.innerHTML += `
        <div onclick="${isMurid ? '' : `siklusNilaiHuruf(${idx}, ${currentVal})`}" 
             class="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 ${infoLevel.bg} ${isMurid ? '' : 'cursor-pointer active:scale-95 transition hover:shadow-sm'}">
            <div class="flex-shrink-0">${circularProgress(persenCard, infoLevel.warna)}</div>
            <div class="flex-1 min-w-0">
                <h4 class="font-bold text-slate-800 text-sm tracking-tight truncate">${huruf}</h4>
                <span class="text-[11px] text-slate-500 font-semibold mt-0.5 inline-block truncate">${infoLevel.teks}</span>
            </div>
        </div>`;
    });

    klasifikasiTajwid.forEach((klasor) => {
        // Responsif grid internal untuk card tajwid di dalam kategori
        let itemsHtml = `<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">`;
        
        klasor.items.forEach((item) => {
            const currentVal = parseInt(santriAktif?.tajwid?.[item.id] || "0");
            const persenCard = Math.round((currentVal / 5) * 100); 
            const infoLevel = levelHijaiyah[currentVal] || levelHijaiyah[0];

            // 1. Pewarnaan border & shadow halus berdasarkan tingkat kelulusan/nilai
            const borderColors = [
                "border-slate-200 hover:border-slate-300", 
                "border-rose-200/80 shadow-sm shadow-rose-100/30", 
                "border-orange-200/80 shadow-sm shadow-orange-100/30", 
                "border-amber-200/80 shadow-sm shadow-amber-100/30", 
                "border-blue-200/80 shadow-sm shadow-blue-100/30", 
                "border-emerald-200/80 shadow-sm shadow-emerald-100/30"
            ];
            const bColor = borderColors[currentVal] || borderColors[0];

            // 2. Desain warna teks badge status agar kontras dan estetik
            const badgeStyles = [
                "bg-slate-100 text-slate-600",
                "bg-rose-100 text-rose-700",
                "bg-orange-100 text-orange-700",
                "bg-amber-100 text-amber-700",
                "bg-blue-100 text-blue-700",
                "bg-emerald-100 text-emerald-700"
            ];
            const badgeStyle = badgeStyles[currentVal] || badgeStyles[0];

            // HTML Card baru: Tanpa truncate, mendukung pembungkusan kata otomatis (wrap text)
            itemsHtml += `
            <div onclick="${isMurid ? '' : `siklusNilaiTajwid('${item.id}', ${currentVal})`}" 
                 class="flex items-center gap-4 p-4 bg-white rounded-2xl border ${bColor} ${infoLevel.bg} ${isMurid ? '' : 'cursor-pointer hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 hover:shadow-md hover:shadow-slate-100 group'}">
                
                <div class="flex-shrink-0 transition-transform duration-300 group-hover:scale-105">
                    ${circularProgress(persenCard, infoLevel.warna)}
                </div>
                
                <div class="flex-1 min-w-0 space-y-1.5">
                    <h4 class="font-bold text-slate-800 text-sm tracking-tight leading-snug whitespace-normal break-words" title="${item.nama}">
                        ${item.nama}
                    </h4>
                    <span class="inline-flex items-center text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${badgeStyle}">
                        ${infoLevel.teks}
                    </span>
                </div>
            </div>`;
        });
        
        itemsHtml += `</div>`;
        
        // Memasukkan seluruh paket kategori hukum tajwid ke container utama
        containerTajwid.innerHTML += `
        <div class="space-y-4 w-full">
            <h4 class="text-xs font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2 mt-2 mb-1">
                <span class="w-2 h-2 rounded-full bg-indigo-500 shadow-sm shadow-indigo-400"></span> 
                ${klasor.kategori}
            </h4>
            ${itemsHtml}
        </div>`;
    });
}

function siklusNilaiHuruf(idx, currentVal) {
    if (!santriAktif || role === "murid") return;
    if (!santriAktif.huruf) santriAktif.huruf = {};
    santriAktif.huruf[`h_${idx}`] = String((parseInt(currentVal) + 1) % 6);
    save(); 
    renderPenilaianModul();
}

function siklusNilaiTajwid(id, currentVal) {
    if (!santriAktif || role === "murid") return;
    if (!santriAktif.tajwid) santriAktif.tajwid = {};
    santriAktif.tajwid[id] = String((parseInt(currentVal) + 1) % 6);
    save(); 
    renderPenilaianModul();
}


// ==========================================
// GLOBAL VISUAL UTILITIES
// ==========================================
function circularProgress(persen, color) {
    const size = 48; const stroke = 4; const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius; const offset = circumference - (persen / 100) * circumference;
    return `
    <svg width="${size}" height="${size}" class="-rotate-90">
        <circle cx="${size/2}" cy="${size/2}" r="${radius}" stroke="#f1f5f9" stroke-width="${stroke}" fill="none" />
        <circle cx="${size/2}" cy="${size/2}" r="${radius}" stroke="${color}" stroke-width="${stroke}" fill="none" stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" class="transition-all duration-500 ease-out"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="10" font-weight="800" fill="#334155" transform="rotate(90 ${size/2} ${size/2})">${persen}%</text>
    </svg>`;
}


// ==========================================
// SYSTEM & DATABASE LOGIC
// ==========================================
async function save() { 
    localStorage.setItem("dataSantri", JSON.stringify(dataSantri)); 
    
    if (!GOOGLE_SHEET_URL || GOOGLE_SHEET_URL.includes("PASTE_URL")) return;

    try {
        await fetch(GOOGLE_SHEET_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ dataSantri: JSON.stringify(dataSantri) })
        });
    } catch (error) {
        console.error("Gagal menyimpan ke Google Sheets:", error);
    }
}

async function sinkronisasiDataOnline() {
    if (!GOOGLE_SHEET_URL || GOOGLE_SHEET_URL.includes("PASTE_URL")) return;
    try {
        const response = await fetch(GOOGLE_SHEET_URL);
        const dataTerbaru = await response.json();
        if (Array.isArray(dataTerbaru) && dataTerbaru.length > 0) {
            dataSantri = dataTerbaru; 
            localStorage.setItem("dataSantri", JSON.stringify(dataSantri));
            console.log("Data berhasil disinkronisasi!");
        }
    } catch (error) {
        console.error("Gagal sinkronisasi, menggunakan data lama:", error);
    }
}

function logout() { 
    localStorage.removeItem("login"); 
    window.location.href = "login.html"; 
}

// ==========================================
// LOGIKA SPLASH SCREEN (INSTAGRAM STYLE)
// ==========================================
window.addEventListener("load", () => {
    const splash = document.getElementById("splashScreen");
    
    // Tahan splash screen selama 1.2 detik (cukup cepat tapi terlihat)
    setTimeout(() => {
        splash.style.opacity = '0'; // Memudar perlahan
        
        // Hapus elemen setelah animasi memudar selesai
        setTimeout(() => {
            splash.style.display = 'none';
        }, 1000); 
    }, 1200);
});

// ==========================================
// TAMBAHAN: SOLUSI TOMBOL BACK DI HP
// ==========================================
window.addEventListener('pageshow', function(event) {
    // Mengecek apakah user masih login (di HP, terkadang halaman dimuat dari cache)
    const isLogin = localStorage.getItem("login");
    
    // Jika tidak ada data login, paksa pindah ke halaman login
    if (isLogin !== "true") {
        window.location.replace("login.html");
    }
});