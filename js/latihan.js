// ==========================================
// LOGIKA FITUR LATIHAN & KUIS (latihan.js)
// Hingga 50 Level (tergantung jenis kuis), soal diambil dinamis dari bank
// soal besar (dasar/menengah/lanjut) sesuai
// tingkat kesulitan level yang dipilih.
// ==========================================

// ==========================================
// KONFIGURASI BACKUP KE GOOGLE SHEETS
// Ganti nilai di bawah ini dengan URL Web App
// hasil deploy Google Apps Script kamu.
// Lihat file apps-script-backup-sheet.gs untuk kodenya.
// ==========================================
const URL_BACKUP_SHEET = "GANTI_DENGAN_URL_WEB_APP_APPS_SCRIPT_KAMU";

let kuisAktif = [];
let indexSoalSaatIni = 0;
let skorKuis = 0;
let jawabanBenarTotal = 0;
let jawabanSalahTotal = 0;
let jenisKuisSaatIni = "";
let levelKuisSaatIni = 1;
let tempKuisPilihan = "";

// ==========================================
// ATURAN KUNCI LEVEL
// Level 1 selalu terbuka. Level N+1 baru terbuka jika Level N sudah
// LULUS (jumlah salah <= MAKS_SALAH_LULUS dari 10 soal) minimal sekali.
// Ubah angka di bawah jika aturan kelulusan ingin diganti.
// ==========================================
const MAKS_SALAH_LULUS = 3;

// ==========================================
// BATAS WAKTU PER SOAL (detik)
// Habis waktu = soal dihitung SALAH, jawaban benar ditampilkan,
// lalu otomatis lanjut ke soal berikutnya. Ubah angkanya sesuai kebutuhan.
// ==========================================
const WAKTU_PER_SOAL = {
    tajwid: 15,
    makharijul: 15,
    juz30: 15,   // sambung ayat: teks lebih panjang, waktu lebih longgar
    juz29: 15
};
function getWaktuPerSoal(jenis) {
    return WAKTU_PER_SOAL[jenis] || 20;
}

let sesiKuis = 0;            // naik tiap kuis dimulai; membatalkan callback kuis lama
let soalSudahDijawab = false;
let timerSoalId = null;
let batasWaktuSoal = 0;      // timestamp (ms) kapan waktu soal habis
let sisaWaktuTersimpan = null; // dipakai saat pause (tab disembunyikan)

const DAFTAR_JENIS = ['tajwid', 'makharijul', 'juz30', 'juz29'];
const NAMA_KUIS = {
    tajwid: "Kuis Hukum Tajwid",
    makharijul: "Kuis Makharijul Huruf",
    juz30: "Hafalan Juz 30",
    juz29: "Hafalan Juz 29"
};
// Label ini sama persis dengan yang disimpan di Firestore (field jenisKuis)
const LABEL_JENIS = {
    tajwid: "Hukum Tajwid",
    makharijul: "Makharijul Huruf",
    juz30: "Juz 30",
    juz29: "Juz 29"
};

// Cache seluruh percobaan santri aktif (dibaca sekali dari Firestore,
// lalu diperbarui lokal setiap selesai kuis)
let dataLatihanCache = [];
let namaCacheLatihan = "";
let statusMuatLatihan = "belum"; // belum | memuat | siap | gagal

function ambilNamaSantriAktif() {
    // Jangan pakai .innerText: #namaSantri ada di view yang tersembunyi
    const elemenNamaSantri = document.getElementById('namaSantri');
    return (window.santriAktif && window.santriAktif.nama)
        ? window.santriAktif.nama
        : (elemenNamaSantri ? elemenNamaSantri.textContent.replace('!', '').trim() : '');
}

function kunciJenisDariLabel(label) {
    for (let i = 0; i < DAFTAR_JENIS.length; i++) {
        if (LABEL_JENIS[DAFTAR_JENIS[i]] === label) return DAFTAR_JENIS[i];
    }
    return null;
}

function angkaLevel(level) {
    if (typeof level === 'number') return level;
    const a = parseInt(String(level || "").replace(/[^0-9]/g, ""), 10);
    return isNaN(a) ? null : a;
}

function waktuRekam(rec) {
    if (rec.waktu && typeof rec.waktu.toMillis === 'function') return rec.waktu.toMillis();
    if (rec._waktuLokal) return rec._waktuLokal;
    return 0;
}

function apakahLulus(rec) {
    if (typeof rec.salah === 'number') return rec.salah <= MAKS_SALAH_LULUS;
    // data lama tanpa jumlah salah: 10 soal, jadi skor >= 70 setara salah <= 3
    return (rec.skor || 0) >= 100 - MAKS_SALAH_LULUS * 10;
}

// Peta progres per level untuk satu jenis kuis:
// { [level]: { percobaan: [...terbaru dulu], terbaik: skor tertinggi, lulus: bool } }
function petaProgress(jenis) {
    const peta = {};
    dataLatihanCache.forEach((rec) => {
        if (kunciJenisDariLabel(rec.jenisKuis) !== jenis) return;
        const lv = angkaLevel(rec.level);
        if (!lv) return;
        if (!peta[lv]) peta[lv] = { percobaan: [], terbaik: 0, lulus: false };
        peta[lv].percobaan.push(rec);
        if ((rec.skor || 0) > peta[lv].terbaik) peta[lv].terbaik = rec.skor || 0;
        if (apakahLulus(rec)) peta[lv].lulus = true;
    });
    Object.keys(peta).forEach((lv) => {
        peta[lv].percobaan.sort((a, b) => waktuRekam(b) - waktuRekam(a));
    });
    return peta;
}

function levelTerbuka(peta, level) {
    return level === 1 || !!(peta[level - 1] && peta[level - 1].lulus);
}

function namaTingkatLevel(level, maksLevel) {
    if (level > maksLevel * 0.66) return "Lanjut";
    if (level > maksLevel * 0.33) return "Menengah";
    return "Dasar";
}

function perbaruiProgressMenu() {
    DAFTAR_JENIS.forEach((jenis) => {
        const el = document.getElementById('progresLatihan-' + jenis);
        if (!el) return;
        if (statusMuatLatihan !== 'siap') { el.textContent = ""; return; }
        const peta = petaProgress(jenis);
        const maks = getMaksLevel(jenis);
        let lulus = 0;
        for (let i = 1; i <= maks; i++) { if (peta[i] && peta[i].lulus) lulus++; }
        el.textContent = lulus + " / " + maks + " level lulus";
    });
}

function muatDataLatihan(namaAnak, paksa) {
    if (!namaAnak || namaAnak === "-") {
        dataLatihanCache = [];
        namaCacheLatihan = "";
        statusMuatLatihan = "belum";
        perbaruiProgressMenu();
        return Promise.resolve();
    }
    if (!paksa && statusMuatLatihan === 'siap' && namaCacheLatihan === namaAnak) {
        return Promise.resolve();
    }
    if (namaCacheLatihan !== namaAnak) dataLatihanCache = [];
    namaCacheLatihan = namaAnak;
    statusMuatLatihan = "memuat";

    // Tanpa .orderBy() agar tidak butuh composite index; pengurutan di sisi JS.
    return firebase.firestore().collection("latihan_santri")
        .where("nama", "==", namaAnak)
        .get()
        .then((snap) => {
            if (namaCacheLatihan !== namaAnak) return; // santri sudah berganti
            const arr = [];
            snap.forEach((doc) => arr.push(doc.data()));
            dataLatihanCache = arr;
            statusMuatLatihan = "siap";
            perbaruiProgressMenu();
        })
        .catch((err) => {
            console.error("Gagal memuat data latihan:", err);
            if (namaCacheLatihan === namaAnak) statusMuatLatihan = "gagal";
        });
}

// Format level (angka 1-50, atau data lama "level1/2/3") jadi label "Level N"
function formatLabelLevel(level) {
    if (typeof level === 'number') return "Level " + level;
    const angka = String(level || "").replace(/[^0-9]/g, "");
    return angka ? "Level " + angka : (level || "-");
}

// ==========================================
// BANK SOAL (per kategori, dibagi 3 tingkat kesulitan:
// dasar, menengah, lanjut). Semakin tinggi level yang
// dipilih (1-50), semakin besar peluang soal "lanjut"
// yang keluar.
// ==========================================

const bankSoalTajwid = {
    dasar: [
        { pertanyaan: "Nun Mati (نْ) bertemu huruf Ba (ب) adalah hukum?", opsi: ["Ikhfa", "Iqlab", "Idgham", "Idzhar"], jawabanBenar: "Iqlab" },
        { pertanyaan: "Huruf Idzhar Halqi ada 6, yaitu...", opsi: ["Alif, Ha, Kha, Ain, Ghain, Ha", "Ba, Ta, Tsa", "Ya, Ra, Mim, Lam, Wawu, Nun", "Qaf, Tha, Ba, Jim, Dal"], jawabanBenar: "Alif, Ha, Kha, Ain, Ghain, Ha" },
        { pertanyaan: "Membaca berdengung terjadi pada hukum bacaan...", opsi: ["Ghunnah", "Qalqalah", "Mad Thabi'i", "Idzhar"], jawabanBenar: "Ghunnah" },
        { pertanyaan: "Idzhar Halqi terjadi ketika Nun Mati/Tanwin bertemu huruf...", opsi: ["Huruf tenggorokan (halq)", "Huruf bibir", "Huruf lidah", "Huruf hidung"], jawabanBenar: "Huruf tenggorokan (halq)" },
        { pertanyaan: "Qalqalah artinya bacaan yang...", opsi: ["Memantul", "Berdengung", "Memanjang", "Berhenti"], jawabanBenar: "Memantul" },
        { pertanyaan: "Huruf Qalqalah ada 5, sering disingkat...", opsi: ["Qutbujad (ق ط ب ج د)", "Ba, Ta, Tsa, Jim, Ha", "Hamzah, Ha, Kha, Ain, Ghain", "Ya, Nun, Mim, Wau"], jawabanBenar: "Qutbujad (ق ط ب ج د)" },
        { pertanyaan: "Mad dalam ilmu tajwid berarti...", opsi: ["Memanjangkan bacaan", "Memendekkan bacaan", "Menebalkan bacaan", "Mendengungkan bacaan"], jawabanBenar: "Memanjangkan bacaan" },
        { pertanyaan: "Waqaf artinya...", opsi: ["Berhenti dalam bacaan", "Melanjutkan bacaan", "Mengulang bacaan", "Mempercepat bacaan"], jawabanBenar: "Berhenti dalam bacaan" },
        { pertanyaan: "Tanwin adalah harakat ganda yang berbunyi seperti huruf...", opsi: ["Nun mati", "Mim mati", "Ra", "Lam"], jawabanBenar: "Nun mati" },
        { pertanyaan: "Idgham artinya...", opsi: ["Memasukkan/melebur bacaan", "Menyamarkan bacaan", "Menjelaskan bacaan", "Membalik bacaan"], jawabanBenar: "Memasukkan/melebur bacaan" },
        { pertanyaan: "Idzhar artinya membaca huruf dengan...", opsi: ["Jelas, tanpa dengung", "Samar-samar", "Berdengung penuh", "Dipantulkan"], jawabanBenar: "Jelas, tanpa dengung" },
        { pertanyaan: "Ikhfa artinya membaca dengan cara...", opsi: ["Samar-samar, antara jelas dan dengung", "Sangat jelas", "Sangat panjang", "Dipantulkan"], jawabanBenar: "Samar-samar, antara jelas dan dengung" },
        { pertanyaan: "Hukum Nun Mati/Tanwin ada berapa macam?", opsi: ["4 (Idzhar, Idgham, Iqlab, Ikhfa)", "2 macam", "6 macam", "3 macam"], jawabanBenar: "4 (Idzhar, Idgham, Iqlab, Ikhfa)" },
        { pertanyaan: "Mad yang menjadi dasar untuk mad-mad lainnya disebut Mad...", opsi: ["Thabi'i (Ashli)", "Far'i", "Lazim", "Wajib"], jawabanBenar: "Thabi'i (Ashli)" },
        { pertanyaan: "Membaca Al-Qur'an dengan kaidah tajwid hukumnya...", opsi: ["Wajib diperhatikan", "Boleh diabaikan", "Hanya untuk qari profesional", "Tidak penting"], jawabanBenar: "Wajib diperhatikan" }
    ],
    menengah: [
        { pertanyaan: "Mim Mati (مْ) bertemu Mim (م) disebut?", opsi: ["Ikhfa Syafawi", "Idzhar Syafawi", "Idgham Mimi", "Iqlab"], jawabanBenar: "Idgham Mimi" },
        { pertanyaan: "Hukum bacaan pada kata 'مِنْ قَبْلِ' (Min qabli) adalah?", opsi: ["Idzhar Halqi", "Ikhfa Haqiqi", "Iqlab", "Idgham Bighunnah"], jawabanBenar: "Ikhfa Haqiqi" },
        { pertanyaan: "Mad Thabi'i dibaca panjang berapa harakat?", opsi: ["2 Harakat", "4 Harakat", "6 Harakat", "1 Harakat"], jawabanBenar: "2 Harakat" },
        { pertanyaan: "Nun mati bertemu huruf Ya dalam SATU kata (seperti kata 'دُنْيَا') dibaca...", opsi: ["Idzhar (jelas, tanpa dengung)", "Idgham Bighunnah", "Ikhfa", "Iqlab"], jawabanBenar: "Idzhar (jelas, tanpa dengung)" },
        { pertanyaan: "Mim Mati bertemu huruf selain Mim dan Ba dibaca...", opsi: ["Idzhar Syafawi", "Ikhfa Syafawi", "Idgham Mimi", "Iqlab"], jawabanBenar: "Idzhar Syafawi" },
        { pertanyaan: "Ikhfa Syafawi terjadi ketika Mim Mati bertemu huruf...", opsi: ["Ba", "Mim", "Ta", "Kaf"], jawabanBenar: "Ba" },
        { pertanyaan: "Idgham Bighunnah terjadi ketika Nun Mati/Tanwin bertemu 4 huruf, yaitu...", opsi: ["Ya, Nun, Mim, Wau", "Lam dan Ra", "Ba", "Semua huruf hijaiyah"], jawabanBenar: "Ya, Nun, Mim, Wau" },
        { pertanyaan: "Idgham Bilaghunnah terjadi ketika Nun Mati/Tanwin bertemu huruf...", opsi: ["Lam dan Ra", "Ya dan Wau", "Mim dan Nun", "Ba dan Mim"], jawabanBenar: "Lam dan Ra" },
        { pertanyaan: "Mad Wajib Muttasil terjadi ketika mad bertemu hamzah...", opsi: ["Dalam satu kata", "Di lain kata", "Di akhir ayat", "Di awal surat"], jawabanBenar: "Dalam satu kata" },
        { pertanyaan: "Pada bacaan Alif Lam Syamsiyah, huruf Lam...", opsi: ["Tidak dibaca / dilebur ke huruf setelahnya", "Dibaca jelas dan panjang", "Dibaca dengung", "Dibaca tebal"], jawabanBenar: "Tidak dibaca / dilebur ke huruf setelahnya" },
        { pertanyaan: "Ikhfa Haqiqi memiliki jumlah huruf sebanyak...", opsi: ["15 huruf", "10 huruf", "6 huruf", "4 huruf"], jawabanBenar: "15 huruf" },
        { pertanyaan: "Nun mati bertemu huruf Wau dalam SATU kata (seperti kata 'قِنْوَان') dibaca...", opsi: ["Idzhar (tidak melebur)", "Idgham Bighunnah", "Ikhfa", "Iqlab"], jawabanBenar: "Idzhar (tidak melebur)" },
        { pertanyaan: "Pada bacaan Alif Lam Qamariyah, huruf Lam dibaca...", opsi: ["Jelas (tidak dilebur)", "Dilebur ke huruf setelahnya", "Berdengung", "Tidak dibaca sama sekali"], jawabanBenar: "Jelas (tidak dilebur)" },
        { pertanyaan: "Mad 'Iwadh terjadi ketika berhenti (waqaf) pada...", opsi: ["Tanwin fathah di akhir kata", "Tanwin dhammah di akhir kata", "Huruf sukun biasa", "Huruf bertasydid"], jawabanBenar: "Tanwin fathah di akhir kata" },
        { pertanyaan: "Ghunnah Musyaddadah terjadi pada huruf Mim atau Nun yang...", opsi: ["Bertasydid", "Sukun biasa", "Berharakat fathah", "Berada di awal kata"], jawabanBenar: "Bertasydid" }
    ],
    lanjut: [
        { pertanyaan: "Hukum 'Mad Jaiz Munfashil' terjadi apabila...", opsi: ["Mad bertemu hamzah di lain kata", "Mad bertemu hamzah di satu kata", "Mad bertemu huruf sukun", "Mad bertemu tasydid"], jawabanBenar: "Mad bertemu hamzah di lain kata" },
        { pertanyaan: "Huruf 'Ra' dibaca Tafkhim (tebal) apabila...", opsi: ["Ra berharakat Kasrah", "Ra sukun didahului Kasrah", "Ra berharakat Fathah/Dhammah", "Ra didahului Ya sukun"], jawabanBenar: "Ra berharakat Fathah/Dhammah" },
        { pertanyaan: "Mad Lazim Mutsaqqal Kalimi terjadi ketika mad bertemu huruf bertasydid dalam satu kata, dibaca...", opsi: ["6 harakat", "2 harakat", "4 harakat", "3 harakat"], jawabanBenar: "6 harakat" },
        { pertanyaan: "Mad Lazim Mukhaffaf Kalimi terjadi ketika mad bertemu huruf...", opsi: ["Sukun (bukan tasydid) dalam satu kata", "Hamzah di lain kata", "Tasydid di lain kata", "Huruf hidup"], jawabanBenar: "Sukun (bukan tasydid) dalam satu kata" },
        { pertanyaan: "Huruf Lin adalah...", opsi: ["Wau sukun / Ya sukun yang didahului fathah", "Nun sukun yang didahului dhammah", "Mim sukun yang didahului kasrah", "Alif yang didahului fathah"], jawabanBenar: "Wau sukun / Ya sukun yang didahului fathah" },
        { pertanyaan: "Tanda waqaf 'مـ' (mim kecil) disebut waqaf...", opsi: ["Waqaf Lazim (harus berhenti)", "Waqaf Jaiz (boleh pilih)", "Waqaf Muraqabah", "Waqaf Mamnu' (dilarang berhenti)"], jawabanBenar: "Waqaf Lazim (harus berhenti)" },
        { pertanyaan: "Saktah dalam bacaan Al-Qur'an adalah...", opsi: ["Berhenti sejenak tanpa bernapas dan tanpa memutus bacaan", "Berhenti lama sambil bernapas", "Mengulang bacaan dari awal ayat", "Membaca dengan suara pelan"], jawabanBenar: "Berhenti sejenak tanpa bernapas dan tanpa memutus bacaan" },
        { pertanyaan: "Isymam pada bacaan seperti 'لَا تَأْمَنَّا' adalah...", opsi: ["Memoncongkan bibir tanpa suara saat huruf sukun", "Mendengungkan huruf mim", "Membaca huruf dengan tebal", "Menghentikan bacaan total"], jawabanBenar: "Memoncongkan bibir tanpa suara saat huruf sukun" },
        { pertanyaan: "Sifat huruf yang membuat Ra bisa dibaca Jawazul Wajhain (boleh tebal atau tipis) biasanya terjadi karena...", opsi: ["Perbedaan riwayat qiraat", "Selalu tebal tanpa pengecualian", "Selalu tipis tanpa pengecualian", "Tidak pernah terjadi dalam Al-Qur'an"], jawabanBenar: "Perbedaan riwayat qiraat" },
        { pertanyaan: "Mad Farq terjadi pada pertemuan...", opsi: ["Dua hamzah istifham dengan alif washal, dibaca 6 harakat", "Mad dengan huruf sukun biasa, dibaca 2 harakat", "Mad dengan tasydid di lain kata", "Mad di akhir ayat saja"], jawabanBenar: "Dua hamzah istifham dengan alif washal, dibaca 6 harakat" },
        { pertanyaan: "Mad Shilah Qashirah terjadi pada Ha Dhamir yang...", opsi: ["Diapit dua huruf berharakat", "Bertemu hamzah", "Bertemu huruf sukun", "Berada di akhir ayat"], jawabanBenar: "Diapit dua huruf berharakat" },
        { pertanyaan: "Mad Shilah Thawilah terjadi ketika Ha Dhamir bertemu...", opsi: ["Hamzah", "Huruf sukun", "Huruf bertasydid", "Huruf mad"], jawabanBenar: "Hamzah" },
        { pertanyaan: "Mad Badal terjadi ketika hamzah bertemu huruf mad dalam satu kata, di mana hamzah berfungsi sebagai...", opsi: ["Pengganti huruf mad", "Penambah harakat", "Penghubung kata", "Tanda waqaf"], jawabanBenar: "Pengganti huruf mad" },
        { pertanyaan: "Mad 'Aridh Lissukun terjadi ketika...", opsi: ["Mad Thabi'i bertemu huruf sukun karena waqaf", "Mad bertemu hamzah di lain kata", "Mad bertemu tasydid dalam satu kata", "Mad berada di tengah ayat"], jawabanBenar: "Mad Thabi'i bertemu huruf sukun karena waqaf" },
        { pertanyaan: "Huruf Lam dibaca Tafkhim (tebal) hanya pada lafaz Allah, yaitu ketika...", opsi: ["Didahului harakat fathah atau dhammah", "Didahului harakat kasrah", "Berada di awal kalimat", "Selalu dibaca tebal tanpa syarat"], jawabanBenar: "Didahului harakat fathah atau dhammah" }
    ]
};

const bankSoalMakharijul = {
    dasar: [
        { pertanyaan: "Makhraj huruf (م) Mim dan (ب) Ba berasal dari?", opsi: ["Tenggorokan", "Rongga Mulut", "Dua Bibir (Syafatain)", "Hidung"], jawabanBenar: "Dua Bibir (Syafatain)" },
        { pertanyaan: "Huruf yang keluar dari pangkal tenggorokan adalah?", opsi: ["Hamzah dan Ha (ء, هـ)", "Ain dan Ha (ع, ح)", "Kha dan Ghain (خ, غ)", "Qaf dan Kaf (ق, ك)"], jawabanBenar: "Hamzah dan Ha (ء, هـ)" },
        { pertanyaan: "Secara umum, ilmu tajwid membagi makhraj huruf menjadi berapa bagian besar?", opsi: ["5 (Jauf, Halq, Lisan, Syafatain, Khaisyum)", "3 bagian", "10 bagian", "2 bagian"], jawabanBenar: "5 (Jauf, Halq, Lisan, Syafatain, Khaisyum)" },
        { pertanyaan: "Jauf artinya makhraj yang berada di...", opsi: ["Rongga mulut dan tenggorokan", "Ujung lidah", "Dua bibir", "Rongga hidung"], jawabanBenar: "Rongga mulut dan tenggorokan" },
        { pertanyaan: "Khaisyum adalah makhraj yang berasal dari...", opsi: ["Rongga hidung", "Rongga mulut", "Pangkal lidah", "Bibir bawah"], jawabanBenar: "Rongga hidung" },
        { pertanyaan: "Suara yang keluar dari makhraj Khaisyum biasanya muncul pada bacaan...", opsi: ["Ghunnah (dengung)", "Qalqalah", "Mad Thabi'i", "Idzhar"], jawabanBenar: "Ghunnah (dengung)" },
        { pertanyaan: "Lisan artinya...", opsi: ["Lidah, tempat keluarnya huruf terbanyak", "Bibir", "Hidung", "Tenggorokan"], jawabanBenar: "Lidah, tempat keluarnya huruf terbanyak" },
        { pertanyaan: "Syafatain artinya...", opsi: ["Dua bibir", "Dua lidah", "Dua gigi", "Dua rongga"], jawabanBenar: "Dua bibir" },
        { pertanyaan: "Huruf Wawu (و) dan Ya (ي) sebagai huruf mad keluar dari makhraj...", opsi: ["Jauf (rongga mulut)", "Syafatain", "Khaisyum", "Halq"], jawabanBenar: "Jauf (rongga mulut)" },
        { pertanyaan: "Huruf Fa (ف) keluar dari...", opsi: ["Perut bibir bawah menyentuh ujung gigi seri atas", "Dua bibir bertemu", "Ujung lidah", "Pangkal tenggorokan"], jawabanBenar: "Perut bibir bawah menyentuh ujung gigi seri atas" },
        { pertanyaan: "Huruf Hijaiyah berjumlah...", opsi: ["29 huruf", "26 huruf", "30 huruf", "25 huruf"], jawabanBenar: "29 huruf" },
        { pertanyaan: "Makhraj artinya...", opsi: ["Tempat keluarnya huruf", "Cara membaca huruf", "Panjang bacaan huruf", "Sifat huruf"], jawabanBenar: "Tempat keluarnya huruf" },
        { pertanyaan: "Huruf Alif sebagai huruf mad keluar dari makhraj...", opsi: ["Jauf", "Halq", "Lisan", "Khaisyum"], jawabanBenar: "Jauf" },
        { pertanyaan: "Belajar makharijul huruf bertujuan agar bacaan Al-Qur'an...", opsi: ["Fasih dan sesuai kaidah", "Lebih cepat dibaca", "Lebih pelan dibaca", "Lebih keras suaranya"], jawabanBenar: "Fasih dan sesuai kaidah" },
        { pertanyaan: "Huruf Ba (ب) termasuk kelompok huruf...", opsi: ["Syafatain (dua bibir)", "Halq (tenggorokan)", "Lisan (lidah)", "Khaisyum (hidung)"], jawabanBenar: "Syafatain (dua bibir)" }
    ],
    menengah: [
        { pertanyaan: "Huruf (ض) Dhad keluar dari...", opsi: ["Ujung lidah menempel gigi seri atas", "Tepi lidah menempel gigi geraham", "Tengah lidah menempel langit-langit", "Rongga hidung"], jawabanBenar: "Tepi lidah menempel gigi geraham" },
        { pertanyaan: "Huruf Tha, Dal, dan Ta (ط د ت) keluar dari...", opsi: ["Ujung lidah menempel pangkal gigi seri atas", "Tepi lidah", "Pangkal lidah", "Dua bibir"], jawabanBenar: "Ujung lidah menempel pangkal gigi seri atas" },
        { pertanyaan: "Huruf Lam (ل) keluar dari...", opsi: ["Tepi lidah menyentuh gusi/langit-langit depan", "Pangkal lidah", "Tengah lidah", "Bibir bawah"], jawabanBenar: "Tepi lidah menyentuh gusi/langit-langit depan" },
        { pertanyaan: "Huruf Nun (ن) keluar dari...", opsi: ["Ujung lidah, tepat di bawah makhraj Lam", "Pangkal tenggorokan", "Dua bibir", "Rongga hidung sepenuhnya"], jawabanBenar: "Ujung lidah, tepat di bawah makhraj Lam" },
        { pertanyaan: "Huruf Ra (ر) keluar dari...", opsi: ["Ujung lidah, sedikit masuk dari makhraj Nun", "Tenggorokan bagian tengah", "Bibir atas", "Pangkal lidah"], jawabanBenar: "Ujung lidah, sedikit masuk dari makhraj Nun" },
        { pertanyaan: "Huruf Jim, Syin, dan Ya (ج ش ي) keluar dari...", opsi: ["Tengah lidah bertemu langit-langit tengah", "Ujung lidah", "Pangkal lidah", "Dua bibir"], jawabanBenar: "Tengah lidah bertemu langit-langit tengah" },
        { pertanyaan: "Huruf Qaf (ق) keluar dari...", opsi: ["Pangkal lidah dekat tenggorokan bertemu langit-langit lunak", "Ujung lidah", "Tengah lidah", "Bibir bawah"], jawabanBenar: "Pangkal lidah dekat tenggorokan bertemu langit-langit lunak" },
        { pertanyaan: "Huruf Kaf (ك) keluar dari...", opsi: ["Pangkal lidah, sedikit di depan makhraj Qaf", "Ujung lidah", "Tepi lidah", "Dua bibir"], jawabanBenar: "Pangkal lidah, sedikit di depan makhraj Qaf" },
        { pertanyaan: "Huruf Fa (ف) keluar dari...", opsi: ["Perut bibir bawah dan ujung gigi seri atas", "Dua bibir rapat", "Ujung lidah", "Tengah lidah"], jawabanBenar: "Perut bibir bawah dan ujung gigi seri atas" },
        { pertanyaan: "Huruf Tsa, Dzal, dan Zha (ث ذ ظ) keluar dari...", opsi: ["Ujung lidah bertemu ujung dua gigi seri atas", "Tepi lidah", "Pangkal lidah", "Dua bibir"], jawabanBenar: "Ujung lidah bertemu ujung dua gigi seri atas" },
        { pertanyaan: "Huruf Shad, Sin, dan Za (ص س ز) keluar dari...", opsi: ["Ujung lidah dekat gigi seri bawah", "Tengah lidah", "Pangkal lidah", "Dua bibir"], jawabanBenar: "Ujung lidah dekat gigi seri bawah" },
        { pertanyaan: "Huruf Ain dan Ha (ع ح) keluar dari...", opsi: ["Pertengahan tenggorokan", "Pangkal tenggorokan", "Ujung tenggorokan dekat mulut", "Rongga hidung"], jawabanBenar: "Pertengahan tenggorokan" },
        { pertanyaan: "Huruf Ghain dan Kha (غ خ) keluar dari...", opsi: ["Ujung tenggorokan dekat mulut", "Pangkal tenggorokan", "Pertengahan tenggorokan", "Rongga hidung"], jawabanBenar: "Ujung tenggorokan dekat mulut" },
        { pertanyaan: "Huruf Wawu (و) sebagai huruf konsonan (bukan huruf mad) keluar dari...", opsi: ["Dua bibir", "Tenggorokan", "Ujung lidah", "Rongga hidung"], jawabanBenar: "Dua bibir" },
        { pertanyaan: "Huruf Dal, Ta, dan Tha (د ت ط) sering disebut sekelompok huruf karena sama-sama keluar dari...", opsi: ["Ujung lidah dan pangkal gigi seri atas", "Tepi lidah", "Tengah lidah", "Dua bibir"], jawabanBenar: "Ujung lidah dan pangkal gigi seri atas" },
        { pertanyaan: "Huruf Mim (م) selain sebagai huruf Syafatain, juga memiliki sifat Ghunnah karena melibatkan makhraj...", opsi: ["Khaisyum (rongga hidung)", "Halq (tenggorokan)", "Lisan (lidah)", "Jauf (rongga mulut)"], jawabanBenar: "Khaisyum (rongga hidung)" }
    ],
    lanjut: [
        { pertanyaan: "Apa yang dimaksud dengan sifat Hams?", opsi: ["Suara tertahan", "Napas mengalir saat diucapkan", "Suara memantul", "Suara meninggi"], jawabanBenar: "Napas mengalir saat diucapkan" },
        { pertanyaan: "Sifat Jahr adalah kebalikan dari Hams, yaitu...", opsi: ["Suara tertahan, napas tidak mengalir", "Napas mengalir bebas", "Suara memantul", "Suara berdengung"], jawabanBenar: "Suara tertahan, napas tidak mengalir" },
        { pertanyaan: "Sifat Syiddah artinya...", opsi: ["Suara tertahan penuh karena makhraj tertutup rapat", "Suara mengalir lancar", "Suara memantul", "Suara berdengung"], jawabanBenar: "Suara tertahan penuh karena makhraj tertutup rapat" },
        { pertanyaan: "Sifat Rakhawah artinya...", opsi: ["Suara mengalir lancar karena makhraj tidak tertutup rapat", "Suara tertahan penuh", "Suara memantul", "Suara meninggi"], jawabanBenar: "Suara mengalir lancar karena makhraj tidak tertutup rapat" },
        { pertanyaan: "Sifat Isti'la artinya...", opsi: ["Lidah terangkat ke langit-langit (bacaan tebal)", "Lidah turun ke dasar mulut", "Lidah menyentuh gigi", "Lidah diam di tengah"], jawabanBenar: "Lidah terangkat ke langit-langit (bacaan tebal)" },
        { pertanyaan: "Sifat Istifal artinya...", opsi: ["Lidah turun ke dasar mulut (bacaan tipis)", "Lidah terangkat ke langit-langit", "Lidah bergetar", "Lidah menempel langit-langit"], jawabanBenar: "Lidah turun ke dasar mulut (bacaan tipis)" },
        { pertanyaan: "Sifat Qalqalah termasuk sifat...", opsi: ["'Aridhah (muncul kadang-kadang, saat sukun)", "Lazimah (selalu ada)", "Hams", "Jahr"], jawabanBenar: "'Aridhah (muncul kadang-kadang, saat sukun)" },
        { pertanyaan: "Huruf dengan sifat Ithbaq (lidah menempel langit-langit) ada 4, yaitu...", opsi: ["Shad, Dhad, Tha, Zha (ص ض ط ظ)", "Ba, Ta, Tsa, Jim", "Hamzah, Ha, Kha, Ain", "Ya, Nun, Mim, Wau"], jawabanBenar: "Shad, Dhad, Tha, Zha (ص ض ط ظ)" },
        { pertanyaan: "Sifat Shafir (siulan) dimiliki oleh huruf...", opsi: ["Shad, Sin, Za (ص س ز)", "Qaf, Kaf", "Lam, Ra", "Mim, Nun"], jawabanBenar: "Shad, Sin, Za (ص س ز)" },
        { pertanyaan: "Sifat Takrir (bergetar) dimiliki oleh huruf...", opsi: ["Ra (ر)", "Lam (ل)", "Nun (ن)", "Mim (م)"], jawabanBenar: "Ra (ر)" },
        { pertanyaan: "Sifat Idzlaq (mudah diucapkan) dimiliki 6 huruf yang biasa dihafal lewat kalimat...", opsi: ["Fir min lubb", "Qutbujad", "Fahaffa 'aina khoq", "Idzhar halqi"], jawabanBenar: "Fir min lubb" },
        { pertanyaan: "Sifat Ishmat adalah kebalikan dari sifat...", opsi: ["Idzlaq", "Isti'la", "Qalqalah", "Ghunnah"], jawabanBenar: "Idzlaq" },
        { pertanyaan: "Sifat Inhiraf (condong) dimiliki oleh huruf...", opsi: ["Lam dan Ra", "Syin dan Dhad", "Mim dan Nun", "Ba dan Ta"], jawabanBenar: "Lam dan Ra" },
        { pertanyaan: "Sifat Tafasysyi (menyebar anginnya di mulut) dimiliki oleh huruf...", opsi: ["Syin (ش)", "Dhad (ض)", "Ra (ر)", "Lam (ل)"], jawabanBenar: "Syin (ش)" },
        { pertanyaan: "Sifat Istithalah (memanjang makhrajnya) dimiliki oleh huruf...", opsi: ["Dhad (ض)", "Syin (ش)", "Ra (ر)", "Qaf (ق)"], jawabanBenar: "Dhad (ض)" }
    ]
};

const bankSoalJuz30 = {
    // Fokus murni SAMBUNG AYAT: setiap soal menampilkan SATU ayat penuh (tidak
    // pernah dipotong di tengah kata/ayat), lalu meminta ayat SELANJUTNYA secara
    // utuh. Tidak ada lagi soal tentang isi/arti surat atau jumlah ayat.
    dasar: [
        { pertanyaan: "Lanjutkan ayat: 'قُلْ هُوَ اللَّهُ أَحَدٌ'", opsi: ["اللَّهُ الصَّمَدُ", "مِنْ شَرِّ مَا خَلَقَ", "مَلِكِ النَّاسِ", "فَصَلِّ لِرَبِّكَ وَانْحَرْ"], jawabanBenar: "اللَّهُ الصَّمَدُ" },
        { pertanyaan: "Lanjutkan ayat: 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ'", opsi: ["مِنْ شَرِّ مَا خَلَقَ", "مَلِكِ النَّاسِ", "فَصَلِّ لِرَبِّكَ وَانْحَرْ", "لَا أَعْبُدُ مَا تَعْبُدُونَ"], jawabanBenar: "مِنْ شَرِّ مَا خَلَقَ" },
        { pertanyaan: "Lanjutkan ayat: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ'", opsi: ["مَلِكِ النَّاسِ", "فَصَلِّ لِرَبِّكَ وَانْحَرْ", "لَا أَعْبُدُ مَا تَعْبُدُونَ", "وَرَأَيْتَ النَّاسَ يَدْخُلُونَ فِي دِينِ اللَّهِ أَفْوَاجًا"], jawabanBenar: "مَلِكِ النَّاسِ" },
        { pertanyaan: "Lanjutkan ayat: 'إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ'", opsi: ["فَصَلِّ لِرَبِّكَ وَانْحَرْ", "لَا أَعْبُدُ مَا تَعْبُدُونَ", "وَرَأَيْتَ النَّاسَ يَدْخُلُونَ فِي دِينِ اللَّهِ أَفْوَاجًا", "مَا أَغْنَىٰ عَنْهُ مَالُهُ وَمَا كَسَبَ"], jawabanBenar: "فَصَلِّ لِرَبِّكَ وَانْحَرْ" },
        { pertanyaan: "Lanjutkan ayat: 'قُلْ يَا أَيُّهَا الْكَافِرُونَ'", opsi: ["لَا أَعْبُدُ مَا تَعْبُدُونَ", "وَرَأَيْتَ النَّاسَ يَدْخُلُونَ فِي دِينِ اللَّهِ أَفْوَاجًا", "مَا أَغْنَىٰ عَنْهُ مَالُهُ وَمَا كَسَبَ", "إِيلَافِهِمْ رِحْلَةَ الشِّتَاءِ وَالصَّيْفِ"], jawabanBenar: "لَا أَعْبُدُ مَا تَعْبُدُونَ" },
        { pertanyaan: "Lanjutkan ayat: 'إِذَا جَاءَ نَصْرُ اللَّهِ وَالْفَتْحُ'", opsi: ["وَرَأَيْتَ النَّاسَ يَدْخُلُونَ فِي دِينِ اللَّهِ أَفْوَاجًا", "مَا أَغْنَىٰ عَنْهُ مَالُهُ وَمَا كَسَبَ", "إِيلَافِهِمْ رِحْلَةَ الشِّتَاءِ وَالصَّيْفِ", "فَذَٰلِكَ الَّذِي يَدُعُّ الْيَتِيمَ"], jawabanBenar: "وَرَأَيْتَ النَّاسَ يَدْخُلُونَ فِي دِينِ اللَّهِ أَفْوَاجًا" },
        { pertanyaan: "Lanjutkan ayat: 'تَبَّتْ يَدَا أَبِي لَهَبٍ وَتَبَّ'", opsi: ["مَا أَغْنَىٰ عَنْهُ مَالُهُ وَمَا كَسَبَ", "إِيلَافِهِمْ رِحْلَةَ الشِّتَاءِ وَالصَّيْفِ", "فَذَٰلِكَ الَّذِي يَدُعُّ الْيَتِيمَ", "الَّذِي جَمَعَ مَالًا وَعَدَّدَهُ"], jawabanBenar: "مَا أَغْنَىٰ عَنْهُ مَالُهُ وَمَا كَسَبَ" },
        { pertanyaan: "Lanjutkan ayat: 'لِإِيلَافِ قُرَيْشٍ'", opsi: ["إِيلَافِهِمْ رِحْلَةَ الشِّتَاءِ وَالصَّيْفِ", "فَذَٰلِكَ الَّذِي يَدُعُّ الْيَتِيمَ", "الَّذِي جَمَعَ مَالًا وَعَدَّدَهُ", "أَلَمْ يَجْعَلْ كَيْدَهُمْ فِي تَضْلِيلٍ"], jawabanBenar: "إِيلَافِهِمْ رِحْلَةَ الشِّتَاءِ وَالصَّيْفِ" },
        { pertanyaan: "Lanjutkan ayat: 'أَرَأَيْتَ الَّذِي يُكَذِّبُ بِالدِّينِ'", opsi: ["فَذَٰلِكَ الَّذِي يَدُعُّ الْيَتِيمَ", "الَّذِي جَمَعَ مَالًا وَعَدَّدَهُ", "أَلَمْ يَجْعَلْ كَيْدَهُمْ فِي تَضْلِيلٍ", "إِنَّ الْإِنسَانَ لَفِي خُسْرٍ"], jawabanBenar: "فَذَٰلِكَ الَّذِي يَدُعُّ الْيَتِيمَ" },
        { pertanyaan: "Lanjutkan ayat: 'وَيْلٌ لِّكُلِّ هُمَزَةٍ لُّمَزَةٍ'", opsi: ["الَّذِي جَمَعَ مَالًا وَعَدَّدَهُ", "أَلَمْ يَجْعَلْ كَيْدَهُمْ فِي تَضْلِيلٍ", "إِنَّ الْإِنسَانَ لَفِي خُسْرٍ", "حَتَّىٰ زُرْتُمُ الْمَقَابِرَ"], jawabanBenar: "الَّذِي جَمَعَ مَالًا وَعَدَّدَهُ" },
        { pertanyaan: "Lanjutkan ayat: 'أَلَمْ تَرَ كَيْفَ فَعَلَ رَبُّكَ بِأَصْحَابِ الْفِيلِ'", opsi: ["أَلَمْ يَجْعَلْ كَيْدَهُمْ فِي تَضْلِيلٍ", "إِنَّ الْإِنسَانَ لَفِي خُسْرٍ", "حَتَّىٰ زُرْتُمُ الْمَقَابِرَ", "مَا الْقَارِعَةُ"], jawabanBenar: "أَلَمْ يَجْعَلْ كَيْدَهُمْ فِي تَضْلِيلٍ" },
        { pertanyaan: "Lanjutkan ayat: 'وَالْعَصْرِ'", opsi: ["إِنَّ الْإِنسَانَ لَفِي خُسْرٍ", "حَتَّىٰ زُرْتُمُ الْمَقَابِرَ", "مَا الْقَارِعَةُ", "فَالْمُورِيَاتِ قَدْحًا"], jawabanBenar: "إِنَّ الْإِنسَانَ لَفِي خُسْرٍ" },
        { pertanyaan: "Lanjutkan ayat: 'أَلْهَاكُمُ التَّكَاثُرُ'", opsi: ["حَتَّىٰ زُرْتُمُ الْمَقَابِرَ", "مَا الْقَارِعَةُ", "فَالْمُورِيَاتِ قَدْحًا", "اللَّهُ الصَّمَدُ"], jawabanBenar: "حَتَّىٰ زُرْتُمُ الْمَقَابِرَ" },
        { pertanyaan: "Lanjutkan ayat: 'الْقَارِعَةُ'", opsi: ["مَا الْقَارِعَةُ", "فَالْمُورِيَاتِ قَدْحًا", "اللَّهُ الصَّمَدُ", "مِنْ شَرِّ مَا خَلَقَ"], jawabanBenar: "مَا الْقَارِعَةُ" },
        { pertanyaan: "Lanjutkan ayat: 'وَالْعَادِيَاتِ ضَبْحًا'", opsi: ["فَالْمُورِيَاتِ قَدْحًا", "اللَّهُ الصَّمَدُ", "مِنْ شَرِّ مَا خَلَقَ", "مَلِكِ النَّاسِ"], jawabanBenar: "فَالْمُورِيَاتِ قَدْحًا" }
    ],
    menengah: [
        { pertanyaan: "Lanjutkan ayat: 'إِذَا زُلْزِلَتِ الْأَرْضُ زِلْزَالَهَا'", opsi: ["وَأَخْرَجَتِ الْأَرْضُ أَثْقَالَهَا", "لَمْ يَلِدْ وَلَمْ يُولَدْ", "وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ", "إِلَٰهِ النَّاسِ"], jawabanBenar: "وَأَخْرَجَتِ الْأَرْضُ أَثْقَالَهَا" },
        { pertanyaan: "Lanjutkan ayat: 'اللَّهُ الصَّمَدُ'", opsi: ["لَمْ يَلِدْ وَلَمْ يُولَدْ", "وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ", "إِلَٰهِ النَّاسِ", "وَاللَّيْلِ إِذَا سَجَىٰ"], jawabanBenar: "لَمْ يَلِدْ وَلَمْ يُولَدْ" },
        { pertanyaan: "Lanjutkan ayat: 'مِنْ شَرِّ مَا خَلَقَ'", opsi: ["وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ", "إِلَٰهِ النَّاسِ", "وَاللَّيْلِ إِذَا سَجَىٰ", "وَوَضَعْنَا عَنكَ وِزْرَكَ"], jawabanBenar: "وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ" },
        { pertanyaan: "Lanjutkan ayat: 'مَلِكِ النَّاسِ'", opsi: ["إِلَٰهِ النَّاسِ", "وَاللَّيْلِ إِذَا سَجَىٰ", "وَوَضَعْنَا عَنكَ وِزْرَكَ", "وَطُورِ سِينِينَ"], jawabanBenar: "إِلَٰهِ النَّاسِ" },
        { pertanyaan: "Lanjutkan ayat: 'وَالضُّحَىٰ'", opsi: ["وَاللَّيْلِ إِذَا سَجَىٰ", "وَوَضَعْنَا عَنكَ وِزْرَكَ", "وَطُورِ سِينِينَ", "خَلَقَ الْإِنسَانَ مِنْ عَلَقٍ"], jawabanBenar: "وَاللَّيْلِ إِذَا سَجَىٰ" },
        { pertanyaan: "Lanjutkan ayat: 'أَلَمْ نَشْرَحْ لَكَ صَدْرَكَ'", opsi: ["وَوَضَعْنَا عَنكَ وِزْرَكَ", "وَطُورِ سِينِينَ", "خَلَقَ الْإِنسَانَ مِنْ عَلَقٍ", "وَمَا أَدْرَاكَ مَا لَيْلَةُ الْقَدْرِ"], jawabanBenar: "وَوَضَعْنَا عَنكَ وِزْرَكَ" },
        { pertanyaan: "Lanjutkan ayat: 'وَالتِّينِ وَالزَّيْتُونِ'", opsi: ["وَطُورِ سِينِينَ", "خَلَقَ الْإِنسَانَ مِنْ عَلَقٍ", "وَمَا أَدْرَاكَ مَا لَيْلَةُ الْقَدْرِ", "الَّذِي خَلَقَ فَسَوَّىٰ"], jawabanBenar: "وَطُورِ سِينِينَ" },
        { pertanyaan: "Lanjutkan ayat: 'اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ'", opsi: ["خَلَقَ الْإِنسَانَ مِنْ عَلَقٍ", "وَمَا أَدْرَاكَ مَا لَيْلَةُ الْقَدْرِ", "الَّذِي خَلَقَ فَسَوَّىٰ", "وُجُوهٌ يَوْمَئِذٍ خَاشِعَةٌ"], jawabanBenar: "خَلَقَ الْإِنسَانَ مِنْ عَلَقٍ" },
        { pertanyaan: "Lanjutkan ayat: 'إِنَّا أَنزَلْنَاهُ فِي لَيْلَةِ الْقَدْرِ'", opsi: ["وَمَا أَدْرَاكَ مَا لَيْلَةُ الْقَدْرِ", "الَّذِي خَلَقَ فَسَوَّىٰ", "وُجُوهٌ يَوْمَئِذٍ خَاشِعَةٌ", "إِنَّ شَانِئَكَ هُوَ الْأَبْتَرُ"], jawabanBenar: "وَمَا أَدْرَاكَ مَا لَيْلَةُ الْقَدْرِ" },
        { pertanyaan: "Lanjutkan ayat: 'سَبِّحِ اسْمَ رَبِّكَ الْأَعْلَى'", opsi: ["الَّذِي خَلَقَ فَسَوَّىٰ", "وُجُوهٌ يَوْمَئِذٍ خَاشِعَةٌ", "إِنَّ شَانِئَكَ هُوَ الْأَبْتَرُ", "وَأَرْسَلَ عَلَيْهِمْ طَيْرًا أَبَابِيلَ"], jawabanBenar: "الَّذِي خَلَقَ فَسَوَّىٰ" },
        { pertanyaan: "Lanjutkan ayat: 'هَلْ أَتَاكَ حَدِيثُ الْغَاشِيَةِ'", opsi: ["وُجُوهٌ يَوْمَئِذٍ خَاشِعَةٌ", "إِنَّ شَانِئَكَ هُوَ الْأَبْتَرُ", "وَأَرْسَلَ عَلَيْهِمْ طَيْرًا أَبَابِيلَ", "كَلَّا سَوْفَ تَعْلَمُونَ"], jawabanBenar: "وُجُوهٌ يَوْمَئِذٍ خَاشِعَةٌ" },
        { pertanyaan: "Lanjutkan ayat: 'فَصَلِّ لِرَبِّكَ وَانْحَرْ'", opsi: ["إِنَّ شَانِئَكَ هُوَ الْأَبْتَرُ", "وَأَرْسَلَ عَلَيْهِمْ طَيْرًا أَبَابِيلَ", "كَلَّا سَوْفَ تَعْلَمُونَ", "وَأَخْرَجَتِ الْأَرْضُ أَثْقَالَهَا"], jawabanBenar: "إِنَّ شَانِئَكَ هُوَ الْأَبْتَرُ" },
        { pertanyaan: "Lanjutkan ayat: 'أَلَمْ يَجْعَلْ كَيْدَهُمْ فِي تَضْلِيلٍ'", opsi: ["وَأَرْسَلَ عَلَيْهِمْ طَيْرًا أَبَابِيلَ", "كَلَّا سَوْفَ تَعْلَمُونَ", "وَأَخْرَجَتِ الْأَرْضُ أَثْقَالَهَا", "لَمْ يَلِدْ وَلَمْ يُولَدْ"], jawabanBenar: "وَأَرْسَلَ عَلَيْهِمْ طَيْرًا أَبَابِيلَ" },
        { pertanyaan: "Lanjutkan ayat: 'حَتَّىٰ زُرْتُمُ الْمَقَابِرَ'", opsi: ["كَلَّا سَوْفَ تَعْلَمُونَ", "وَأَخْرَجَتِ الْأَرْضُ أَثْقَالَهَا", "لَمْ يَلِدْ وَلَمْ يُولَدْ", "وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ"], jawabanBenar: "كَلَّا سَوْفَ تَعْلَمُونَ" }
    ],
    lanjut: [
        { pertanyaan: "Lanjutkan ayat: 'عَمَّ يَتَسَاءَلُونَ'", opsi: ["عَنِ النَّبَإِ الْعَظِيمِ", "الَّذِي هُمْ فِيهِ مُخْتَلِفُونَ", "وَالنَّاشِطَاتِ نَشْطًا", "أَن جَاءَهُ الْأَعْمَىٰ"], jawabanBenar: "عَنِ النَّبَإِ الْعَظِيمِ" },
        { pertanyaan: "Lanjutkan ayat: 'عَنِ النَّبَإِ الْعَظِيمِ'", opsi: ["الَّذِي هُمْ فِيهِ مُخْتَلِفُونَ", "وَالنَّاشِطَاتِ نَشْطًا", "أَن جَاءَهُ الْأَعْمَىٰ", "وَإِذَا النُّجُومُ انكَدَرَتْ"], jawabanBenar: "الَّذِي هُمْ فِيهِ مُخْتَلِفُونَ" },
        { pertanyaan: "Lanjutkan ayat: 'وَالنَّازِعَاتِ غَرْقًا'", opsi: ["وَالنَّاشِطَاتِ نَشْطًا", "أَن جَاءَهُ الْأَعْمَىٰ", "وَإِذَا النُّجُومُ انكَدَرَتْ", "وَإِذَا الْكَوَاكِبُ انتَثَرَتْ"], jawabanBenar: "وَالنَّاشِطَاتِ نَشْطًا" },
        { pertanyaan: "Lanjutkan ayat: 'عَبَسَ وَتَوَلَّىٰ'", opsi: ["أَن جَاءَهُ الْأَعْمَىٰ", "وَإِذَا النُّجُومُ انكَدَرَتْ", "وَإِذَا الْكَوَاكِبُ انتَثَرَتْ", "الَّذِينَ إِذَا اكْتَالُوا عَلَى النَّاسِ يَسْتَوْفُونَ"], jawabanBenar: "أَن جَاءَهُ الْأَعْمَىٰ" },
        { pertanyaan: "Lanjutkan ayat: 'إِذَا الشَّمْسُ كُوِّرَتْ'", opsi: ["وَإِذَا النُّجُومُ انكَدَرَتْ", "وَإِذَا الْكَوَاكِبُ انتَثَرَتْ", "الَّذِينَ إِذَا اكْتَالُوا عَلَى النَّاسِ يَسْتَوْفُونَ", "وَأَذِنَتْ لِرَبِّهَا وَحُقَّتْ"], jawabanBenar: "وَإِذَا النُّجُومُ انكَدَرَتْ" },
        { pertanyaan: "Lanjutkan ayat: 'إِذَا السَّمَاءُ انفَطَرَتْ'", opsi: ["وَإِذَا الْكَوَاكِبُ انتَثَرَتْ", "الَّذِينَ إِذَا اكْتَالُوا عَلَى النَّاسِ يَسْتَوْفُونَ", "وَأَذِنَتْ لِرَبِّهَا وَحُقَّتْ", "وَالْيَوْمِ الْمَوْعُودِ"], jawabanBenar: "وَإِذَا الْكَوَاكِبُ انتَثَرَتْ" },
        { pertanyaan: "Lanjutkan ayat: 'وَيْلٌ لِّلْمُطَفِّفِينَ'", opsi: ["الَّذِينَ إِذَا اكْتَالُوا عَلَى النَّاسِ يَسْتَوْفُونَ", "وَأَذِنَتْ لِرَبِّهَا وَحُقَّتْ", "وَالْيَوْمِ الْمَوْعُودِ", "وَمَا أَدْرَاكَ مَا الطَّارِقُ"], jawabanBenar: "الَّذِينَ إِذَا اكْتَالُوا عَلَى النَّاسِ يَسْتَوْفُونَ" },
        { pertanyaan: "Lanjutkan ayat: 'إِذَا السَّمَاءُ انشَقَّتْ'", opsi: ["وَأَذِنَتْ لِرَبِّهَا وَحُقَّتْ", "وَالْيَوْمِ الْمَوْعُودِ", "وَمَا أَدْرَاكَ مَا الطَّارِقُ", "وَلَيَالٍ عَشْرٍ"], jawabanBenar: "وَأَذِنَتْ لِرَبِّهَا وَحُقَّتْ" },
        { pertanyaan: "Lanjutkan ayat: 'وَالسَّمَاءِ ذَاتِ الْبُرُوجِ'", opsi: ["وَالْيَوْمِ الْمَوْعُودِ", "وَمَا أَدْرَاكَ مَا الطَّارِقُ", "وَلَيَالٍ عَشْرٍ", "وَأَنتَ حِلٌّ بِهَٰذَا الْبَلَدِ"], jawabanBenar: "وَالْيَوْمِ الْمَوْعُودِ" },
        { pertanyaan: "Lanjutkan ayat: 'وَالسَّمَاءِ وَالطَّارِقِ'", opsi: ["وَمَا أَدْرَاكَ مَا الطَّارِقُ", "وَلَيَالٍ عَشْرٍ", "وَأَنتَ حِلٌّ بِهَٰذَا الْبَلَدِ", "وَالْقَمَرِ إِذَا تَلَاهَا"], jawabanBenar: "وَمَا أَدْرَاكَ مَا الطَّارِقُ" },
        { pertanyaan: "Lanjutkan ayat: 'وَالْفَجْرِ'", opsi: ["وَلَيَالٍ عَشْرٍ", "وَأَنتَ حِلٌّ بِهَٰذَا الْبَلَدِ", "وَالْقَمَرِ إِذَا تَلَاهَا", "وَالنَّهَارِ إِذَا تَجَلَّىٰ"], jawabanBenar: "وَلَيَالٍ عَشْرٍ" },
        { pertanyaan: "Lanjutkan ayat: 'لَا أُقْسِمُ بِهَٰذَا الْبَلَدِ'", opsi: ["وَأَنتَ حِلٌّ بِهَٰذَا الْبَلَدِ", "وَالْقَمَرِ إِذَا تَلَاهَا", "وَالنَّهَارِ إِذَا تَجَلَّىٰ", "عَنِ النَّبَإِ الْعَظِيمِ"], jawabanBenar: "وَأَنتَ حِلٌّ بِهَٰذَا الْبَلَدِ" },
        { pertanyaan: "Lanjutkan ayat: 'وَالشَّمْسِ وَضُحَاهَا'", opsi: ["وَالْقَمَرِ إِذَا تَلَاهَا", "وَالنَّهَارِ إِذَا تَجَلَّىٰ", "عَنِ النَّبَإِ الْعَظِيمِ", "الَّذِي هُمْ فِيهِ مُخْتَلِفُونَ"], jawabanBenar: "وَالْقَمَرِ إِذَا تَلَاهَا" },
        { pertanyaan: "Lanjutkan ayat: 'وَاللَّيْلِ إِذَا يَغْشَىٰ'", opsi: ["وَالنَّهَارِ إِذَا تَجَلَّىٰ", "عَنِ النَّبَإِ الْعَظِيمِ", "الَّذِي هُمْ فِيهِ مُخْتَلِفُونَ", "وَالنَّاشِطَاتِ نَشْطًا"], jawabanBenar: "وَالنَّهَارِ إِذَا تَجَلَّىٰ" }
    ]
};

const bankSoalJuz29 = {
    // Sama seperti Juz 30: murni sambung-ayat, ayat penuh ke ayat penuh.
    dasar: [
        { pertanyaan: "Lanjutkan ayat: 'تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ'", opsi: ["الَّذِي خَلَقَ الْمَوْتَ وَالْحَيَاةَ لِيَبْلُوَكُمْ أَيُّكُمْ أَحْسَنُ عَمَلًا ۚ وَهُوَ الْعَزِيزُ الْغَفُورُ", "مَا أَنتَ بِنِعْمَةِ رَبِّكَ بِمَجْنُونٍ", "مَا الْحَاقَّةُ", "لِّلْكَافِرِينَ لَيْسَ لَهُ دَافِعٌ"], jawabanBenar: "الَّذِي خَلَقَ الْمَوْتَ وَالْحَيَاةَ لِيَبْلُوَكُمْ أَيُّكُمْ أَحْسَنُ عَمَلًا ۚ وَهُوَ الْعَزِيزُ الْغَفُورُ" },
        { pertanyaan: "Lanjutkan ayat: 'نٓ ۚ وَالْقَلَمِ وَمَا يَسْطُرُونَ'", opsi: ["مَا أَنتَ بِنِعْمَةِ رَبِّكَ بِمَجْنُونٍ", "مَا الْحَاقَّةُ", "لِّلْكَافِرِينَ لَيْسَ لَهُ دَافِعٌ", "قَالَ يَا قَوْمِ إِنِّي لَكُمْ نَذِيرٌ مُّبِينٌ"], jawabanBenar: "مَا أَنتَ بِنِعْمَةِ رَبِّكَ بِمَجْنُونٍ" },
        { pertanyaan: "Lanjutkan ayat: 'الْحَاقَّةُ'", opsi: ["مَا الْحَاقَّةُ", "لِّلْكَافِرِينَ لَيْسَ لَهُ دَافِعٌ", "قَالَ يَا قَوْمِ إِنِّي لَكُمْ نَذِيرٌ مُّبِينٌ", "يَهْدِي إِلَى الرُّشْدِ فَآمَنَّا بِهِ ۖ وَلَن نُّشْرِكَ بِرَبِّنَا أَحَدًا"], jawabanBenar: "مَا الْحَاقَّةُ" },
        { pertanyaan: "Lanjutkan ayat: 'سَأَلَ سَائِلٌ بِعَذَابٍ وَاقِعٍ'", opsi: ["لِّلْكَافِرِينَ لَيْسَ لَهُ دَافِعٌ", "قَالَ يَا قَوْمِ إِنِّي لَكُمْ نَذِيرٌ مُّبِينٌ", "يَهْدِي إِلَى الرُّشْدِ فَآمَنَّا بِهِ ۖ وَلَن نُّشْرِكَ بِرَبِّنَا أَحَدًا", "قُمِ اللَّيْلَ إِلَّا قَلِيلًا"], jawabanBenar: "لِّلْكَافِرِينَ لَيْسَ لَهُ دَافِعٌ" },
        { pertanyaan: "Lanjutkan ayat: 'إِنَّا أَرْسَلْنَا نُوحًا إِلَىٰ قَوْمِهِ أَنْ أَنذِرْ قَوْمَكَ مِن قَبْلِ أَن يَأْتِيَهُمْ عَذَابٌ أَلِيمٌ'", opsi: ["قَالَ يَا قَوْمِ إِنِّي لَكُمْ نَذِيرٌ مُّبِينٌ", "يَهْدِي إِلَى الرُّشْدِ فَآمَنَّا بِهِ ۖ وَلَن نُّشْرِكَ بِرَبِّنَا أَحَدًا", "قُمِ اللَّيْلَ إِلَّا قَلِيلًا", "قُمْ فَأَنذِرْ"], jawabanBenar: "قَالَ يَا قَوْمِ إِنِّي لَكُمْ نَذِيرٌ مُّبِينٌ" },
        { pertanyaan: "Lanjutkan ayat: 'قُلْ أُوحِيَ إِلَيَّ أَنَّهُ اسْتَمَعَ نَفَرٌ مِّنَ الْجِنِّ فَقَالُوا إِنَّا سَمِعْنَا قُرْآنًا عَجَبًا'", opsi: ["يَهْدِي إِلَى الرُّشْدِ فَآمَنَّا بِهِ ۖ وَلَن نُّشْرِكَ بِرَبِّنَا أَحَدًا", "قُمِ اللَّيْلَ إِلَّا قَلِيلًا", "قُمْ فَأَنذِرْ", "وَلَا أُقْسِمُ بِالنَّفْسِ اللَّوَّامَةِ"], jawabanBenar: "يَهْدِي إِلَى الرُّشْدِ فَآمَنَّا بِهِ ۖ وَلَن نُّشْرِكَ بِرَبِّنَا أَحَدًا" },
        { pertanyaan: "Lanjutkan ayat: 'يَا أَيُّهَا الْمُزَّمِّلُ'", opsi: ["قُمِ اللَّيْلَ إِلَّا قَلِيلًا", "قُمْ فَأَنذِرْ", "وَلَا أُقْسِمُ بِالنَّفْسِ اللَّوَّامَةِ", "إِنَّا خَلَقْنَا الْإِنسَانَ مِن نُّطْفَةٍ أَمْشَاجٍ نَّبْتَلِيهِ فَجَعَلْنَاهُ سَمِيعًا بَصِيرًا"], jawabanBenar: "قُمِ اللَّيْلَ إِلَّا قَلِيلًا" },
        { pertanyaan: "Lanjutkan ayat: 'يَا أَيُّهَا الْمُدَّثِّرُ'", opsi: ["قُمْ فَأَنذِرْ", "وَلَا أُقْسِمُ بِالنَّفْسِ اللَّوَّامَةِ", "إِنَّا خَلَقْنَا الْإِنسَانَ مِن نُّطْفَةٍ أَمْشَاجٍ نَّبْتَلِيهِ فَجَعَلْنَاهُ سَمِيعًا بَصِيرًا", "فَالْعَاصِفَاتِ عَصْفًا"], jawabanBenar: "قُمْ فَأَنذِرْ" },
        { pertanyaan: "Lanjutkan ayat: 'لَا أُقْسِمُ بِيَوْمِ الْقِيَامَةِ'", opsi: ["وَلَا أُقْسِمُ بِالنَّفْسِ اللَّوَّامَةِ", "إِنَّا خَلَقْنَا الْإِنسَانَ مِن نُّطْفَةٍ أَمْشَاجٍ نَّبْتَلِيهِ فَجَعَلْنَاهُ سَمِيعًا بَصِيرًا", "فَالْعَاصِفَاتِ عَصْفًا", "الَّذِي خَلَقَ الْمَوْتَ وَالْحَيَاةَ لِيَبْلُوَكُمْ أَيُّكُمْ أَحْسَنُ عَمَلًا ۚ وَهُوَ الْعَزِيزُ الْغَفُورُ"], jawabanBenar: "وَلَا أُقْسِمُ بِالنَّفْسِ اللَّوَّامَةِ" },
        { pertanyaan: "Lanjutkan ayat: 'هَلْ أَتَىٰ عَلَى الْإِنسَانِ حِينٌ مِّنَ الدَّهْرِ لَمْ يَكُن شَيْئًا مَّذْكُورًا'", opsi: ["إِنَّا خَلَقْنَا الْإِنسَانَ مِن نُّطْفَةٍ أَمْشَاجٍ نَّبْتَلِيهِ فَجَعَلْنَاهُ سَمِيعًا بَصِيرًا", "فَالْعَاصِفَاتِ عَصْفًا", "الَّذِي خَلَقَ الْمَوْتَ وَالْحَيَاةَ لِيَبْلُوَكُمْ أَيُّكُمْ أَحْسَنُ عَمَلًا ۚ وَهُوَ الْعَزِيزُ الْغَفُورُ", "مَا أَنتَ بِنِعْمَةِ رَبِّكَ بِمَجْنُونٍ"], jawabanBenar: "إِنَّا خَلَقْنَا الْإِنسَانَ مِن نُّطْفَةٍ أَمْشَاجٍ نَّبْتَلِيهِ فَجَعَلْنَاهُ سَمِيعًا بَصِيرًا" },
        { pertanyaan: "Lanjutkan ayat: 'وَالْمُرْسَلَاتِ عُرْفًا'", opsi: ["فَالْعَاصِفَاتِ عَصْفًا", "الَّذِي خَلَقَ الْمَوْتَ وَالْحَيَاةَ لِيَبْلُوَكُمْ أَيُّكُمْ أَحْسَنُ عَمَلًا ۚ وَهُوَ الْعَزِيزُ الْغَفُورُ", "مَا أَنتَ بِنِعْمَةِ رَبِّكَ بِمَجْنُونٍ", "مَا الْحَاقَّةُ"], jawabanBenar: "فَالْعَاصِفَاتِ عَصْفًا" }
    ],
    menengah: [
        { pertanyaan: "Lanjutkan ayat: 'الَّذِي خَلَقَ الْمَوْتَ وَالْحَيَاةَ لِيَبْلُوَكُمْ أَيُّكُمْ أَحْسَنُ عَمَلًا ۚ وَهُوَ الْعَزِيزُ الْغَفُورُ'", opsi: ["الَّذِي خَلَقَ سَبْعَ سَمَاوَاتٍ طِبَاقًا ۖ مَّا تَرَىٰ فِي خَلْقِ الرَّحْمَٰنِ مِن تَفَاوُتٍ ۖ فَارْجِعِ الْبَصَرَ هَلْ تَرَىٰ مِن فُطُورٍ", "وَإِنَّ لَكَ لَأَجْرًا غَيْرَ مَمْنُونٍ", "نِّصْفَهُ أَوِ انقُصْ مِنْهُ قَلِيلًا", "وَرَبَّكَ فَكَبِّرْ"], jawabanBenar: "الَّذِي خَلَقَ سَبْعَ سَمَاوَاتٍ طِبَاقًا ۖ مَّا تَرَىٰ فِي خَلْقِ الرَّحْمَٰنِ مِن تَفَاوُتٍ ۖ فَارْجِعِ الْبَصَرَ هَلْ تَرَىٰ مِن فُطُورٍ" },
        { pertanyaan: "Lanjutkan ayat: 'مَا أَنتَ بِنِعْمَةِ رَبِّكَ بِمَجْنُونٍ'", opsi: ["وَإِنَّ لَكَ لَأَجْرًا غَيْرَ مَمْنُونٍ", "نِّصْفَهُ أَوِ انقُصْ مِنْهُ قَلِيلًا", "وَرَبَّكَ فَكَبِّرْ", "إِنَّا هَدَيْنَاهُ السَّبِيلَ إِمَّا شَاكِرًا وَإِمَّا كَفُورًا"], jawabanBenar: "وَإِنَّ لَكَ لَأَجْرًا غَيْرَ مَمْنُونٍ" },
        { pertanyaan: "Lanjutkan ayat: 'قُمِ اللَّيْلَ إِلَّا قَلِيلًا'", opsi: ["نِّصْفَهُ أَوِ انقُصْ مِنْهُ قَلِيلًا", "وَرَبَّكَ فَكَبِّرْ", "إِنَّا هَدَيْنَاهُ السَّبِيلَ إِمَّا شَاكِرًا وَإِمَّا كَفُورًا", "وَأَنَّهُ تَعَالَىٰ جَدُّ رَبِّنَا مَا اتَّخَذَ صَاحِبَةً وَلَا وَلَدًا"], jawabanBenar: "نِّصْفَهُ أَوِ انقُصْ مِنْهُ قَلِيلًا" },
        { pertanyaan: "Lanjutkan ayat: 'قُمْ فَأَنذِرْ'", opsi: ["وَرَبَّكَ فَكَبِّرْ", "إِنَّا هَدَيْنَاهُ السَّبِيلَ إِمَّا شَاكِرًا وَإِمَّا كَفُورًا", "وَأَنَّهُ تَعَالَىٰ جَدُّ رَبِّنَا مَا اتَّخَذَ صَاحِبَةً وَلَا وَلَدًا", "أَيَحْسَبُ الْإِنسَانُ أَلَّن نَّجْمَعَ عِظَامَهُ"], jawabanBenar: "وَرَبَّكَ فَكَبِّرْ" },
        { pertanyaan: "Lanjutkan ayat: 'إِنَّا خَلَقْنَا الْإِنسَانَ مِن نُّطْفَةٍ أَمْشَاجٍ نَّبْتَلِيهِ فَجَعَلْنَاهُ سَمِيعًا بَصِيرًا'", opsi: ["إِنَّا هَدَيْنَاهُ السَّبِيلَ إِمَّا شَاكِرًا وَإِمَّا كَفُورًا", "وَأَنَّهُ تَعَالَىٰ جَدُّ رَبِّنَا مَا اتَّخَذَ صَاحِبَةً وَلَا وَلَدًا", "أَيَحْسَبُ الْإِنسَانُ أَلَّن نَّجْمَعَ عِظَامَهُ", "وَالنَّاشِرَاتِ نَشْرًا"], jawabanBenar: "إِنَّا هَدَيْنَاهُ السَّبِيلَ إِمَّا شَاكِرًا وَإِمَّا كَفُورًا" },
        { pertanyaan: "Lanjutkan ayat: 'يَهْدِي إِلَى الرُّشْدِ فَآمَنَّا بِهِ ۖ وَلَن نُّشْرِكَ بِرَبِّنَا أَحَدًا'", opsi: ["وَأَنَّهُ تَعَالَىٰ جَدُّ رَبِّنَا مَا اتَّخَذَ صَاحِبَةً وَلَا وَلَدًا", "أَيَحْسَبُ الْإِنسَانُ أَلَّن نَّجْمَعَ عِظَامَهُ", "وَالنَّاشِرَاتِ نَشْرًا", "الَّذِي خَلَقَ سَبْعَ سَمَاوَاتٍ طِبَاقًا ۖ مَّا تَرَىٰ فِي خَلْقِ الرَّحْمَٰنِ مِن تَفَاوُتٍ ۖ فَارْجِعِ الْبَصَرَ هَلْ تَرَىٰ مِن فُطُورٍ"], jawabanBenar: "وَأَنَّهُ تَعَالَىٰ جَدُّ رَبِّنَا مَا اتَّخَذَ صَاحِبَةً وَلَا وَلَدًا" },
        { pertanyaan: "Lanjutkan ayat: 'وَلَا أُقْسِمُ بِالنَّفْسِ اللَّوَّامَةِ'", opsi: ["أَيَحْسَبُ الْإِنسَانُ أَلَّن نَّجْمَعَ عِظَامَهُ", "وَالنَّاشِرَاتِ نَشْرًا", "الَّذِي خَلَقَ سَبْعَ سَمَاوَاتٍ طِبَاقًا ۖ مَّا تَرَىٰ فِي خَلْقِ الرَّحْمَٰنِ مِن تَفَاوُتٍ ۖ فَارْجِعِ الْبَصَرَ هَلْ تَرَىٰ مِن فُطُورٍ", "وَإِنَّ لَكَ لَأَجْرًا غَيْرَ مَمْنُونٍ"], jawabanBenar: "أَيَحْسَبُ الْإِنسَانُ أَلَّن نَّجْمَعَ عِظَامَهُ" },
        { pertanyaan: "Lanjutkan ayat: 'فَالْعَاصِفَاتِ عَصْفًا'", opsi: ["وَالنَّاشِرَاتِ نَشْرًا", "الَّذِي خَلَقَ سَبْعَ سَمَاوَاتٍ طِبَاقًا ۖ مَّا تَرَىٰ فِي خَلْقِ الرَّحْمَٰنِ مِن تَفَاوُتٍ ۖ فَارْجِعِ الْبَصَرَ هَلْ تَرَىٰ مِن فُطُورٍ", "وَإِنَّ لَكَ لَأَجْرًا غَيْرَ مَمْنُونٍ", "نِّصْفَهُ أَوِ انقُصْ مِنْهُ قَلِيلًا"], jawabanBenar: "وَالنَّاشِرَاتِ نَشْرًا" }
    ],
    lanjut: [
        { pertanyaan: "Lanjutkan ayat: 'مَا الْحَاقَّةُ'", opsi: ["وَمَا أَدْرَاكَ مَا الْحَاقَّةُ", "مِّنَ اللَّهِ ذِي الْمَعَارِجِ", "أَنِ اعْبُدُوا اللَّهَ وَاتَّقُوهُ وَأَطِيعُونِ", "وَإِنَّكَ لَعَلَىٰ خُلُقٍ عَظِيمٍ"], jawabanBenar: "وَمَا أَدْرَاكَ مَا الْحَاقَّةُ" },
        { pertanyaan: "Lanjutkan ayat: 'لِّلْكَافِرِينَ لَيْسَ لَهُ دَافِعٌ'", opsi: ["مِّنَ اللَّهِ ذِي الْمَعَارِجِ", "أَنِ اعْبُدُوا اللَّهَ وَاتَّقُوهُ وَأَطِيعُونِ", "وَإِنَّكَ لَعَلَىٰ خُلُقٍ عَظِيمٍ", "وَمَا أَدْرَاكَ مَا الْحَاقَّةُ"], jawabanBenar: "مِّنَ اللَّهِ ذِي الْمَعَارِجِ" },
        { pertanyaan: "Lanjutkan ayat: 'قَالَ يَا قَوْمِ إِنِّي لَكُمْ نَذِيرٌ مُّبِينٌ'", opsi: ["أَنِ اعْبُدُوا اللَّهَ وَاتَّقُوهُ وَأَطِيعُونِ", "وَإِنَّكَ لَعَلَىٰ خُلُقٍ عَظِيمٍ", "وَمَا أَدْرَاكَ مَا الْحَاقَّةُ", "مِّنَ اللَّهِ ذِي الْمَعَارِجِ"], jawabanBenar: "أَنِ اعْبُدُوا اللَّهَ وَاتَّقُوهُ وَأَطِيعُونِ" },
        { pertanyaan: "Lanjutkan ayat: 'وَإِنَّ لَكَ لَأَجْرًا غَيْرَ مَمْنُونٍ'", opsi: ["وَإِنَّكَ لَعَلَىٰ خُلُقٍ عَظِيمٍ", "وَمَا أَدْرَاكَ مَا الْحَاقَّةُ", "مِّنَ اللَّهِ ذِي الْمَعَارِجِ", "أَنِ اعْبُدُوا اللَّهَ وَاتَّقُوهُ وَأَطِيعُونِ"], jawabanBenar: "وَإِنَّكَ لَعَلَىٰ خُلُقٍ عَظِيمٍ" }
    ]
};

// ==========================================
// BACKUP DATA KE GOOGLE SHEETS (VIA APPS SCRIPT)
// Dikirim paralel, tidak menunggu/menghalangi
// proses simpan ke Firestore.
// ==========================================
window.kirimBackupKeSheet = function(data) {
    if (!URL_BACKUP_SHEET || URL_BACKUP_SHEET.indexOf("GANTI_DENGAN_URL") !== -1) {
        // Belum dikonfigurasi, lewati saja tanpa error
        return;
    }
    fetch(URL_BACKUP_SHEET, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(data)
    }).catch((err) => {
        console.error("Gagal mengirim backup ke Google Sheets:", err);
    });
};

// ==========================================
// MESIN PEMILIH SOAL BERDASARKAN LEVEL (1-50)
// Semakin tinggi level, semakin besar peluang
// soal "lanjut" diambil; sebaliknya untuk level
// rendah, dominan soal "dasar".
// ==========================================

function acakUrutan(arr) {
    return arr.slice().sort(() => 0.5 - Math.random());
}

function ambilSejumlahSoal(arr, n) {
    if (n <= 0 || !arr || arr.length === 0) return [];
    let hasil = [];
    while (hasil.length < n) {
        hasil = hasil.concat(acakUrutan(arr));
    }
    return hasil.slice(0, n);
}

// ==========================================
// JUMLAH LEVEL MAKSIMAL PER JENIS KUIS
// Bank soal Tajwid, Makharijul, dan Juz 30 cukup banyak variasinya
// sehingga bisa memakai 50 level penuh. Bank soal Juz 29 baru berisi
// soal sambung-ayat yang sudah diverifikasi ketat (lebih sedikit demi
// menjaga keakuratan kutipan ayat), jadi levelnya dibuat lebih pendek
// (1-25) agar tidak mengulang-ulang soal yang sama secara berlebihan
// di level tinggi. PERBAIKAN: sebelumnya digit "50" ditulis tetap di
// beberapa tempat (grid level, judul modal) padahal jumlah level per
// jenis kuis bisa berbeda-beda — sekarang semuanya mengikuti nilai di
// bawah ini.
// ==========================================
const MAKS_LEVEL_PER_JENIS = {
    tajwid: 50,
    makharijul: 50,
    juz30: 50,
    juz29: 25
};
function getMaksLevel(jenis) {
    return MAKS_LEVEL_PER_JENIS[jenis] || 50;
}

function bobotTingkatUntukLevel(level, maksLevel) {
    maksLevel = maksLevel || 50;
    const t = Math.max(0, Math.min(1, (level - 1) / Math.max(1, maksLevel - 1))); // 0 di level 1, 1 di level maksimal
    let dasar, lanjut;
    if (t <= 0.5) {
        const tt = t / 0.5;
        dasar = 0.8 - 0.6 * tt;   // 0.8 -> 0.2
        lanjut = 0.2 * tt;        // 0   -> 0.2
    } else {
        const tt = (t - 0.5) / 0.5;
        dasar = 0.2 - 0.2 * tt;   // 0.2 -> 0
        lanjut = 0.2 + 0.6 * tt;  // 0.2 -> 0.8
    }
    const menengah = 1 - dasar - lanjut;
    return { dasar: dasar, menengah: menengah, lanjut: lanjut };
}

function hitungJumlahPerTingkat(bobot) {
    let hitung = {
        dasar: Math.round(bobot.dasar * 10),
        menengah: Math.round(bobot.menengah * 10),
        lanjut: Math.round(bobot.lanjut * 10)
    };
    let total = hitung.dasar + hitung.menengah + hitung.lanjut;
    const kunci = ['dasar', 'menengah', 'lanjut'];
    let pengaman = 0;
    while (total !== 10 && pengaman < 20) {
        if (total < 10) {
            let k = kunci.reduce((a, b) => bobot[a] >= bobot[b] ? a : b);
            hitung[k]++;
            total++;
        } else {
            let kandidat = kunci.filter(x => hitung[x] > 0);
            let k = kandidat.reduce((a, b) => hitung[a] >= hitung[b] ? a : b);
            hitung[k]--;
            total--;
        }
        pengaman++;
    }
    return hitung;
}

window.generateSoalUntukLevel = function(bank, level, maksLevel) {
    const bobot = bobotTingkatUntukLevel(level, maksLevel);
    const jumlah = hitungJumlahPerTingkat(bobot);
    let soal = [];
    soal = soal.concat(ambilSejumlahSoal(bank.dasar, jumlah.dasar));
    soal = soal.concat(ambilSejumlahSoal(bank.menengah, jumlah.menengah));
    soal = soal.concat(ambilSejumlahSoal(bank.lanjut, jumlah.lanjut));
    return acakUrutan(soal);
};

// ==========================================
// FUNGSI UTAMA KUIS (MENGGUNAKAN WINDOW)
// ==========================================

window.pilihLevel = function(jenis) {
    tempKuisPilihan = jenis;

    // Tampilkan Modal
    const modalEl = document.getElementById('modalPilihLevel');
    if(modalEl) {
        modalEl.classList.remove('hidden');
    } else {
        alert("Sistem Error: Modal Level tidak ditemukan. Pastikan kode HTML modal sudah dipasang.");
        return;
    }

    window.kembaliKeGridLevel(); // selalu mulai dari tampilan grid level

    const nama = ambilNamaSantriAktif();
    const sudahSiap = statusMuatLatihan === 'siap' && namaCacheLatihan === nama;
    if (!sudahSiap && nama && nama !== "-") {
        muatDataLatihan(nama).then(() => {
            const grid = document.getElementById('panelGridLevel');
            if (tempKuisPilihan === jenis && grid && !grid.classList.contains('hidden')) {
                window.renderGridLevel();
            }
        });
    }
};

window.kembaliKeGridLevel = function() {
    const panelGrid = document.getElementById('panelGridLevel');
    const panelDetail = document.getElementById('panelDetailLevel');
    if (panelGrid) panelGrid.classList.remove('hidden');
    if (panelDetail) panelDetail.classList.add('hidden');

    const simbol = document.getElementById('simbolModalLevel');
    if (simbol) simbol.innerText = 'psychology';

    // Jumlah level mengikuti jenis kuisnya (lihat MAKS_LEVEL_PER_JENIS)
    const maksLevel = getMaksLevel(tempKuisPilihan);
    document.getElementById('judulModalLevel').innerText =
        "Pilih Level (1-" + maksLevel + ")\n" + (NAMA_KUIS[tempKuisPilihan] || "");

    window.renderGridLevel();
};

window.renderGridLevel = function() {
    const grid = document.getElementById('gridLevelKuis');
    const ringkasan = document.getElementById('ringkasanLevel');
    if (!grid) return;
    grid.innerHTML = '';

    const pesanGrid = (html) => {
        grid.innerHTML = '<div class="col-span-5 py-6 text-xs font-semibold text-slate-400">' + html + '</div>';
    };

    const nama = ambilNamaSantriAktif();
    if (!nama || nama === "-") {
        if (ringkasan) ringkasan.textContent = "";
        pesanGrid("Pilih santri terlebih dahulu agar progres level bisa tersimpan.");
        return;
    }
    if (statusMuatLatihan === 'memuat' || namaCacheLatihan !== nama) {
        if (ringkasan) ringkasan.textContent = "";
        pesanGrid('<span class="animate-pulse text-blue-500 font-bold">Memuat progres level...</span>');
        return;
    }
    if (statusMuatLatihan === 'gagal') {
        if (ringkasan) ringkasan.textContent = "";
        pesanGrid('<span class="text-rose-500 font-bold">Gagal memuat progres.</span><br>' +
            '<button type="button" id="tombolUlangMuatLevel" class="mt-3 px-4 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg active:scale-95">Coba lagi</button>');
        const tb = document.getElementById('tombolUlangMuatLevel');
        if (tb) tb.onclick = () => {
            muatDataLatihan(nama, true).then(() => window.renderGridLevel());
            window.renderGridLevel();
        };
        return;
    }

    const maksLevel = getMaksLevel(tempKuisPilihan);
    const peta = petaProgress(tempKuisPilihan);

    let jumlahLulus = 0;
    let levelSaatIni = null; // level terbuka pertama yang belum lulus
    for (let i = 1; i <= maksLevel; i++) {
        const info = peta[i];
        if (info && info.lulus) jumlahLulus++;
        else if (levelTerbuka(peta, i) && levelSaatIni === null) levelSaatIni = i;
    }
    if (ringkasan) ringkasan.textContent = jumlahLulus + " / " + maksLevel + " level lulus";

    for (let i = 1; i <= maksLevel; i++) {
        const info = peta[i];
        const terbuka = levelTerbuka(peta, i);
        const btn = document.createElement('button');
        btn.type = "button";

        let warna, sub = "";
        if (!terbuka) {
            warna = "bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200";
            sub = '<span class="material-symbols-outlined text-[13px] leading-none mt-0.5">lock</span>';
        } else if (info && info.lulus) {
            warna = "bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600";
            sub = '<span class="text-[9px] font-bold leading-none mt-0.5">' + info.terbaik + '</span>';
        } else if (info) {
            warna = "bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100";
            sub = '<span class="text-[9px] font-bold leading-none mt-0.5">' + info.terbaik + '</span>';
        } else {
            warna = "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100";
        }
        if (i === levelSaatIni) warna += " ring-2 ring-blue-500 ring-offset-1";

        btn.className = "aspect-square flex flex-col items-center justify-center text-xs sm:text-sm font-bold rounded-lg border transition-all active:scale-95 " + warna;
        btn.innerHTML = '<span class="leading-none">' + i + '</span>' + sub;
        btn.setAttribute('aria-label', "Level " + i + (terbuka ? "" : " (terkunci)"));
        btn.onclick = () => window.tampilkanDetailLevel(i);
        grid.appendChild(btn);
    }
};

window.tutupModalLevel = function() {
    document.getElementById('modalPilihLevel').classList.add('hidden');
};

// Popup detail level: nilai terbaik + riwayat pengerjaan level tersebut
window.tampilkanDetailLevel = function(level) {
    const jenis = tempKuisPilihan;
    const maksLevel = getMaksLevel(jenis);
    const peta = petaProgress(jenis);
    const info = peta[level];
    const terbuka = levelTerbuka(peta, level);

    document.getElementById('panelGridLevel').classList.add('hidden');
    document.getElementById('panelDetailLevel').classList.remove('hidden');
    document.getElementById('judulModalLevel').innerText = "Level " + level + "\n" + (NAMA_KUIS[jenis] || "");
    document.getElementById('simbolModalLevel').innerText = terbuka ? 'psychology' : 'lock';

    const badge = document.getElementById('badgeTingkatLevel');
    const tingkat = namaTingkatLevel(level, maksLevel);
    const warnaTingkat = tingkat === "Lanjut" ? "bg-rose-50 text-rose-600 border-rose-100"
        : (tingkat === "Menengah" ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-emerald-50 text-emerald-600 border-emerald-100");
    badge.className = "text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border mb-4 " + warnaTingkat;
    badge.textContent = "Tingkat " + tingkat;

    const boxRingkasan = document.getElementById('ringkasanDetailLevel');
    const boxRiwayat = document.getElementById('riwayatDetailLevel');
    const tombolMulai = document.getElementById('tombolMulaiLevel');

    if (!terbuka) {
        boxRingkasan.innerHTML = '';
        boxRingkasan.classList.add('hidden');
        boxRiwayat.innerHTML =
            '<div class="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-semibold text-slate-500 text-center">' +
            'Level ini masih terkunci. Selesaikan <b>Level ' + (level - 1) + '</b> dengan maksimal ' + MAKS_SALAH_LULUS +
            ' salah untuk membukanya.</div>';
        tombolMulai.classList.add('hidden');
        return;
    }

    boxRingkasan.classList.remove('hidden');
    tombolMulai.classList.remove('hidden');

    const kotak = (label, nilai, kelas) =>
        '<div class="rounded-2xl border py-3 flex flex-col items-center ' + kelas + '">' +
        '<span class="text-lg font-extrabold leading-tight">' + nilai + '</span>' +
        '<span class="text-[10px] font-bold uppercase tracking-wide opacity-80">' + label + '</span></div>';

    const status = info ? (info.lulus ? "Lulus" : "Belum") : "Baru";
    const kelasStatus = info ? (info.lulus ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-rose-50 border-rose-100 text-rose-700")
        : "bg-slate-50 border-slate-200 text-slate-500";
    boxRingkasan.innerHTML =
        kotak("Nilai Terbaik", info ? info.terbaik : "-", "bg-blue-50 border-blue-100 text-blue-700") +
        kotak("Percobaan", info ? info.percobaan.length : 0, "bg-slate-50 border-slate-200 text-slate-700") +
        kotak("Status", status, kelasStatus);

    if (!info) {
        boxRiwayat.innerHTML = '<p class="text-xs text-slate-400 font-medium text-center py-4">Belum pernah dikerjakan.<br>Syarat lulus: salah maksimal ' + MAKS_SALAH_LULUS + '.</p>';
    } else {
        let idxTerbaik = -1;
        info.percobaan.forEach((rec, idx) => {
            if ((rec.skor || 0) === info.terbaik && idxTerbaik === -1) idxTerbaik = idx;
        });
        let html = '<p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Riwayat pengerjaan</p>';
        info.percobaan.forEach((rec, idx) => {
            const ms = waktuRekam(rec);
            const tgl = ms ? new Date(ms).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : "-";
            const jam = ms ? new Date(ms).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : "";
            const skor = rec.skor || 0;
            let warnaSkor = "text-emerald-600 bg-emerald-50 border-emerald-100";
            if (skor < 70) warnaSkor = "text-amber-600 bg-amber-50 border-amber-100";
            if (skor < 50) warnaSkor = "text-rose-600 bg-rose-50 border-rose-100";
            const benarSalah = (rec.benar !== undefined && rec.salah !== undefined)
                ? '<span class="ml-2 text-slate-400">✓ ' + rec.benar + '  ✗ ' + rec.salah + '</span>' : "";
            const tagTerbaik = idx === idxTerbaik
                ? '<span class="ml-2 text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5">TERBAIK</span>' : "";
            html += '<div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">' +
                '<div class="flex flex-col text-left"><span class="text-xs font-bold text-slate-700">' + tgl + ' ' + jam + tagTerbaik + '</span>' +
                '<span class="text-[10px] font-semibold text-slate-400 mt-0.5">' + (apakahLulus(rec) ? "Lulus" : "Belum lulus") + benarSalah + '</span></div>' +
                '<div class="px-3 py-1.5 rounded-lg border font-extrabold text-sm ' + warnaSkor + '">' + skor + '</div></div>';
        });
        boxRiwayat.innerHTML = html;
    }

    tombolMulai.textContent = !info ? "Mulai Level" : (info.lulus ? "Perbaiki Nilai" : "Coba Lagi");
    tombolMulai.onclick = () => window.mulaiKuisDariLevel(level);
};

window.mulaiKuisDariLevel = function(level) {
    // Pengaman: level yang masih terkunci tidak boleh dimulai
    if (!levelTerbuka(petaProgress(tempKuisPilihan), level)) {
        window.tampilkanDetailLevel(level);
        return;
    }

    window.tutupModalLevel();
    jenisKuisSaatIni = tempKuisPilihan;
    levelKuisSaatIni = level;

    let sumberBankSoal;
    if(jenisKuisSaatIni === 'tajwid') sumberBankSoal = bankSoalTajwid;
    if(jenisKuisSaatIni === 'makharijul') sumberBankSoal = bankSoalMakharijul;
    if(jenisKuisSaatIni === 'juz30') sumberBankSoal = bankSoalJuz30;
    if(jenisKuisSaatIni === 'juz29') sumberBankSoal = bankSoalJuz29;

    kuisAktif = window.generateSoalUntukLevel(sumberBankSoal, level, getMaksLevel(jenisKuisSaatIni));

    if (!kuisAktif || kuisAktif.length === 0) {
        alert("Mohon maaf, soal untuk level ini belum tersedia.");
        return;
    }

    indexSoalSaatIni = 0;
    skorKuis = 0;
    jawabanBenarTotal = 0;
    jawabanSalahTotal = 0;
    sesiKuis++;
    soalSudahDijawab = false;

    // [PERBAIKAN ANTI-FREEZE]: Gunakan replaceState agar tidak menumpuk history modal
    // Sehingga saat kuis selesai, history.back() langsung menuju ke menu Latihan
    if (history.state && history.state.isModal) {
        history.replaceState({ level: 'subPageAreaKuis' }, 'Area Kuis', '#subPageAreaKuis');
    } else if (typeof window.catatSejarah === 'function') {
        window.catatSejarah('subPageAreaKuis');
    }

    document.getElementById('subPageMenuLatihan').classList.add('hidden');
    document.getElementById('subPageAreaKuis').classList.remove('hidden');

    window.renderSoal();
};

window.renderSoal = function() {
    const soal = kuisAktif[indexSoalSaatIni];
    soalSudahDijawab = false;

    document.getElementById('indikatorSoal').innerText = `Soal ${indexSoalSaatIni + 1} / ${kuisAktif.length}`;
    document.getElementById('skorSementara').innerHTML = `Skor: ${Math.round(skorKuis)} <span class="text-emerald-500 ml-2">✓ ${jawabanBenarTotal}</span> <span class="text-rose-500 ml-1">✗ ${jawabanSalahTotal}</span>`;
    document.getElementById('teksPertanyaan').innerText = soal.pertanyaan;

    const containerOpsi = document.getElementById('opsiJawaban');
    containerOpsi.innerHTML = '';

    const opsiAcak = soal.opsi.slice().sort(() => 0.5 - Math.random());

    opsiAcak.forEach(pilihan => {
        const btn = document.createElement('button');
        btn.className = "p-4 bg-slate-50 border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-slate-700 font-bold rounded-xl transition-all shadow-sm active:scale-95 text-sm sm:text-base";
        btn.innerText = pilihan;
        btn.onclick = () => window.cekJawaban(pilihan, soal.jawabanBenar, btn);
        containerOpsi.appendChild(btn);
    });

    mulaiTimerSoal(getWaktuPerSoal(jenisKuisSaatIni) * 1000);
};

// ==========================================
// TIMER PER SOAL
// Berbasis timestamp (bukan hitungan interval) supaya tetap akurat
// walau browser menahan timer. Otomatis berhenti jika halaman kuis
// ditinggalkan, dan di-pause saat tab/aplikasi disembunyikan.
// ==========================================
function hentikanTimerSoal() {
    if (timerSoalId) { clearInterval(timerSoalId); timerSoalId = null; }
    sisaWaktuTersimpan = null;
}

function gambarTimer(sisaMs, totalMs) {
    const bar = document.getElementById('barTimerSoal');
    const teks = document.getElementById('teksTimerSoal');
    if (!bar || !teks) return;
    const detik = Math.max(0, Math.ceil(sisaMs / 1000));
    const rasio = Math.max(0, Math.min(1, sisaMs / totalMs));
    let warna = "bg-emerald-500";
    if (rasio <= 0.5) warna = "bg-amber-500";
    if (rasio <= 0.25) warna = "bg-rose-500";
    bar.className = "h-full rounded-full transition-[width] duration-100 ease-linear " + warna;
    bar.style.width = (rasio * 100) + "%";
    teks.textContent = detik + " dtk";
    teks.className = "text-xs font-extrabold tabular-nums " + (rasio <= 0.25 ? "text-rose-600" : "text-slate-500");
}

function jalankanInterval(totalMs, sesi) {
    if (timerSoalId) clearInterval(timerSoalId);
    timerSoalId = setInterval(() => {
        const areaKuis = document.getElementById('subPageAreaKuis');
        // Kuis ditinggalkan (tombol Back, ganti halaman) -> hentikan diam-diam
        if (sesi !== sesiKuis || !areaKuis || areaKuis.classList.contains('hidden')) {
            hentikanTimerSoal();
            return;
        }
        const sisa = batasWaktuSoal - Date.now();
        gambarTimer(sisa, totalMs);
        if (sisa <= 0) {
            hentikanTimerSoal();
            window.waktuHabis();
        }
    }, 100);
}

function mulaiTimerSoal(totalMs) {
    hentikanTimerSoal();
    batasWaktuSoal = Date.now() + totalMs;
    window.__totalMsSoal = totalMs;
    gambarTimer(totalMs, totalMs);
    jalankanInterval(totalMs, sesiKuis);
}

document.addEventListener('visibilitychange', function() {
    const areaKuis = document.getElementById('subPageAreaKuis');
    const kuisBerjalan = areaKuis && !areaKuis.classList.contains('hidden') && !soalSudahDijawab && kuisAktif.length > 0;
    if (document.hidden) {
        if (timerSoalId && kuisBerjalan) {
            sisaWaktuTersimpan = Math.max(0, batasWaktuSoal - Date.now());
            clearInterval(timerSoalId);
            timerSoalId = null;
        }
    } else if (sisaWaktuTersimpan !== null && kuisBerjalan) {
        batasWaktuSoal = Date.now() + sisaWaktuTersimpan;
        sisaWaktuTersimpan = null;
        jalankanInterval(window.__totalMsSoal, sesiKuis);
    }
});

// Proses satu soal selesai (dijawab atau waktu habis) lalu lanjut
function selesaikanSoal(jawabanDipilih, jawabanBenar, elemenTombol) {
    if (soalSudahDijawab) return;
    soalSudahDijawab = true;
    hentikanTimerSoal();
    const sesi = sesiKuis;

    const semuaTombol = document.getElementById('opsiJawaban').querySelectorAll('button');
    semuaTombol.forEach(btn => btn.disabled = true); // Kunci agar tak diklik ganda

    const bobotPerSoal = 100 / kuisAktif.length;
    const tandai = (btn, kelasBaru) => {
        btn.classList.remove('bg-slate-50', 'text-slate-700', 'border-slate-200');
        kelasBaru.forEach(k => btn.classList.add(k));
    };
    const tandaiBenar = () => semuaTombol.forEach(btn => {
        if (btn.innerText === jawabanBenar) tandai(btn, ['bg-emerald-100', 'border-emerald-500', 'text-emerald-700']);
    });

    if (elemenTombol && jawabanDipilih === jawabanBenar) {
        skorKuis += bobotPerSoal;
        jawabanBenarTotal++;
        tandai(elemenTombol, ['bg-emerald-100', 'border-emerald-500', 'text-emerald-700']);
    } else {
        jawabanSalahTotal++;
        if (elemenTombol) tandai(elemenTombol, ['bg-rose-100', 'border-rose-500', 'text-rose-700']);
        tandaiBenar();
    }

    setTimeout(() => {
        if (sesi !== sesiKuis) return; // kuis sudah ditinggalkan / diganti kuis baru
        indexSoalSaatIni++;
        if (indexSoalSaatIni < kuisAktif.length) {
            window.renderSoal();
        } else {
            window.akhiriKuis();
        }
    }, 1500);
}

window.cekJawaban = function(jawabanDipilih, jawabanBenar, elemenTombol) {
    selesaikanSoal(jawabanDipilih, jawabanBenar, elemenTombol);
};

// Waktu habis: dihitung salah, jawaban benar ditampilkan
window.waktuHabis = function() {
    const soal = kuisAktif[indexSoalSaatIni];
    if (!soal) return;
    const teks = document.getElementById('teksTimerSoal');
    if (teks) { teks.textContent = "Waktu habis"; teks.className = "text-xs font-extrabold text-rose-600"; }
    selesaikanSoal(null, soal.jawabanBenar, null);
};

window.akhiriKuis = function() {
    const namaAnak = ambilNamaSantriAktif();

    skorKuis = Math.round(skorKuis);
    if(skorKuis > 100) skorKuis = 100;

    const jenis = jenisKuisSaatIni;
    const level = levelKuisSaatIni;
    const maksLevel = getMaksLevel(jenis);
    const lulus = jawabanSalahTotal <= MAKS_SALAH_LULUS;

    // Status SEBELUM percobaan ini dicatat (untuk info "level terbuka" & "nilai terbaik baru")
    const petaSebelum = petaProgress(jenis);
    const terbaikSebelumnya = petaSebelum[level] ? petaSebelum[level].terbaik : null;
    const punyaBerikutnya = level < maksLevel;
    const berikutnyaSudahTerbuka = punyaBerikutnya ? levelTerbuka(petaSebelum, level + 1) : false;

    // Tampilkan popup hasil kuis bertema
    window.tampilkanHasilKuis({
        level: level,
        skor: skorKuis,
        benar: jawabanBenarTotal,
        salah: jawabanSalahTotal,
        lulus: lulus,
        punyaBerikutnya: punyaBerikutnya,
        barusajaTerbuka: lulus && punyaBerikutnya && !berikutnyaSudahTerbuka,
        terbaikSebelumnya: terbaikSebelumnya
    });

    if (!namaAnak || namaAnak === "-" || namaAnak === "") {
        return;
    }

    const labelKuis = LABEL_JENIS[jenis] || "";

    const dataUntukBackup = {
        nama: namaAnak,
        jenisKuis: labelKuis,
        level: formatLabelLevel(level),
        skor: skorKuis,
        benar: jawabanBenarTotal,
        salah: jawabanSalahTotal
    };

    // Kirim salinan data ke Google Sheets (backup), berjalan paralel
    window.kirimBackupKeSheet(dataUntukBackup);

    // Catat ke cache lokal dulu supaya level berikutnya langsung terbuka
    const catatanLokal = {
        nama: namaAnak,
        jenisKuis: labelKuis,
        level: level,
        skor: skorKuis,
        benar: jawabanBenarTotal,
        salah: jawabanSalahTotal,
        waktu: null,
        _waktuLokal: Date.now()
    };
    if (namaCacheLatihan === namaAnak) {
        dataLatihanCache.push(catatanLokal);
        perbaruiProgressMenu();
    }

    const db = firebase.firestore();

    // Simpan ke database berjalan secara Background
    db.collection("latihan_santri").add({
        nama: namaAnak,
        jenisKuis: labelKuis,
        level: level,
        skor: skorKuis,
        benar: jawabanBenarTotal,
        salah: jawabanSalahTotal,
        waktu: firebase.firestore.FieldValue.serverTimestamp()
    }).catch((error) => {
        console.error("Gagal menyimpan nilai kuis:", error);
        // Batalkan catatan lokal agar progres tidak berbeda dengan server
        const idx = dataLatihanCache.indexOf(catatanLokal);
        if (idx !== -1) dataLatihanCache.splice(idx, 1);
        perbaruiProgressMenu();
        alert("Nilai gagal disimpan ke server. Periksa koneksi internet lalu coba lagi.");
    });
};

// ==========================================
// POPUP HASIL KUIS (BERTEMA, MENGGANTIKAN ALERT)
// ==========================================
window.tampilkanHasilKuis = function(hasil) {
    const modal = document.getElementById('modalHasilKuis');
    if (!modal) {
        // Fallback jika modal belum terpasang di HTML
        alert(`Kuis Selesai!\nLevel: ${formatLabelLevel(hasil.level)}\nSkor: ${hasil.skor}\nBenar: ${hasil.benar} | Salah: ${hasil.salah}`);
        window.kembaliKeMenuLatihan();
        return;
    }

    let warnaIkon = "bg-emerald-50 text-emerald-500";
    let iconName = "celebration";
    let pesanMotivasi = "Alhamdulillah, hasil yang luar biasa!";
    if (hasil.skor < 50) {
        warnaIkon = "bg-rose-50 text-rose-500";
        iconName = "sentiment_dissatisfied";
        pesanMotivasi = "Jangan menyerah, ayo coba lagi ya!";
    } else if (!hasil.lulus) {
        warnaIkon = "bg-amber-50 text-amber-500";
        iconName = "sentiment_neutral";
        pesanMotivasi = "Sedikit lagi! Pelajari lagi lalu coba lagi ya.";
    }

    const ikonEl = document.getElementById('ikonHasilKuis');
    ikonEl.className = `w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-inner ${warnaIkon}`;
    document.getElementById('simbolHasilKuis').innerText = iconName;

    const judulEl = document.getElementById('judulHasilKuis');
    if (judulEl) judulEl.innerText = hasil.lulus ? "Alhamdulillah, Lulus!" : "Belum Lulus";

    document.getElementById('pesanMotivasiHasilKuis').innerText = pesanMotivasi;
    document.getElementById('levelHasilKuis').innerText = formatLabelLevel(hasil.level);
    document.getElementById('skorHasilKuis').innerText = hasil.skor;
    document.getElementById('benarHasilKuis').innerText = hasil.benar;
    document.getElementById('salahHasilKuis').innerText = hasil.salah;

    // Kotak status kelulusan + info level berikutnya / nilai terbaik
    const box = document.getElementById('statusLulusHasilKuis');
    if (box) {
        const baris = [];
        let kelas;
        if (hasil.lulus) {
            kelas = "bg-emerald-50 border-emerald-200 text-emerald-700";
            baris.push('<p class="font-extrabold">LULUS (salah ' + hasil.salah + ', maks. ' + MAKS_SALAH_LULUS + ')</p>');
            if (hasil.punyaBerikutnya) {
                baris.push('<p class="font-semibold mt-1">' + (hasil.barusajaTerbuka
                    ? 'Level ' + (hasil.level + 1) + ' sekarang terbuka!'
                    : 'Level ' + (hasil.level + 1) + ' sudah terbuka.') + '</p>');
            } else {
                baris.push('<p class="font-semibold mt-1">Semua level pada kuis ini sudah diselesaikan.</p>');
            }
        } else {
            kelas = "bg-rose-50 border-rose-200 text-rose-700";
            baris.push('<p class="font-extrabold">BELUM LULUS (salah ' + hasil.salah + ')</p>');
            baris.push('<p class="font-semibold mt-1">Butuh maksimal ' + MAKS_SALAH_LULUS + ' salah untuk lanjut ke level berikutnya.</p>');
        }
        if (hasil.terbaikSebelumnya !== null && hasil.terbaikSebelumnya !== undefined) {
            baris.push('<p class="font-semibold mt-1">' + (hasil.skor > hasil.terbaikSebelumnya
                ? 'Nilai terbaik baru! Sebelumnya ' + hasil.terbaikSebelumnya + '.'
                : 'Nilai terbaikmu tetap ' + hasil.terbaikSebelumnya + '.') + '</p>');
        }
        box.className = "w-full rounded-2xl border px-4 py-3 mb-5 text-xs text-center " + kelas;
        box.innerHTML = baris.join('');
    }

    modal.classList.remove('hidden');
};

window.tutupHasilKuis = function() {
    const modal = document.getElementById('modalHasilKuis');
    if (modal) modal.classList.add('hidden');
    window.kembaliKeMenuLatihan(true); // kembali ke menu lalu buka lagi daftar level
};

window.kembaliKeMenuLatihan = function(bukaDaftarLevel) {
    if (bukaDaftarLevel === true) {
        const jenis = jenisKuisSaatIni;
        // Tunggu popstate selesai (flag isPopStateRunning di index-logic.js reset setelah 100ms)
        window.addEventListener('popstate', function() {
            setTimeout(() => window.pilihLevel(jenis), 250);
        }, { once: true });
    }
    history.back();
};

// Dipertahankan agar pemanggil lama tetap jalan: memuat ulang data
// latihan santri (dipakai untuk progres level & riwayat di popup level).
window.loadRiwayatLatihan = function(namaAnak) {
    const elNama = document.getElementById('namaSantriLatihan');
    if (elNama) elNama.innerText = namaAnak || "";
    return muatDataLatihan(namaAnak, true);
};

const oldNavigateTo = window.navigateTo;
window.navigateTo = function(viewId) {
    if (typeof oldNavigateTo === 'function') {
        oldNavigateTo(viewId);
    }

    if (viewId === 'viewLatihan') {
        // PERBAIKAN: sama seperti di akhiriKuis(), hindari .innerText karena
        // #namaSantri berada di #viewDashboard yang sudah disembunyikan di
        // titik ini (oldNavigateTo di atas sudah menyembunyikannya).
        const elemenNamaSantri = document.getElementById('namaSantri');
        const namaAnak = (window.santriAktif && window.santriAktif.nama)
            ? window.santriAktif.nama
            : (elemenNamaSantri ? elemenNamaSantri.textContent.replace('!', '').trim() : '');
        window.loadRiwayatLatihan(namaAnak);

        document.getElementById('subPageAreaKuis').classList.add('hidden');
        document.getElementById('subPageMenuLatihan').classList.remove('hidden');
    }
};
