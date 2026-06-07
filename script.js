// ==========================================
// CONFIGURATION GOOGLE SPREADSHEET
// ==========================================
// GANTI teks di bawah ini dengan URL Web App dari Google Apps Script Anda
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbxL6aS79HoboYfV8Kv54ZZyqEFO8dFaKVMDROQVqGvzR6OQdjovG9-pPE0CFxP4arcG/exec";

// Memuat data dari localStorage terlebih dahulu sebagai cache awal agar UI langsung berjalan lancar
let dataSantri = JSON.parse(localStorage.getItem("dataSantri")) || [];
let santriAktif = null;
let currentView = 'viewDashboard'; 

const role = localStorage.getItem("role");
const namaLogin = localStorage.getItem("nama");

if (localStorage.getItem("login") !== "true") {
    window.location.href = "login.html";
}

const daftarHijaiyah = ["Alif (ا)", "Ba (ب)", "Ta (ت)", "Tsa (ث)", "Jim (ج)", "Ha (ح)", "Kho (خ)", "Dal (د)", "Dzal (ذ)", "Ro (ر)", "Zai (ز)", "Sin (س)", "Syin (ش)", "Shod (ص)", "Dhod (ض)", "Tho (ط)", "Zho (ظ)", "Ain (ع)", "Gho (غ)", "Fa (ف)", "Qof (ق)", "Kaf (ك)", "Lam (ل)", "Mim (م)", "Nun (ن)", "Wawu (و)", "Ha' (هـ)", "Ya (ي)"];

const klasifikasiTajwid = [
    {
        kategori: "1. Hukum Nun Sukun & Tanwin",
        items: [
            { id: "ns_izhar", nama: "Idzhar Halqi" }, { id: "ns_idg_bi", nama: "Idgham Bighunnah" },
            { id: "ns_idg_bila", nama: "Idgham Bilaghunnah" }, { id: "ns_iqlab", nama: "Iqlab" }, { id: "ns_ikhfa", nama: "Ikhfa Haqiqi" }
        ]
    },
    {
        kategori: "2. Hukum Mim Sukun",
        items: [
            { id: "ms_ikhfa", nama: "Ikhfa Syafawi" }, { id: "ms_idgham", nama: "Idgham Mimi" }, { id: "ms_izhar", nama: "Idzhar Syafawi" }
        ]
    },
    {
        kategori: "3. Hukum Mad (Panjang Bacaan)",
        items: [
            { id: "mad_thabii", nama: "Mad Thabi'i" }, { id: "mad_wajib", nama: "Mad Wajib Muttasil" },
            { id: "mad_jaiz", nama: "Mad Jaiz Munfasil" }, { id: "mad_arid", nama: "Mad 'Arid Lissukun" },
            { id: "mad_iwadl", nama: "Mad Iwadl" }, { id: "mad_shilah_qashirah", nama: "Mad Shilah Qashirah" },
            { id: "mad_shilah_thawilah", nama: "Mad Shilah Thawilah" }, { id: "mad_badal", nama: "Mad Badal" },
            { id: "mad_tamkin", nama: "Mad Tamkin" }, { id: "mad_lin", nama: "Mad Lin" },
            { id: "mad_lazim_mutsaqal_kalimi", nama: "Mad Lazim Mutsaqal Kalimi" },
            { id: "mad_lazim_mukhoffaf_kalimi", nama: "Mad Lazim Mukhoffaf Kalimi" },
            { id: "mad_lazim_mutsaqol_harfi", nama: "Mad Lazim Mutsaqol Harfi" },
            { id: "mad_lazim_mukhoffaf_harfi", nama: "Mad Lazim Mukhoffaf Harfi" },
            { id: "mad_farq", nama: "Mad Farq" }
        ]
    },
    {
        kategori: "4. Sifat & Hukum Huruf Utama",
        items: [
            { id: "sif_qalqalah", nama: "Qalqalah (Sughra/Kubra)" }, { id: "sif_ghunnah", nama: "Ghunnah Musyaddadah" },
            { id: "sif_tafkhim", nama: "Tafkhim & Tarqiq" }
        ]
    },
    {
        kategori: "5. Hukum Alif Lam",
        items: [
            { id: "al_qomariyah", nama: "Alif Lam Qomariyah" },
            { id: "al_syamsiah", nama: "Alif Lam Syamsiah" }
        ]
    },
    {
        kategori: "6. Hukum Idgham (Pertemuan Dua Huruf)",
        items: [
            { id: "idg_mutamasilain", nama: "Idgham Mutamasilain" },
            { id: "idg_mutajanisain", nama: "Idgham Mutajanisain" },
            { id: "idg_mutaqaribain", nama: "Idgham Mutaqaribain" }
        ]
    },
    {
        kategori: "7. Bacaan Gharib",
        items: [
            { id: "gh_saktah", nama: "Saktah" }, { id: "gh_isymam", nama: "Isymam" },
            { id: "gh_imalah", nama: "Imalah" }, { id: "gh_tashil", nama: "Tashil" },
            { id: "gh_naql", nama: "Naql" }, { id: "gh_shad_sin", nama: "Shad dibaca Sin" }
        ]
    },
    {
        kategori: "8. Tanda Waqaf",
        items: [
            { id: "wq_lazim", nama: "Waqaf Lazim (م)" }, { id: "wq_mutlaq", nama: "Waqaf Mutlaq (ط)" },
            { id: "wq_jaiz", nama: "Waqaf Jaiz (ج)" }, { id: "wq_washlu_aula", nama: "Waqaf Al-Washlu Aula (صلى)" },
            { id: "wq_waqfu_aula", nama: "Waqaf Al-Waqfu Aula (قلى)" }, { id: "wq_la_washal", nama: "Waqaf La Washal (لا)" },
            { id: "wq_muanaqah", nama: "Waqaf Mu'anaqah (∴)" }, { id: "wq_saktah", nama: "Saktah (س)" }
        ]
    }
];

const databaseJuz = {
    30: [
        { nama: "An-Naba", ayat: 40 }, { nama: "An-Nazi'at", ayat: 46 }, { nama: "Abasa", ayat: 42 },
        { nama: "At-Takwir", ayat: 29 }, { nama: "Al-Infitar", ayat: 19 }, { nama: "Al-Mutaffifin", ayat: 36 },
        { nama: "Al-Inshiqaq", ayat: 25 }, { nama: "Al-Buruj", ayat: 22 }, { nama: "At-Tariq", ayat: 17 },
        { nama: "Al-A'la", ayat: 19 }, { nama: "Al-Ghashiyah", ayat: 26 }, { nama: "Al-Fajr", ayat: 30 },
        { nama: "Al-Balad", ayat: 20 }, { nama: "Ash-Shams", ayat: 15 }, { nama: "Al-Lail", ayat: 21 },
        { nama: "Ad-Duha", ayat: 11 }, { nama: "Al-Inshirah", ayat: 8 }, { nama: "At-Tin", ayat: 8 },
        { nama: "Al-Alaq", ayat: 19 }, { nama: "Al-Qadr", ayat: 5 }, { nama: "Al-Bayyinah", ayat: 8 },
        { nama: "Az-Zalzalah", ayat: 8 }, { nama: "Al-Adiyat", ayat: 11 }, { nama: "Al-Qari'ah", ayat: 11 },
        { nama: "At-Takathur", ayat: 8 }, { nama: "Al-Asr", ayat: 3 }, { nama: "Al-Humazah", ayat: 9 },
        { nama: "Al-Fil", ayat: 5 }, { nama: "Quraysh", ayat: 4 }, { nama: "Al-Ma'un", ayat: 7 },
        { nama: "Al-Kawthar", ayat: 3 }, { nama: "Al-Kafirun", ayat: 6 }, { nama: "An-Nasr", ayat: 3 },
        { nama: "Al-Lahab", ayat: 5 }, { nama: "Al-Ikhlas", ayat: 4 }, { nama: "Al-Falaq", ayat: 5 }, { nama: "An-Nas", ayat: 6 }
    ],
    29: [
        { nama: "Al-Mulk", ayat: 30 }, { nama: "Al-Qalam", ayat: 52 }, { nama: "Al-Haqqah", ayat: 52 },
        { nama: "Al-Ma'arij", ayat: 44 }, { nama: "Nuh", ayat: 28 }, { nama: "Al-Jinn", ayat: 28 },
        { nama: "Al-Muzzammil", ayat: 20 }, { nama: "Al-Muddaththir", ayat: 56 }, { nama: "Al-Qiyamah", ayat: 40 },
        { nama: "Al-Insan", ayat: 31 }, { nama: "Al-Mursalat", ayat: 50 }
    ],
    28: [
        { nama: "Al-Mujadilah", ayat: 22 }, { nama: "Al-Hashr", ayat: 24 }, { nama: "Al-Mumtahanah", ayat: 13 },
        { nama: "As-Saff", ayat: 14 }, { nama: "Al-Jumu'ah", ayat: 11 }, { nama: "Al-Munafiqun", ayat: 11 },
        { nama: "At-Taghabun", ayat: 18 }, { nama: "At-Talaq", ayat: 12 }, { nama: "At-Tahrim", ayat: 12 }
    ],
    1: [
        { nama: "Al-Fatihah", ayat: 7 }, { nama: "Al-Baqarah (Ayat 1-141)", ayat: 141 }
    ]
};

const subTeksJuz = { 30: "Amma Yatasa'alun", 29: "Tabarakalladhi", 28: "Qad Sami'allah", 1: "Alif Lam Mim" };
let juzTerbuka = null; 

document.addEventListener("DOMContentLoaded", () => {
    initGreeting();
    initUser();
    updateLiveDashboardStats();
    
    // Jalankan sinkronisasi data online dari Spreadsheet di latar belakang
    syncDataDariSheets();
});

// GREETING DINAMIS BERDASARKAN WAKTU REALTIME
function initGreeting() {
    const jam = new Date().getHours();
    let ucapan = "Selamat Malam 🌙";
    if (jam >= 4 && jam < 10) ucapan = "Selamat Pagi 🌅";
    else if (jam >= 10 && jam < 15) ucapan = "Selamat Siang ☀️";
    else if (jam >= 15 && jam < 18) ucapan = "Selamat Sore 🌤️";
    
    const el = document.getElementById("txtGreeting");
    if(el) el.innerText = ucapan;
}

function navigateTo(viewId) {
    document.getElementById("viewDashboard").classList.add("hidden");
    document.getElementById("viewHafalan").classList.add("hidden");
    document.getElementById("viewPenilaian").classList.add("hidden");

    const targetPage = document.getElementById(viewId);
    if (targetPage) {
        targetPage.classList.remove("hidden");
        currentView = viewId;
    }
    
    updateLiveDashboardStats();
    if(viewId === 'viewHafalan') renderJuzContainers();
    if(viewId === 'viewPenilaian') renderPenilaianModul();
}

function initUser() {
    if (role === "murid") {
       santriAktif = dataSantri.find(s => s.nama.toLowerCase() === namaLogin.toLowerCase());
        if (!santriAktif) {
            santriAktif = { id: Date.now(), nama: namaLogin, progress: {}, huruf: {}, tajwid: {} };
            dataSantri.push(santriAktif);
            save();
        } else {
            santriAktif.nama = santriAktif.nama; 
        }

        const input = document.getElementById("namaInput");
        if (input) { input.value = namaLogin; input.disabled = true; }
        const namaEl = document.getElementById("namaSantri");
        if (namaEl) namaEl.innerText = namaLogin;
        updateLiveDashboardStats();
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
    if(currentView === 'viewHafalan') renderJuzContainers();
    if(currentView === 'viewPenilaian') renderPenilaianModul();
}

// UPDATE STATS UTAMA DASHBOARD
function updateLiveDashboardStats() {
    let totalAyatSistem = 0; 
    let totalAyatSelesai = 0;
    
    Object.keys(databaseJuz).forEach(juzNum => {
        databaseJuz[juzNum].forEach((surat, sIdx) => {
            totalAyatSistem += surat.ayat;
            const keyProgres = `juz${juzNum}_surat${sIdx}`;
            const progressSurat = santriAktif?.progress?.[keyProgres];
            if (progressSurat && Array.isArray(progressSurat)) {
                totalAyatSelesai += progressSurat.filter(Boolean).length;
            }
        });
    });

    let totalLulusH = 0;
    daftarHijaiyah.forEach((_, idx) => {
        if(parseInt(santriAktif?.huruf?.[`h_${idx}`] || "0") === 3) totalLulusH++;
    });

    let totalFasihT = 0;
    let totalItemTajwid = 0;
    klasifikasiTajwid.forEach(k => {
        k.items.forEach(item => {
            totalItemTajwid++;
            if(parseInt(santriAktif?.tajwid?.[item.id] || "0") === 3) totalFasihT++;
        });
    });

    const persenHafalan = totalAyatSistem > 0 ? Math.round((totalAyatSelesai / totalAyatSistem) * 100) : 0;
    const persenHijaiyah = Math.round((totalLulusH / 28) * 100);
    const persenTajwid = totalItemTajwid > 0 ? Math.round((totalFasihT / totalItemTajwid) * 100) : 0;

    const elAyat = document.getElementById("totalSelesaiAyat");
    const elHuruf = document.getElementById("totalLulusHijaiyah");
    const elTajwid = document.getElementById("totalFasihTajwid");

    if (elAyat) elAyat.innerText = totalAyatSelesai;
    if (elHuruf) elHuruf.innerText = `${totalLulusH} / 28`;
    if (elTajwid) elTajwid.innerText = `${totalFasihT} / ${totalItemTajwid}`;

    const cHafalan = document.getElementById("statCircleHafalan");
    const cHuruf = document.getElementById("statCircleHijaiyah");
    const cTajwid = document.getElementById("statCircleTajwid");

    if (cHafalan) cHafalan.innerHTML = circularProgress(persenHafalan, "#3b82f6");
    if (cHuruf) cHuruf.innerHTML = circularProgress(persenHijaiyah, "#10b981");
    if (cTajwid) cTajwid.innerHTML = circularProgress(persenTajwid, "#6366f1");
}

// ACCORDION JUZ HAFALAN
function renderJuzContainers() {
    const mainContainer = document.getElementById("containerJuzAccordion");
    if (!mainContainer) return;
    mainContainer.innerHTML = "";

    const listNomorJuz = [30, 29, 28, 1];

    listNomorJuz.forEach(num => {
        let totalAyatJuz = 0; let totalSelesaiJuz = 0;
        const daftarSurat = databaseJuz[num] || [];
        daftarSurat.forEach((s, idx) => {
            totalAyatJuz += s.ayat;
            const key = `juz${num}_surat${idx}`;
            const progress = santriAktif?.progress?.[key] || [];
            totalSelesaiJuz += progress.filter(Boolean).length;
        });
        const persenJuz = totalAyatJuz > 0 ? Math.round((totalSelesaiJuz / totalAyatJuz) * 100) : 0;

        mainContainer.innerHTML += `
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <button onclick="toggleJuzAccordion(${num})" class="w-full p-5 flex items-center justify-between text-left hover:bg-slate-50 transition-all">
                <div class="flex items-center gap-4">
                    <div class="w-11 h-11 flex items-center justify-center font-extrabold text-sm rounded-xl bg-blue-50 text-blue-600">${num}</div>
                    <div>
                        <h4 class="font-bold text-slate-800 text-sm sm:text-base">Juz ${num}</h4>
                        <p class="text-xs text-slate-400 font-semibold tracking-wide">${subTeksJuz[num] || ''}</p>
                    </div>
                </div>
                <div class="flex items-center gap-4">
                    <div class="text-right">
                        <span class="text-[9px] uppercase font-bold text-slate-400 block">Progress</span>
                        <p class="text-xs font-bold text-slate-700">${persenJuz}%</p>
                    </div>
                    <span id="icon-juz-${num}" class="text-slate-400 font-bold">${juzTerbuka === num ? '➖' : '➕'}</span>
                </div>
            </button>

            <div id="content-juz-${num}" class="accordion-content ${juzTerbuka === num ? 'open' : 'hidden'}">
                <div class="p-5 bg-slate-50/50 border-t border-slate-100">
                    <div id="grid-surat-juz-${num}" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"></div>
                </div>
            </div>
        </div>`;

        if (juzTerbuka === num) fillSuratGrid(num);
    });
}

function toggleJuzAccordion(num) {
    const content = document.getElementById(`content-juz-${num}`);
    const icon = document.getElementById(`icon-juz-${num}`);
    
    if (juzTerbuka === num) {
        content.classList.remove("open");
        setTimeout(() => content.classList.add("hidden"), 250);
        icon.innerText = "➕";
        juzTerbuka = null;
    } else {
        if (juzTerbuka !== null) {
            const oldContent = document.getElementById(`content-juz-${juzTerbuka}`);
            const oldIcon = document.getElementById(`icon-juz-${juzTerbuka}`);
            if (oldContent) { oldContent.classList.remove("open"); oldContent.classList.add("hidden"); }
            if (oldIcon) oldIcon.innerText = "➕";
        }

        juzTerbuka = num;
        content.classList.remove("hidden");
        content.offsetHeight; 
        content.classList.add("open");
        icon.innerText = "➖";
        fillSuratGrid(num);
    }
}

function fillSuratGrid(num) {
    const grid = document.getElementById(`grid-surat-juz-${num}`);
    if (!grid) return;
    grid.innerHTML = "";
    
    const daftarSurat = databaseJuz[num] || [];

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
        <div onclick="openSurat(${num}, ${i})" class="flex items-center gap-3 p-3.5 rounded-xl border border-slate-100 cursor-pointer ${bgLight} hover:shadow-sm transition">
            <div class="flex-shrink-0">${circularProgress(persen, color)}</div>
            <div>
                <h4 class="font-bold text-slate-800 text-xs sm:text-sm tracking-tight">${s.nama}</h4>
                <span class="text-[10px] font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full mt-0.5 inline-block">${s.ayat} Ayat</span>
            </div>
        </div>`;
    });
}

function openSurat(juzNum, suratIndex) {
    if (!santriAktif) return alert("Pilih atau masukkan nama santri terlebih dahulu di atas!");
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
                class="w-10 h-10 rounded-xl font-bold text-xs flex items-center justify-center transition focus:outline-none ${done ? 'bg-blue-600 text-white ring-2 ring-blue-500 ring-offset-1 shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">
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
    fillSuratGrid(juzNum); 
}

// TUTUP PANEL POPUP DETAIL AYAT
function closeDetail() {
    document.getElementById("suratDetail").classList.add("hidden");
    document.getElementById("backdropDetail").classList.add("hidden");
    renderJuzContainers();
    updateLiveDashboardStats();
}

// MODUL KUALITAS BACAAN
function toggleAccordionPenilaian(id) {
    const el = document.getElementById(id);
    const icon = document.getElementById(`icon-${id}`);
    if (el.classList.contains("open")) {
        el.classList.remove("open");
        icon.innerText = "➕";
    } else {
        el.classList.add("open");
        icon.innerText = "➖";
    }
}

function renderPenilaianModul() {
    const containerHuruf = document.getElementById("listHurufHijaiyah");
    const containerTajwid = document.getElementById("listHukumTajwidKlasifikasi");
    if (!containerHuruf || !containerTajwid) return;

    containerHuruf.innerHTML = ""; containerTajwid.innerHTML = "";
    const isMurid = (role === "murid");

    const levelHijaiyah = [
        { teks: "Belum Lulus", warna: "#ef4444", bg: "bg-white" },
        { teks: "Kurang", warna: "#f59e0b", bg: "bg-amber-50/40" },
        { teks: "Cukup Baik", warna: "#3b82f6", bg: "bg-blue-50/30" },
        { teks: "Lancar (Mumtaz)", warna: "#10b981", bg: "bg-emerald-50/50" }
    ];

    daftarHijaiyah.forEach((huruf, idx) => {
        const currentVal = parseInt(santriAktif?.huruf?.[`h_${idx}`] || "0");
        const persenCard = Math.round((currentVal / 3) * 100);
        const infoLevel = levelHijaiyah[currentVal] || levelHijaiyah[0];

        containerHuruf.innerHTML += `
        <div onclick="${isMurid ? '' : `siklusNilaiHuruf(${idx}, ${currentVal})`}" 
             class="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 ${infoLevel.bg} ${isMurid ? '' : 'cursor-pointer active:scale-95 transition hover:shadow-sm'}">
            <div class="flex-shrink-0">${circularProgress(persenCard, infoLevel.warna)}</div>
            <div>
                <h4 class="font-bold text-slate-800 text-sm tracking-tight">${huruf}</h4>
                <span class="text-[11px] text-slate-500 font-semibold mt-0.5 inline-block">${infoLevel.teks}</span>
            </div>
        </div>`;
    });

    klasifikasiTajwid.forEach((klasor) => {
        let itemsHtml = `<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">`;
        klasor.items.forEach((item) => {
            const currentVal = parseInt(santriAktif?.tajwid?.[item.id] || "0");
            const persenCard = Math.round((currentVal / 3) * 100);
            const infoLevel = levelHijaiyah[currentVal] || levelHijaiyah[0];

            itemsHtml += `
            <div onclick="${isMurid ? '' : `siklusNilaiTajwid('${item.id}', ${currentVal})`}" 
                 class="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 ${infoLevel.bg} ${isMurid ? '' : 'cursor-pointer active:scale-95 transition hover:shadow-sm'}">
                <div class="flex-shrink-0">${circularProgress(persenCard, infoLevel.warna)}</div>
                <div>
                    <h4 class="font-bold text-slate-800 text-xs tracking-tight">${item.nama}</h4>
                    <span class="text-[10px] text-slate-500 font-semibold mt-0.5 inline-block">${infoLevel.teks}</span>
                </div>
            </div>`;
        });
        itemsHtml += `</div>`;
        containerTajwid.innerHTML += `
        <div class="space-y-3">
            <h4 class="text-xs font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">📁 ${klasor.kategori}</h4>
            ${itemsHtml}
        </div>`;
    });
}

function siklusNilaiHuruf(idx, currentVal) {
    if (!santriAktif || role === "murid") return;
    if (!santriAktif.huruf) santriAktif.huruf = {};
    santriAktif.huruf[`h_${idx}`] = String((parseInt(currentVal) + 1) % 4);
    save(); 
    renderPenilaianModul();
}

function siklusNilaiTajwid(id, currentVal) {
    if (!santriAktif || role === "murid") return;
    if (!santriAktif.tajwid) santriAktif.tajwid = {};
    santriAktif.tajwid[id] = String((parseInt(currentVal) + 1) % 4);
    save(); 
    renderPenilaianModul();
}

// GLOBAL VISUAL UTILITIES
function circularProgress(persen, color) {
    const size = 48; const stroke = 4; const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius; const offset = circumference - (persen / 100) * circumference;
    return `
    <svg width="${size}" height="${size}">
        <circle cx="${size/2}" cy="${size/2}" r="${radius}" stroke="#f1f5f9" stroke-width="${stroke}" fill="none" />
        <circle cx="${size/2}" cy="${size/2}" r="${radius}" stroke="${color}" stroke-width="${stroke}" fill="none" stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" transform="rotate(-90 ${size/2} ${size/2})"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="10" font-weight="800" fill="#334155">${persen}%</text>
    </svg>`;
}

// FUNGSI MENYIMPAN DATA (HYBRID: LOCAL + SPREADSHEET ONLINE)
async function save() { 
    // 1. Simpan lokal dulu (Instan)
    localStorage.setItem("dataSantri", JSON.stringify(dataSantri)); 
    
    // 2. Tampilkan indikator (Opsional: Tambahkan <div id="status"> di HTML Anda)
    const statusEl = document.getElementById("statusSimpan");
    if (statusEl) statusEl.innerText = "🔄 Menyimpan...";

    if (!GOOGLE_SHEET_URL || GOOGLE_SHEET_URL.includes("PASTE_URL")) return;

    try {
        await fetch(GOOGLE_SHEET_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ dataSantri: JSON.stringify(dataSantri) })
        });
        
        // 3. Ubah indikator jadi sukses
        if (statusEl) {
            statusEl.innerText = "✅ Tersimpan";
            setTimeout(() => { statusEl.innerText = ""; }, 2000); // Hilang setelah 2 detik
        }
    } catch (error) {
        if (statusEl) statusEl.innerText = "❌ Gagal!";
        console.error("Gagal:", error);
    }
}

// =========================================================================
// PERBAIKAN SINKRONISASI OTOMATIS (UNTUK HP & PERANGKAT BARU)
// =========================================================================

async function sinkronisasiDataOnline() {
    // Jika URL Google Sheet belum diisi, hentikan fungsi
    if (!GOOGLE_SHEET_URL || GOOGLE_SHEET_URL.includes("PASTE_URL")) {
        console.log("URL Google Sheets belum dikonfigurasi.");
        return;
    }
    
    try {
        console.log("Menghubungkan ke Google Sheets untuk mengambil data terbaru...");
        
        // Mengambil data dari fungsi doGet() Web App Apps Script
        const response = await fetch(GOOGLE_SHEET_URL);
        const dataTerbaru = await response.json();
        
        // Jika data dari Google Sheets ditemukan dan tidak kosong
        if (dataTerbaru && dataTerbaru.length > 0) {
            dataSantri = dataTerbaru;
            
            // Paksa simpan ke localStorage HP / Browser agar tidak kosong lagi
            localStorage.setItem("dataSantri", JSON.stringify(dataSantri));
            console.log("Sinkronisasi berhasil! Data diperbarui.");
            
            // Segarkan ulang data user yang sedang login agar nilainya langsung muncul
            if (typeof initUser === "function") initUser();
            if (typeof renderDashboard === "function") renderDashboard();
            if (typeof renderPenilaianModul === "function") renderPenilaianModul();
        }
    } catch (error) {
        console.error("Gagal mengambil data online, menggunakan data lokal:", error);
    }
}

// JALANKAN FUNGSI INI OTOMATIS SETIAP KALI HALAMAN DIBUKA
document.addEventListener("DOMContentLoaded", () => {
    sinkronisasiDataOnline();
});

function logout() { 
    localStorage.removeItem("login"); 
    window.location.href = "login.html"; 
}