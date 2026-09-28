// ==========================================
// LOGIKA FITUR LATIHAN & KUIS (latihan.js)
// Hingga 50 Level (tergantung jenis kuis), soal diambil dinamis dari bank
// soal besar (dasar/menengah/lanjut) sesuai
// tingkat kesulitan level yang dipilih.
// ==========================================

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
// Catatan kuis yang sudah selesai tetapi belum dikonfirmasi server.
// Dipakai agar hasil tidak hilang jika ada proses muat data yang menimpa cache.
let rekamanTertunda = [];

function ambilNamaSantriAktif() {
    if (window.santriAktif && window.santriAktif.nama) return window.santriAktif.nama;

    // Jangan pakai .innerText: #namaSantri ada di view yang tersembunyi
    const el = document.getElementById('namaSantri');
    const dariTampilan = el ? el.textContent.replace('!', '').trim() : '';
    if (dariTampilan && dariTampilan !== '-') return dariTampilan;

    // Cadangan terakhir untuk akun murid: nama dari data login
    const role = (localStorage.getItem("role") || "").toLowerCase();
    if (role === "murid" || role === "santri" || role === "siswa") {
        return (localStorage.getItem("nama") || localStorage.getItem("username") || "").trim();
    }
    return '';
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
            const idServer = {};
            snap.forEach((doc) => {
                const d = doc.data();
                d._id = doc.id;
                idServer[doc.id] = true;
                arr.push(d);
            });
            // Jangan sampai hasil kuis yang baru selesai hilang tertimpa data server yang lebih lama
            rekamanTertunda.forEach((rec) => {
                if (rec.nama === namaAnak && !idServer[rec._id]) arr.push(rec);
            });
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
        { pertanyaan: "Apabila ada Nun Sukun (نْ) atau Tanwin bertemu dengan huruf Ba (ب), maka hukum bacaannya adalah...", opsi: ["Iqlab", "Ikhfa Haqiqi", "Idgham Bighunnah", "Idzhar Halqi"], jawabanBenar: "Iqlab" },
        { pertanyaan: "Berikut ini yang merupakan huruf-huruf Qalqalah adalah...", opsi: ["ق، ط، ب، ج، د", "ي، ن، م، و", "ح، خ، ع، غ، هـ", "ا، ل، م، ر، ك"], jawabanBenar: "ق، ط، ب، ج، د" },
        { pertanyaan: "Hukum bacaan Idgham Bilaghunnah terjadi apabila Nun Sukun atau Tanwin bertemu dengan huruf...", opsi: ["Lam (ل) dan Ra (ر)", "Wawu (و) dan Ya (ي)", "Mim (م) dan Nun (ن)", "Ba (ب)"], jawabanBenar: "Lam (ل) dan Ra (ر)" },
        { pertanyaan: "Secara bahasa, 'Ikhfa' memiliki arti...", opsi: ["Samar-samar", "Jelas", "Memasukkan", "Menukar/Mengganti"], jawabanBenar: "Samar-samar" },
        { pertanyaan: "Berapakah panjang harakat untuk bacaan Mad Thabi'i (Mad Asli)?", opsi: ["2 Harakat", "4 Harakat", "5 Harakat", "6 Harakat"], jawabanBenar: "2 Harakat" },
        { pertanyaan: "Apabila ada Mim Sukun (مْ) bertemu dengan huruf Mim (م), maka hukum bacaannya disebut...", opsi: ["Idgham Mimi (Mutamatsilain)", "Ikhfa Syafawi", "Idzhar Syafawi", "Idgham Bighunnah"], jawabanBenar: "Idgham Mimi (Mutamatsilain)" },
        { pertanyaan: "Hukum Ikhfa Syafawi terjadi apabila...", opsi: ["Mim Sukun bertemu Ba", "Mim Sukun bertemu Mim", "Nun Sukun bertemu Ba", "Mim Sukun bertemu selain Mim dan Ba"], jawabanBenar: "Mim Sukun bertemu Ba" },
        { pertanyaan: "Huruf Idzhar Halqi berjumlah 6, yaitu...", opsi: ["ء، هـ، ع، ح، غ، خ", "ي، ن، م، و، ل، ر", "ت، ث، ج، د، ذ، ز", "ص، ض، ط، ظ، ف، ق"], jawabanBenar: "ء، هـ، ع، ح، غ، خ" },
        { pertanyaan: "Ghunnah artinya adalah membaca dengan suara...", opsi: ["Berdengung", "Tebal", "Tipis", "Memantul"], jawabanBenar: "Berdengung" },
        { pertanyaan: "Hukum bacaan Alif Lam (ال) yang dibaca jelas karena bertemu dengan huruf Qamariyah disebut...", opsi: ["Idzhar Qamariyah", "Idgham Syamsiyah", "Idzhar Halqi", "Idzhar Syafawi"], jawabanBenar: "Idzhar Qamariyah" },
        { pertanyaan: "Hukum Alif Lam Syamsiyah terjadi apabila Alif Lam bertemu dengan huruf yang berjumlah...", opsi: ["14 huruf", "6 huruf", "10 huruf", "28 huruf"], jawabanBenar: "14 huruf" },
        { pertanyaan: "Apabila ada Fathahtain bertemu dengan Alif yang dibaca waqaf, maka hukum panjangnya disebut...", opsi: ["Mad Iwad", "Mad Badal", "Mad Tamkin", "Mad Lazim"], jawabanBenar: "Mad Iwad" },
        { pertanyaan: "Berapa panjang bacaan Mad Wajib Muttasil ketika dibaca standar dalam hafs?", opsi: ["4 sampai 5 harakat", "2 harakat", "1 harakat", "6 harakat saja"], jawabanBenar: "4 sampai 5 harakat" },
        { pertanyaan: "Huruf Idgham Bighunnah terdiri dari 4 huruf, yaitu...", opsi: ["ي، ن، م، و", "ل، ر", "ب", "ت، ث، ج"], jawabanBenar: "ي، ن، م، و" },
        { pertanyaan: "Hukum Idzhar Syafawi terjadi apabila Mim Sukun bertemu dengan...", opsi: ["Selain huruf Mim dan Ba", "Huruf Ba saja", "Huruf Mim saja", "Huruf Qamariyah"], jawabanBenar: "Selain huruf Mim dan Ba" },
        { pertanyaan: "Apa nama hukum bacaan ketika ada Huruf Mad bertemu dengan hamzah dalam satu kata?", opsi: ["Mad Wajib Muttasil", "Mad Jaiz Munfasil", "Mad Badal", "Mad Aridh Lissukun"], jawabanBenar: "Mad Wajib Muttasil" },
        { pertanyaan: "Apa nama hukum bacaan ketika ada Huruf Mad bertemu hamzah di lain kata?", opsi: ["Mad Jaiz Munfasil", "Mad Wajib Muttasil", "Mad Lazim", "Mad Tamkin"], jawabanBenar: "Mad Jaiz Munfasil" },
        { pertanyaan: "Huruf Qalqalah yang berada di tengah kata atau dibaca washal disebut Qalqalah...", opsi: ["Sughra", "Kubra", "Akbar", "Sugra Sekali"], jawabanBenar: "Sughra" },
        { pertanyaan: "Huruf Qalqalah yang berada di akhir ayat atau di-waqaf-kan disebut Qalqalah...", opsi: ["Kubra", "Sughra", "Mutawassithah", "Muthlaq"], jawabanBenar: "Kubra" },
        { pertanyaan: "Hukum bacaan Idgham Mutamatsilain terjadi apabila...", opsi: ["Huruf yang sama persis sukun bertemu berharakat", "Huruf yang makhrajnya sama sifatnya beda", "Huruf yang dekat makhrajnya", "Nun sukun bertemu huruf idgham"], jawabanBenar: "Huruf yang sama persis sukun bertemu berharakat" },
        { pertanyaan: "Hukum bacaan Idgham Mutaqaribin terjadi apabila...", opsi: ["Dua huruf yang berdekatan makhraj dan sifatnya", "Dua huruf yang sama persis", "Dua huruf yang berjauhan makhrajnya", "Nun sukun bertemu ba"], jawabanBenar: "Dua huruf yang berdekatan makhraj dan sifatnya" },
        { pertanyaan: "Hukum bacaan Idgham Mutajanisin terjadi apabila...", opsi: ["Dua huruf yang sama makhrajnya tapi beda sifatnya", "Dua huruf yang sama persis", "Dua huruf yang jauh makhrajnya", "Mim sukun bertemu ba"], jawabanBenar: "Dua huruf yang sama makhrajnya tapi beda sifatnya" },
        { pertanyaan: "Berapa panjang bacaan Mad Lazim Muthaqqal Kilmi?", opsi: ["6 harakat", "2 harakat", "4 harakat", "5 harakat"], jawabanBenar: "6 harakat" },
        { pertanyaan: "Mad yang terjadi karena ada huruf sukun asli yang dikarenakan penggantian dari tanwin disebut...", opsi: ["Mad Iwad", "Mad Badal", "Mad Tamkin", "Mad Lazim"], jawabanBenar: "Mad Iwad" },
        { pertanyaan: "Mad yang terjadi pada huruf-huruf fawatih suwar (pembuka surat) di awal Al-Quran disebut...", opsi: ["Mad Lazim Harfi", "Mad Lazim Kilmi", "Mad Badal", "Mad Far'i"], jawabanBenar: "Mad Lazim Harfi" },
        { pertanyaan: "Sifat huruf yang berarti menekan suara di antara dua makhraj disebut...", opsi: ["Tawassuth / Bainiyyah", "Hams", "Jahr", "Syiddah"], jawabanBenar: "Tawassuth / Bainiyyah" },
        { pertanyaan: "Sifat huruf yang berarti tertusnya aliran suara secara sempurna adalah...", opsi: ["Syiddah", "Rakhawah", "Tawassuth", "Hams"], jawabanBenar: "Syiddah" },
        { pertanyaan: "Sifat huruf yang berarti mengalirnya suara adalah...", opsi: ["Rakhawah", "Syiddah", "Isti'la", "Infitah"], jawabanBenar: "Rakhawah" },
        { pertanyaan: "Huruf-huruf Isti'la (yang dibaca tebal) terkumpul dalam kalimat...", opsi: ["خُصَّ ضَغْطٍ قِظْ", "يَرْمُلُون", "يَنْمُ", "أخي هكا"], jawabanBenar: "خُصَّ ضَغْطٍ قِظْ" },
        { pertanyaan: "Kebalikan dari sifat Isti'la adalah sifat...", opsi: ["Istifal", "Infitah", "Idzhaq", "Idzhar"], jawabanBenar: "Istifal" },
        { pertanyaan: "Sifat huruf yang lidahnya merapat ke langit-langit mulut disebut...", opsi: ["Ithbaq", "Infitah", "Islaq", "Ismat"], jawabanBenar: "Ithbaq" },
        { pertanyaan: "Sifat huruf yang lidahnya renggang dari langit-langit disebut...", opsi: ["Infitah", "Ithbaq", "Idzlaq", "Ismat"], jawabanBenar: "Infitah" },
        { pertanyaan: "Huruf-huruf Idzlaq (huruf yang lancar/mudah diucapkan) terkumpul dalam kalimat...", opsi: ["فِرَّ مِنْ لُبِّ", "يَرْمُلُون", "خُصَّ ضَغْطٍ", "قِظْ"], jawabanBenar: "فِرَّ مِنْ لُبِّ" },
        { pertanyaan: "Hukum bacaan mim atau nun yang diberi tasydid harus dibaca dengung dengan kadar...", opsi: ["2 harakat", "1 harakat", "4 harakat", "6 harakat"], jawabanBenar: "2 harakat" },
        { pertanyaan: "Hukum bacaan Ra' yang dibaca tebal (Tafkhim) terjadi apabila Ra' berharakat...", opsi: ["Fathah atau Dammah", "Kasrah", "Sukun didahului kasrah asli", "Sukun di akhir kata"], jawabanBenar: "Fathah atau Dammah" },
        { pertanyaan: "Hukum bacaan Ra' yang dibaca tipis (Tarqiq) terjadi apabila Ra' berharakat...", opsi: ["Kasrah", "Fathah", "Dammah", "Fathahtain"], jawabanBenar: "Kasrah" },
        { pertanyaan: "Huruf Lam pada Lafaz Jalallah (الله) dibaca tebal (Tafkhim) jika huruf sebelumnya berharakat...", opsi: ["Fathah atau Dammah", "Kasrah", "Sukun mutlak", "Tanwin"], jawabanBenar: "Fathah atau Dammah" },
        { pertanyaan: "Huruf Lam pada Lafaz Jalallah (الله) dibaca tipis (Tarqiq) jika huruf sebelumnya berharakat...", opsi: ["Kasrah", "Fathah", "Dammah", "Sukun"], jawabanBenar: "Kasrah" },
        { pertanyaan: "Mad yang terjadi karena pertemuan hamzah dengan huruf mad di mana hamzah mendahului huruf mad disebut...", opsi: ["Mad Badal", "Mad Iwad", "Mad Tamkin", "Mad Far'i"], jawabanBenar: "Mad Badal" },
        { pertanyaan: "Berapa panjang bacaan Mad Badal?", opsi: ["2 harakat", "4 harakat", "6 harakat", "1 harakat"], jawabanBenar: "2 harakat" }
    ],
    menengah: [
        { pertanyaan: "Hukum bacaan pada potongan ayat 'مَنْ يَقُولُ' (Man yaquulu) adalah...", opsi: ["Idgham Bighunnah", "Idgham Bilaghunnah", "Ikhfa Haqiqi", "Idzhar Halqi"], jawabanBenar: "Idgham Bighunnah" },
        { pertanyaan: "Pada potongan ayat 'سَمِيعٌ بَصِيرٌ' (Samii'um-bashiir), terdapat hukum bacaan...", opsi: ["Iqlab", "Ikhfa Syafawi", "Ikhfa Haqiqi", "Idgham Mimi"], jawabanBenar: "Iqlab" },
        { pertanyaan: "Perbedaan utama antara Mad Wajib Muttasil dan Mad Jaiz Munfasil adalah...", opsi: ["Mad Wajib dalam satu kata, Mad Jaiz beda kata", "Mad Wajib beda kata, Mad Jaiz satu kata", "Mad Wajib panjangnya 2 harakat, Mad Jaiz 6 harakat", "Mad Wajib bertemu sukun, Mad Jaiz bertemu tasydid"], jawabanBenar: "Mad Wajib dalam satu kata, Mad Jaiz beda kata" },
        { pertanyaan: "Hukum bacaan pada kata 'إِنَّا أَعْطَيْنَاكَ' (Innaaa a'thainaaka) adalah...", opsi: ["Mad Jaiz Munfasil", "Mad Wajib Muttasil", "Mad Badal", "Mad 'Aridh Lissukun"], jawabanBenar: "Mad Jaiz Munfasil" },
        { pertanyaan: "Huruf Ra' (ر) pada kata 'فِرْعَوْنَ' (Fir'auna) dibaca secara...", opsi: ["Tarqiq (Tipis)", "Tafkhim (Tebal)", "Jawazul Wajhain (Boleh tebal/tipis)", "Ghunnah"], jawabanBenar: "Tarqiq (Tipis)" },
        { pertanyaan: "Pada lafaz Allah (Lafdzhul Jalalah) 'مِنَ اللَّهِ' (Minallah), cara membacanya adalah...", opsi: ["Tafkhim (Tebal)", "Tarqiq (Tipis)", "Idgham", "Ikhfa"], jawabanBenar: "Tafkhim (Tebal)" },
        { pertanyaan: "Hukum bacaan pada potongan ayat 'وَمَا هُمْ بِمُؤْمِنِينَ' (Wamaa hum bimu'miniin) adalah...", opsi: ["Ikhfa Syafawi", "Idgham Mimi", "Idzhar Syafawi", "Iqlab"], jawabanBenar: "Ikhfa Syafawi" },
        { pertanyaan: "Hukum bacaan Mad yang terjadi apabila Mad Thabi'i bertemu dengan huruf hidup yang di-waqaf-kan di akhir ayat disebut...", opsi: ["Mad 'Aridh Lissukun", "Mad Lin (Layyin)", "Mad Iwad", "Mad Badal"], jawabanBenar: "Mad 'Aridh Lissukun" },
        { pertanyaan: "Hukum bacaan pada kata 'خَوْفٍ' (Khouf) jika dibaca waqaf adalah...", opsi: ["Mad Lin (Layyin)", "Mad 'Aridh Lissukun", "Mad Iwad", "Mad Thabi'i"], jawabanBenar: "Mad Lin (Layyin)" },
        { pertanyaan: "Hukum Qalqalah pada akhir kata yang ber-tasydid seperti pada kata 'وَتَبَّ' (Wa tabb) disebut...", opsi: ["Qalqalah Akbar (Kubra)", "Qalqalah Sughra", "Qalqalah Mutawassithah", "Qalqalah Ashghar"], jawabanBenar: "Qalqalah Akbar (Kubra)" },
        { pertanyaan: "Hukum tajwid pada lafaz 'مِنْ خَيْرٍ' (Min khairin) adalah...", opsi: ["Idzhar Halqi", "Idgham Bighunnah", "Ikhfa Haqiqi", "Idgham Bilaghunnah"], jawabanBenar: "Idzhar Halqi" },
        { pertanyaan: "Hukum tajwid pada lafaz 'أَنْعَمْتَ' (An'amta) adalah...", opsi: ["Idzhar Halqi", "Ikhfa Haqiqi", "Idgham Bighunnah", "Iqlab"], jawabanBenar: "Idzhar Halqi" },
        { pertanyaan: "Hukum tajwid pada lafaz 'مِنْ ثَمَرَةٍ' (Min tsamratin) adalah...", opsi: ["Ikhfa Haqiqi", "Idzhar Halqi", "Idgham Bighunnah", "Iqlab"], jawabanBenar: "Ikhfa Haqiqi" },
        { pertanyaan: "Hukum tajwid pada lafaz 'قَوْلًا مَعْرُوفًا' (Qaulan ma'ruufan) adalah...", opsi: ["Idgham Bighunnah", "Idgham Bilaghunnah", "Idzhar Halqi", "Ikhfa Haqiqi"], jawabanBenar: "Idgham Bighunnah" },
        { pertanyaan: "Hukum tajwid pada lafaz 'هُدًى لِلْمُتَّقِينَ' (Hudan lilmuttaqiin) adalah...", opsi: ["Idgham Bilaghunnah", "Idgham Bighunnah", "Idzhar Halqi", "Ikhfa Haqiqi"], jawabanBenar: "Idgham Bilaghunnah" },
        { pertanyaan: "Hukum tajwid pada lafaz 'سَمِيعٌ عَلِيمٌ' (Samii'un 'aliimun) adalah...", opsi: ["Idzhar Halqi", "Idgham Bighunnah", "Ikhfa Haqiqi", "Iqlab"], jawabanBenar: "Idzhar Halqi" },
        { pertanyaan: "Hukum tajwid pada lafaz 'كِرَامٍ بَرَرَةٍ' (Kiraamim bararah) adalah...", opsi: ["Iqlab", "Ikhfa Syafawi", "Idzhar Syafawi", "Idgham Mimi"], jawabanBenar: "Iqlab" },
        { pertanyaan: "Hukum tajwid pada lafaz 'عَذَابٌ أَلِيمٌ' ('Adzaabun aliimun) adalah...", opsi: ["Idzhar Halqi", "Ikhfa Haqiqi", "Idgham Bighunnah", "Iqlab"], jawabanBenar: "Idzhar Halqi" },
        { pertanyaan: "Hukum tajwid pada lafaz 'فِي قُلُوبِهِمْ مَرَضٌ' (Fii quluubihim maradun) adalah...", opsi: ["Idgham Mimi (Mutamatsilain)", "Ikhfa Syafawi", "Idzhar Syafawi", "Iqlab"], jawabanBenar: "Idgham Mimi (Mutamatsilain)" },
        { pertanyaan: "Hukum tajwid pada lafaz 'لَهُمْ مَغْفِرَةٌ' (Lahum maghfiratun) adalah...", opsi: ["Idzhar Syafawi", "Idgham Mimi", "Ikhfa Syafawi", "Iqlab"], jawabanBenar: "Idzhar Syafawi" },
        { pertanyaan: "Apa nama hukum bacaan Mad pada lafaz 'جَاءَ' (Ja'a)?", opsi: ["Mad Wajib Muttasil", "Mad Jaiz Munfasil", "Mad 'Aridh Lissukun", "Mad Thabi'i"], jawabanBenar: "Mad Wajib Muttasil" },
        { pertanyaan: "Apa nama hukum bacaan Mad pada lafaz 'قَالُوا آمَنَّا' (Qaaluu aamannaa)?", opsi: ["Mad Jaiz Munfasil", "Mad Wajib Muttasil", "Mad Badal", "Mad Tamkin"], jawabanBenar: "Mad Jaiz Munfasil" },
        { pertanyaan: "Hukum bacaan pada kata 'مِصْرَ' (Mishra) dengan Ra' sukun didahului huruf shad sukun adalah...", opsi: ["Tafkhim (Tebal)", "Tarqiq (Tipis)", "Jawazul Wajhain", "Ghunnah"], jawabanBenar: "Tafkhim (Tebal)" },
        { pertanyaan: "Hukum bacaan pada kata 'الْقِطْرِ' (Al-qithri) dengan Ra' kasrah di akhir ayat yang di-waqaf-kan menjadi sukun didahului tha' berharakat kasrah adalah...", opsi: ["Tarqiq (Tipis)", "Tafkhim (Tebal)", "Boleh tebal atau tipis", "Ghunnah"], jawabanBenar: "Tarqiq (Tipis)" },
        { pertanyaan: "Berapa harakat panjang bacaan Mad Lazim Mukhaffaf Kilmi?", opsi: ["6 harakat", "2 harakat", "4 harakat", "5 harakat"], jawabanBenar: "6 harakat" },
        { pertanyaan: "Contoh ayat Mad Lazim Mukhaffaf Kilmi dalam Al-Quran hanya terdapat pada surat Yunus kata...", opsi: ["الْآنَ (Al-aana)", "الضَّآلِّينَ", "حَصِيرًا", "ءَآلْآنَ"], jawabanBenar: "الْآنَ (Al-aana)" },
        { pertanyaan: "Hukum bacaan pada huruf 'ص' pada awal surat Maryam (كهيعص) adalah...", opsi: ["Mad Lazim Harfi Mukhaffaf", "Mad Lazim Harfi Muthaqqal", "Mad Thabi'i Harfi", "Mad Badali"], jawabanBenar: "Mad Lazim Harfi Mukhaffaf" },
        { pertanyaan: "Hukum bacaan pada huruf 'الم' (Alif Lam Mim) pada awal surat Al-Baqarah adalah...", opsi: ["Mad Lazim Harfi Muthaqqal", "Mad Lazim Harfi Mukhaffaf", "Mad Jaiz", "Mad Wajib"], jawabanBenar: "Mad Lazim Harfi Muthaqqal" },
        { pertanyaan: "Mad yang terjadi pada huruf Ya' ber-tasydid yang didahului dengan Ya' berharakat kasrah disebut...", opsi: ["Mad Tamkin", "Mad Badal", "Mad Far'i", "Mad Lazim"], jawabanBenar: "Mad Tamkin" },
        { pertanyaan: "Contoh kata yang mengandung Mad Tamkin adalah...", opsi: ["النَّبِيِّينَ (النبيين)", "ءَآمَنُوا", "قَالُوا", "خَوْفٍ"], jawabanBenar: "النَّبِيِّينَ (النبيين)" }
    ],
    lanjut: [
       { pertanyaan: "JEBAKAN: Pada kata 'دُنْيَا' (Dunya) dan 'بُنْيَانٌ' (Bunyaan), terdapat Nun Sukun bertemu Ya. Namun hukum bacaannya BUKAN Idgham Bighunnah, melainkan...", opsi: ["Idzhar Mutlaq (Wajib)", "Idzhar Syafawi", "Ikhfa Haqiqi", "Idgham Bilaghunnah"], jawabanBenar: "Idzhar Mutlaq (Wajib)" },
        { pertanyaan: "Dalam Surah Hud ayat 41, kata 'مَجْرَاهَا' dibaca condong antara harakat fathah dan kasrah (Majreha). Bacaan Gharib ini disebut...", opsi: ["Imalah", "Isymam", "Saktah", "Tashil"], jawabanBenar: "Imalah" },
        { pertanyaan: "Dalam Surah Yusuf ayat 11, kata 'لَا تَأْمَنَّا' dibaca dengan mencucu (memoncongkan) bibir di tengah dengungan. Bacaan ini disebut...", opsi: ["Isymam", "Naql", "Tashil", "Imalah"], jawabanBenar: "Isymam" },
        { pertanyaan: "Dalam Surah Al-Hujurat ayat 11, lafaz 'بِئْسَ الِاسْمُ' dibaca 'Bi'salismu'. Pemindahan harakat hamzah ke huruf mati sebelumnya disebut...", opsi: ["Naql", "Saktah", "Isymam", "Tashil"], jawabanBenar: "Naql" },
        { pertanyaan: "Berhenti sejenak tanpa mengambil napas (sekitar 2 harakat) seperti pada ayat 'كَلَّا ۖ بَلْ ۜ رَانَ' disebut...", opsi: ["Saktah", "Waqaf", "Qatha'", "Sujud Tilawah"], jawabanBenar: "Saktah" },
        { pertanyaan: "Hukum bacaan pada kata 'الضَّآلِّينَ' (Adh-dhaaaalliin) di mana Mad bertemu huruf ber-tasydid dalam satu kata, disebut...", opsi: ["Mad Lazim Muthaqqal Kilmi", "Mad Lazim Mukhaffaf Kilmi", "Mad Lazim Harfi Muthaqqal", "Mad Wajib Muttasil"], jawabanBenar: "Mad Lazim Muthaqqal Kilmi" },
        { pertanyaan: "Tanda Waqaf Lazim yang mewajibkan pembaca untuk berhenti ditandai dengan huruf...", opsi: ["م (Mim)", "لا (Lam Alif)", "ج (Jim)", "صلى (Shala)"], jawabanBenar: "م (Mim)" },
        { pertanyaan: "Tanda waqaf (لا) di tengah ayat bermakna...", opsi: ["Waqaf Mamnu' (Dilarang berhenti)", "Waqaf Jaiz (Boleh berhenti/lanjut)", "Al-Waqfu Awla (Lebih baik berhenti)", "Al-Waslu Awla (Lebih baik disambung)"], jawabanBenar: "Waqaf Mamnu' (Dilarang berhenti)" },
        { pertanyaan: "Tanda waqaf (قلى) bermakna...", opsi: ["Al-Waqfu Awla (Lebih baik berhenti)", "Al-Waslu Awla (Lebih baik lanjut/sambung)", "Waqaf Jaiz (Sama baiknya)", "Waqaf Lazim (Wajib berhenti)"], jawabanBenar: "Al-Waqfu Awla (Lebih baik berhenti)" },
        { pertanyaan: "Membaca dua hamzah berdampingan dengan meringankan hamzah kedua (seperti pada lafaz 'ءَاعْجَمِيٌّ' di Surah Fussilat) disebut...", opsi: ["Tashil", "Imalah", "Naql", "Isymam"], jawabanBenar: "Tashil" },
        { pertanyaan: "Selain kata 'دُنْيَا' dan 'بُنْيَانٌ', ada dua kata lagi dalam Al-Quran yang hukumnya Idzhar Mutlaq, yaitu...", opsi: ["صِنْوَانٌ dan جِنْوَانٌ", "أَنْعَمْتَ dan صِرَاطَ", "قِوَامًا dan لِقَائِهِمْ", "رِزْقًا dan فَاطِرَ"], jawabanBenar: "صِنْوَانٌ dan جِنْوَانٌ" },
        { pertanyaan: "Berapa jumlah tempat bacaan Saktah (berhenti sejenak tanpa bernapas) yang wajib dalam riwayat Hafs dari Ashim?", opsi: ["4 tempat", "2 tempat", "3 tempat", "5 tempat"], jawabanBenar: "4 tempat" },
        { pertanyaan: "Di surat manakah letak salah satu Saktah wajib dalam Al-Quran menurut riwayat Hafs?", opsi: ["Surah Al-Kahfi ayat 1 (عِوَجَا ۜ قَيِّمًا)", "Surah Al-Baqarah ayat 1", "Surah Yasin ayat 1", "Surah Al-Mulk ayat 1"], jawabanBenar: "Surah Al-Kahfi ayat 1 (عِوَجَا ۜ قَيِّمًا)" },
        { pertanyaan: "Di surat manakah Saktah wajib terdapat pada kata 'مَرْقَدِنَا ۜ هَٰذَا'?", opsi: ["Surah Yasin ayat 52", "Surah Al-Qiyamah ayat 27", "Surah Al-Muthaffifin ayat 14", "Surah Al-Kahfi ayat 1"], jawabanBenar: "Surah Yasin ayat 52" },
        { pertanyaan: "Di surat manakah Saktah wajib terdapat pada kata 'مَنْ ۜ رَاقٍ'?", opsi: ["Surah Al-Qiyamah ayat 27", "Surah Al-Muthaffifin ayat 14", "Surah Yasin ayat 52", "Surah Al-Kahfi ayat 1"], jawabanBenar: "Surah Al-Qiyamah ayat 27" },
        { pertanyaan: "Di surat manakah Saktah wajib terdapat pada kata 'بَلْ ۜ رَانَ'?", opsi: ["Surah Al-Muthaffifin ayat 14", "Surah Al-Qiyamah ayat 27", "Surah Yasin ayat 52", "Surah Al-Kahfi ayat 1"], jawabanBenar: "Surah Al-Muthaffifin ayat 14" },
        { pertanyaan: "Apa hukum bacaan Ra' pada lafaz 'فِرْقٍ' di Surah Al-Syu'ara ayat 63 karena bertemunya huruf isti'la kasrah?", opsi: ["Boleh dibaca tebal (Tafkhim) atau tipis (Tarqiq), namun Tafkhim lebih utama", "Wajib tebal", "Wajib tipis", "Harus di-idgham-kan"], jawabanBenar: "Boleh dibaca tebal (Tafkhim) atau tipis (Tarqiq), namun Tafkhim lebih utama" },
        { pertanyaan: "Apa hukum bacaan Ra' pada lafaz 'مِصْرَ' ketika di-waqaf-kan dengan sukun?", opsi: ["Boleh dibaca tebal atau tipis, namun Tarqiq lebih utama", "Wajib tebal", "Wajib tipis", "Mutlak harus dibaca tebal"], jawabanBenar: "Boleh dibaca tebal atau tipis, namun Tarqiq lebih utama" },
        { pertanyaan: "Apa hukum bacaan Ra' pada kata 'الْقِطْرِ' ketika di-waqaf-kan?", opsi: ["Boleh dibaca tebal atau tipis, namun Tafkhim lebih utama", "Wajib tipis", "Wajib tebal", "Tidak boleh di-waqaf-kan"], jawabanBenar: "Boleh dibaca tebal atau tipis, namun Tafkhim lebih utama" },
        { pertanyaan: "Bagaimana cara membaca huruf 'ص' pada kata 'بَصْطَةً' (Al-A'raf: 69) menurut riwayat Hafs?", opsi: ["Dibaca dengan huruf Sin (بَسْطَةً)", "Tetap dibaca Shod", "Dibaca Zai", "Dibaca tebal seperti huruf Dhad"], jawabanBenar: "Dibaca dengan huruf Sin (بَسْطَةً)" },
        { pertanyaan: "Bagaimana cara membaca kata 'بِطَاسَةٍ' atau 'بَسْطَةً' (Al-Baqarah: 245) pada huruf Sin yang bertuliskan Shod?", opsi: ["Boleh dibaca Shod atau Sin, namun Sin lebih utama", "Wajib Shod", "Wajib Sin", "Harus dipantulkan"], jawabanBenar: "Boleh dibaca Shod atau Sin, namun Sin lebih utama" },
        { pertanyaan: "Kata 'الْمُصَيْطِرُونَ' (At-Tur: 37) boleh dibaca dengan huruf...", opsi: ["Sin (المُسَيْطِرُونَ) atau tetap Shod", "Zai saja", "Ta saja", "Dhad saja"], jawabanBenar: "Sin (المُسَيْطِرُونَ) atau tetap Shod" },
        { pertanyaan: "Kata 'سَيْطَرُونَ' pada Surah Al-Ghasyiyah ayat 22 ditulis dengan Shod (الصَّيْطِرُونَ). Cara membacanya yang benar adalah...", opsi: ["Wajib dibaca dengan huruf Sin (السَّيْطِرُونَ)", "Wajib dibaca Shod", "Boleh Sin boleh Shod", "Dibaca dengung"], jawabanBenar: "Wajib dibaca dengan huruf Sin (السَّيْطِرُونَ)" },
        { pertanyaan: "Apa arti tanda waqaf (ج) dalam Mushaf Al-Quran?", opsi: ["Waqaf Jaiz (Boleh berhenti atau diteruskan dengan sama baiknya)", "Waqaf Lazim", "Waqaf Mamnu'", "Al-Waqfu Awla"], jawabanBenar: "Waqaf Jaiz (Boleh berhenti atau diteruskan dengan sama baiknya)" },
        { pertanyaan: "Apa arti tanda waqaf (ۛ ۛ) yang disebut Mu'anaqah (Waqaf Musafahah)?", opsi: ["Boleh berhenti di salah satu tanda titik tiga tersebut, tidak boleh di kedua-duanya", "Wajib berhenti di keduanya", "Dilarang berhenti di keduanya", "Harus disambung terus"], jawabanBenar: "Boleh berhenti di salah satu tanda titik tiga tersebut, tidak boleh di kedua-duanya" },
        { pertanyaan: "Apa arti tanda waqaf (صلى)?", opsi: ["Al-Waslu Awla (Lebih baik diteruskan/disambung)", "Al-Waqfu Awla (Lebih baik berhenti)", "Waqaf Lazim", "Dilarang berhenti"], jawabanBenar: "Al-Waslu Awla (Lebih baik diteruskan/disambung)" },
        { pertanyaan: "Apa hukum bacaan pada lafaz 'يَلْهَثْ ذَلِكَ' (Al-A'raf: 176) di mana huruf Tsa' sukun bertemu Dzal?", opsi: ["Idgham Mutajanisin (huruf Ta' di-idgham-kan ke Dzal)", "Idzhar", "Ikhfa", "Idgham Bighunnah"], jawabanBenar: "Idgham Mutajanisin (huruf Ta' di-idgham-kan ke Dzal)" },
        { pertanyaan: "Apa hukum bacaan pada lafaz 'رَكِبْتَمُ' (Hud: 42) di mana huruf Ba' sukun bertemu Mim?", opsi: ["Idgham Mutajanisin (Ba' di-idgham-kan ke Mim secara sempurna menurut qiraat tertentu, tapi Hafs membacanya jelas/idzhar)", "Idgham Bighunnah", "Ikhfa Syafawi", "Idzhar Syafawi"], jawabanBenar: "Idgham Mutajanisin (Ba' di-idgham-kan ke Mim secara sempurna menurut qiraat tertentu, tapi Hafs membacanya jelas/idzhar)" },
        { pertanyaan: "Mad yang wajib dipanjangkan 6 harakat secara mutlak tanpa perbedaan ulama qiraat adalah...", opsi: ["Mad Lazim", "Mad Wajib Muttasil", "Mad Jaiz Munfasil", "Mad Aridh Lissukun"], jawabanBenar: "Mad Lazim" },
        { pertanyaan: "Mad Far'i yang disebabkan oleh bertemunya huruf mad dengan sukun asli yang dikarenakan meringankan huruf bertasydid disebut...", opsi: ["Mad Lazim Muthaqqal", "Mad Lazim Mukhaffaf", "Mad Farq", "Mad Badal"], jawabanBenar: "Mad Lazim Muthaqqal" }
    ]
};

const bankSoalMakharijul = {
    dasar: [
        { pertanyaan: "Berapa jumlah daerah utama tempat keluarnya suara (makhraj) huruf hijaiyah secara umum?", opsi: ["5 daerah utama", "3 daerah utama", "7 daerah utama", "10 daerah utama"], jawabanBenar: "5 daerah utama" },
        { pertanyaan: "Apa nama daerah makhraj yang terletak di rongga tenggorokan?", opsi: ["Al-Halq (Tenggorokan)", "Al-Jauf (Rongga Mulut)", "Al-Lisan (Lidah)", "Asy-Syafatan (Bibir)"], jawabanBenar: "Al-Halq (Tenggorokan)" },
        { pertanyaan: "Apa nama daerah makhraj yang terletak di rongga mulut dan rongga tenggorokan (tempat keluarnya huruf mad)?", opsi: ["Al-Jauf", "Al-Halq", "Al-Khaisyum", "Al-Lisan"], jawabanBenar: "Al-Jauf" },
        { pertanyaan: "Huruf-huruf Al-Jauf (huruf mad: Alif, Wawu sukun, Ya sukun) keluar dari...", opsi: ["Rongga tenggorokan dan rongga mulut", "Pangkal lidah", "Dua bibir", "Rongga hidung"], jawabanBenar: "Rongga tenggorokan dan rongga mulut" },
        { pertanyaan: "Apa nama daerah makhraj yang terletak di rongga hidung (tempat keluarnya suara dengung/ghunnah)?", opsi: ["Al-Khaisyum", "Al-Jauf", "Al-Halq", "Asy-Syafatan"], jawabanBenar: "Al-Khaisyum" },
        { pertanyaan: "Huruf Mim dan Nun bertasydid keluar dari makhraj...", opsi: ["Al-Khaisyum (Rongga Hidung)", "Al-Jauf", "Al-Lisan", "Al-Halq"], jawabanBenar: "Al-Khaisyum (Rongga Hidung)" },
        { pertanyaan: "Bagian tubuh manakah yang menjadi makhraj terbanyak bagi huruf hijaiyah (memuat 10 makhraj khusus)?", opsi: ["Al-Lisan (Lidah)", "Asy-Syafatan (Bibir)", "Al-Halq (Tenggorokan)", "Al-Jauf"], jawabanBenar: "Al-Lisan (Lidah)" },
        { pertanyaan: "Berapa jumlah makhraj khusus yang terdapat pada daerah Asy-Syafatan (Bibir)?", opsi: ["2 makhraj khusus (4 huruf)", "3 makhraj khusus", "1 makhraj khusus", "4 makhraj khusus"], jawabanBenar: "2 makhraj khusus (4 huruf)" },
        { pertanyaan: "Huruf-huruf Halqiyah (tenggorokan) berjumlah berapa huruf?", opsi: ["6 huruf", "4 huruf", "5 huruf", "8 huruf"], jawabanBenar: "6 huruf" },
        { pertanyaan: "Huruf-huruf apakah yang keluar dari rongga tenggorokan bagian paling bawah (Aqshal Halq)?", opsi: ["Hamzah (ء) dan Ha (هـ)", "Ain (ع) dan Ha (ح)", "Kha (خ) dan Ghain (غ)", "Qaf dan Kaf"], jawabanBenar: "Hamzah (ء) dan Ha (هـ)" },
        { pertanyaan: "Secara bahasa, kata 'Makhraj' memiliki arti...", opsi: ["Tempat keluar", "Tempat masuk", "Sifat suara", "Cara baca"], jawabanBenar: "Tempat keluar" },
        { pertanyaan: "Secara istilah ilmu tajwid, makhraj adalah...", opsi: ["Tempat keluarnya huruf dan pembeda antara satu huruf dengan huruf lainnya", "Panjang bacaan suatu ayat", "Sifat wajib huruf", "Tanda waqaf dalam Al-Quran"], jawabanBenar: "Tempat keluarnya huruf dan pembeda antara satu huruf dengan huruf lainnya" },
        { pertanyaan: "Berapa total keseluruhan makhraj khusus (tempat keluar huruf yang rinci) menurut pendapat yang muktamad (Al-Khalil dan Ibnu Jazari)?", opsi: ["17 makhraj khusus", "14 makhraj khusus", "20 makhraj khusus", "10 makhraj khusus"], jawabanBenar: "17 makhraj khusus" },
        { pertanyaan: "Huruf-huruf Hijaiyah secara keseluruhan berjumlah...", opsi: ["28 atau 29 huruf", "25 huruf", "30 huruf", "20 huruf"], jawabanBenar: "28 atau 29 huruf" },
        { pertanyaan: "Manakah di bawah ini yang BUKAN merupakan daerah makhraj utama?", opsi: ["Al-Anf (Hidung luar saja tanpa rongga)", "Al-Jauf", "Al-Halq", "Al-Lisan"], jawabanBenar: "Al-Anf (Hidung luar saja tanpa rongga)" },
        { pertanyaan: "Huruf Alif yang didahului fathah, Wawu sukun didahului dammah, dan Ya sukun didahului kasrah disebut huruf...", opsi: ["Huruf Mad / Jaufiyah", "Huruf Qalqalah", "Huruf Halqiyah", "Huruf Syafawiyah"], jawabanBenar: "Huruf Mad / Jaufiyah" },
        { pertanyaan: "Huruf-huruf tenggorokan (Al-Halq) dibagi menjadi berapa bagian makhraj khusus?", opsi: ["3 bagian", "2 bagian", "4 bagian", "1 bagian"], jawabanBenar: "3 bagian" },
        { pertanyaan: "Bagian tenggorokan manakah yang posisinya paling dekat dengan mulut?", opsi: ["Adnal Halq (Tenggorokan atas)", "Wasatuh Halq (Tenggorokan tengah)", "Aqshal Halq (Tenggorokan bawah)", "Pangkal lidah"], jawabanBenar: "Adnal Halq (Tenggorokan atas)" },
        { pertanyaan: "Bagian tenggorokan manakah yang posisinya paling dekat dengan dada?", opsi: ["Aqshal Halq (Tenggorokan bawah)", "Wasatuh Halq (Tenggorokan tengah)", "Adnal Halq (Tenggorokan atas)", "Ujung lidah"], jawabanBenar: "Aqshal Halq (Tenggorokan bawah)" },
        { pertanyaan: "Huruf Ha (هـ) dan Hamzah (ء) keluar dari...", opsi: ["Aqshal Halq (Tenggorokan bawah)", "Wasatuh Halq", "Adnal Halq", "Lidah"], jawabanBenar: "Aqshal Halq (Tenggorokan bawah)" },
        { pertanyaan: "Huruf Ain (ع) dan Ha (ح) keluar dari...", opsi: ["Wasatuh Halq (Tenggorokan tengah)", "Aqshal Halq", "Adnal Halq", "Bibir"], jawabanBenar: "Wasatuh Halq (Tenggorokan tengah)" },
        { pertanyaan: "Huruf Ghain (غ) dan Kha (خ) keluar dari...", opsi: ["Adnal Halq (Tenggorokan atas)", "Wasatuh Halq", "Aqshal Halq", "Pangkal lidah"], jawabanBenar: "Adnal Halq (Tenggorokan atas)" },
        { pertanyaan: "Berapa jumlah makhraj khusus yang ada pada lidah (Al-Lisan)?", opsi: ["10 makhraj khusus", "5 makhraj khusus", "2 makhraj khusus", "8 makhraj khusus"], jawabanBenar: "10 makhraj khusus" },
        { pertanyaan: "Berapa jumlah huruf hijaiyah yang keluar dari lidah secara keseluruhan?", opsi: ["18 huruf", "15 huruf", "10 huruf", "22 huruf"], jawabanBenar: "18 huruf" },
        { pertanyaan: "Huruf Qaf (ق) keluar dari bagian lidah sebelah...", opsi: ["Pangkal lidah (Aqshal Lisan)", "Tengah lidah", "Ujung lidah", "Tepi lidah"], jawabanBenar: "Pangkal lidah (Aqshal Lisan)" },
        { pertanyaan: "Huruf Kaf (ك) keluar dari bagian lidah sebelah...", opsi: ["Pangkal lidah bagian depan/atas", "Ujung lidah", "Tengah lidah", "Dua bibir"], jawabanBenar: "Pangkal lidah bagian depan/atas" },
        { pertanyaan: "Huruf Jim (ج), Syin (ش), dan Ya (ي) keluar dari daerah...", opsi: ["Tengah lidah (Wasatul Lisan)", "Pangkal lidah", "Ujung lidah", "Tepi lidah"], jawabanBenar: "Tengah lidah (Wasatul Lisan)" },
        { pertanyaan: "Huruf Dhad (ض) keluar dari daerah...", opsi: ["Tepi lidah (Hafatul Lisan)", "Ujung lidah", "Pangkal lidah", "Rongga mulut"], jawabanBenar: "Tepi lidah (Hafatul Lisan)" },
        { pertanyaan: "Huruf Lam (ل) keluar dari daerah...", opsi: ["Tepi lidah bagian depan hingga ujungnya", "Pangkal lidah", "Tengah lidah", "Dua bibir"], jawabanBenar: "Tepi lidah bagian depan hingga ujungnya" },
        { pertanyaan: "Huruf Nun (ن) keluar dari daerah...", opsi: ["Ujung lidah (Tarful Lisan)", "Pangkal lidah", "Tengah lidah", "Tenggorokan"], jawabanBenar: "Ujung lidah (Tarful Lisan)" },
        { pertanyaan: "Huruf Ra' (ر) keluar dari daerah...", opsi: ["Ujung lidah agak ke punggung lidah", "Pangkal lidah", "Tengah lidah", "Bibir bawah"], jawabanBenar: "Ujung lidah agak ke punggung lidah" },
        { pertanyaan: "Huruf Tha (ط), Dal (د), dan Ta (ت) keluar dari...", opsi: ["Ujung lidah dan pangkal gigi seri atas", "Ujung lidah dan gigi seri bawah", "Dua bibir", "Tenggorokan atas"], jawabanBenar: "Ujung lidah dan pangkal gigi seri atas" },
        { pertanyaan: "Huruf Shad (ص), Zai (ز), dan Sin (س) keluar dari...", opsi: ["Ujung lidah dan ujung gigi seri atas/bawah", "Pangkal lidah", "Tengah lidah", "Geraham atas"], jawabanBenar: "Ujung lidah dan ujung gigi seri atas/bawah" },
        { pertanyaan: "Huruf Tsa (ث), Dzal (ذ), dan Zha (ظ) keluar dari...", opsi: ["Ujung lidah dan ujung gigi seri atas", "Ujung lidah dan gigi seri bawah", "Dua bibir", "Tenggorokan"], jawabanBenar: "Ujung lidah dan ujung gigi seri atas" },
        { pertanyaan: "Huruf Fa (ف) keluar dari...", opsi: ["Bibircbawah bagian dalam dan ujung gigi seri atas", "Dua bibir rapat", "Pangkal lidah", "Rongga hidung"], jawabanBenar: "Bibircbawah bagian dalam dan ujung gigi seri atas" },
        { pertanyaan: "Huruf Wawu (و) keluar dari...", opsi: ["Dua bibir dengan memonyongkan bibir", "Ujung lidah", "Tenggorokan", "Rongga hidung"], jawabanBenar: "Dua bibir dengan memonyongkan bibir" },
        { pertanyaan: "Huruf Ba (ب) dan Mim (م) keluar dari...", opsi: ["Dua bibir dengan merapatkan bibir", "Ujung gigi seri", "Tengah lidah", "Tenggorokan atas"], jawabanBenar: "Dua bibir dengan merapatkan bibir" },
        { pertanyaan: "Apakah nama makhraj untuk suara dengung (ghunnah)?", opsi: ["Al-Khaisyum", "Al-Jauf", "Al-Halq", "Asy-Syafatan"], jawabanBenar: "Al-Khaisyum" },
        { pertanyaan: "Bagian manakah dari hidung yang mengeluarkan suara ghunnah?", opsi: ["Pangkal hidung / rongga hidung bagian dalam", "Ujung hidung", "Lubang hidung luar", "Sumbatan hidung"], jawabanBenar: "Pangkal hidung / rongga hidung bagian dalam" },
        { pertanyaan: "Berapa huruf hijaiyah yang makhrajnya berada di tenggorokan (Al-Halq)?", opsi: ["6 huruf", "5 huruf", "4 huruf", "7 huruf"], jawabanBenar: "6 huruf" },
        { pertanyaan: "Berapa huruf hijaiyah yang makhrajnya berada di lidah (Al-Lisan)?", opsi: ["18 huruf", "16 huruf", "20 huruf", "14 huruf"], jawabanBenar: "18 huruf" },
        { pertanyaan: "Berapa huruf hijaiyah yang makhrajnya berada di bibir (Asy-Syafatan)?", opsi: ["4 huruf", "5 huruf", "3 huruf", "6 huruf"], jawabanBenar: "4 huruf" },
        { pertanyaan: "Berapa huruf hijaiyah yang makhrajnya berada di rongga (Al-Jauf)?", opsi: ["3 huruf", "4 huruf", "2 huruf", "5 huruf"], jawabanBenar: "3 huruf" },
        { pertanyaan: "Huruf manakah yang keluar dari rongga hidung (Al-Khaisyum) secara zat suara murni tanpa huruf lidah?", opsi: ["Tidak ada huruf zat murni, Khaisyum adalah tempat keluarnya sifat ghunnah (pada Mim dan Nun)", "Huruf Mim saja", "Huruf Nun saja", "Huruf Wawu"], jawabanBenar: "Tidak ada huruf zat murni, Khaisyum adalah tempat keluarnya sifat ghunnah (pada Mim dan Nun)" },
        { pertanyaan: "Apa sebutan bagi huruf-huruf yang keluar dari tenggorokan?", opsi: ["Huruf Halqiyah", "Huruf Lisaniyah", "Huruf Syafawiyah", "Huruf Jaufiyah"], jawabanBenar: "Huruf Halqiyah" },
        { pertanyaan: "Apa sebutan bagi huruf-huruf yang keluar dari lidah?", opsi: ["Huruf Lisaniyah", "Huruf Halqiyah", "Huruf Syafawiyah", "Huruf Jaufiyah"], jawabanBenar: "Huruf Lisaniyah" },
        { pertanyaan: "Apa sebutan bagi huruf-huruf yang keluar dari bibir?", opsi: ["Huruf Syafawiyah", "Huruf Lisaniyah", "Huruf Halqiyah", "Huruf Jaufiyah"], jawabanBenar: "Huruf Syafawiyah" },
        { pertanyaan: "Apa sebutan bagi huruf-huruf yang keluar dari rongga mulut/tenggorokan?", opsi: ["Huruf Jaufiyah / Maddiyah", "Huruf Syafawiyah", "Huruf Halqiyah", "Huruf Qamariyah"], jawabanBenar: "Huruf Jaufiyah / Maddiyah" },
        { pertanyaan: "Manakah huruf berikut yang termasuk huruf Halqiyah?", opsi: ["ع (Ain)", "ق (Qaf)", "ك (Kaf)", "ج (Jim)"], jawabanBenar: "ع (Ain)" },
        { pertanyaan: "Manakah huruf berikut yang termasuk huruf Lisaniyah?", opsi: ["ش (Syin)", "هـ (Ha)", "ء (Hamzah)", "م (Mim)"], jawabanBenar: "ش (Syin)" },
        { pertanyaan: "Manakah huruf berikut yang termasuk huruf Syafawiyah?", opsi: ["ب (Ba)", "ن (Nun)", "ل (Lam)", "ر (Ra)"], jawabanBenar: "ب (Ba)" },
        { pertanyaan: "Huruf manakah yang keluar dari dua bibir yang tertutup rapat?", opsi: ["ب (Ba) dan م (Mim)", "ف (Fa)", "و (Wawu)", "ت (Ta)"], jawabanBenar: "ب (Ba) dan م (Mim)" },
        { pertanyaan: "Huruf manakah yang keluar dari bibir bawah bagian dalam dengan ujung gigi seri atas?", opsi: ["ف (Fa)", "ب (Ba)", "م (Mim)", "و (Wawu)"], jawabanBenar: "ف (Fa)" },
        { pertanyaan: "Huruf manakah yang keluar dari dua bibir dengan cara memonyongkannya ke depan?", opsi: ["و (Wawu)", "ب (Ba)", "م (Mim)", "ف (Fa)"], jawabanBenar: "و (Wawu)" },
        { pertanyaan: "Bagian lidah manakah yang menempel ke langit-langit atas untuk menghasilkan huruf Qaf?", opsi: ["Aqshal Lisan (Pangkal lidah)", "Wasatul Lisan (Tengah lidah)", "Tarful Lisan (Ujung lidah)", "Hafatul Lisan (Tepi lidah)"], jawabanBenar: "Aqshal Lisan (Pangkal lidah)" },
        { pertanyaan: "Bagian lidah manakah yang menempel ke langit-langit atas untuk menghasilkan huruf Jim?", opsi: ["Wasatul Lisan (Tengah lidah)", "Aqshal Lisan", "Tarful Lisan", "Hafatul Lisan"], jawabanBenar: "Wasatul Lisan (Tengah lidah)" },
        { pertanyaan: "Bagian lidah manakah yang menempel ke gigi atau gusi atas untuk menghasilkan huruf Lam?", opsi: ["Hafatul Lisan (Tepi lidah bagian depan)", "Aqshal Lisan", "Wasatul Lisan", "Pangkal lidah"], jawabanBenar: "Hafatul Lisan (Tepi lidah bagian depan)" },
        { pertanyaan: "Huruf manakah yang makhrajnya menggunakan ujung lidah (Tarful Lisan)?", opsi: ["ن (Nun)", "ق (Qaf)", "ك (Kaf)", "ج (Jim)"], jawabanBenar: "ن (Nun)" },
        { pertanyaan: "Apakah fungsi utama mengetahui makhraj huruf dalam membaca Al-Quran?", opsi: ["Menjaga keabsahan makna dan kefasihan bacaan sesuai kaidah", "Agar suara menjadi sangat keras", "Agar cepat selesai membaca", "Agar suara melengking"], jawabanBenar: "Menjaga keabsahan makna dan kefasihan bacaan sesuai kaidah" },
        { pertanyaan: "Siapakah ulama besar pencetus rincian 17 makhraj khusus yang banyak dipegang oleh para ahli tajwid?", opsi: ["Imam Ibnu Jazari", "Imam Syafii", "Imam Nawawi", "Imam Malik"], jawabanBenar: "Imam Ibnu Jazari" },
        { pertanyaan: "Ulama qiraat yang pertama kali merumuskan mazhab makhraj menjadi 17 makhraj adalah...", opsi: ["Al-Khalil bin Ahmad Al-Farahidi", "Ibnu Taimiyah", "Imam Jazari", "Ibnu Katsir"], jawabanBenar: "Al-Khalil bin Ahmad Al-Farahidi" },
        { pertanyaan: "Bagaimanakah cara mengetes makhraj suatu huruf yang sukun atau mati?", opsi: ["Dengan cara menyematkan huruf berharakat (seperti hamzah kasrah) di depannya (misal: أَبْ)", "Dengan membacanya sendirian tanpa bantuan", "Dengan berteriak kencang", "Dengan membaca tasydid"], jawabanBenar: "Dengan cara menyematkan huruf berharakat (seperti hamzah kasrah) di depannya (misal: أَبْ)" },
        { pertanyaan: "Apa sebutan tes pengujian makhraj dengan memberi harakat hidup pada huruf mati?", opsi: ["Ikhtibar / Tajribah Makhraj", "Tasrif huruf", "I'rab huruf", "Idgham huruf"], jawabanBenar: "Ikhtibar / Tajribah Makhraj" },
        { pertanyaan: "Manakah kelompok huruf yang keluar dari tenggorokan (Halqiyah)?", opsi: ["ء، هـ، ع، ح، غ، خ", "ق، ك، ج", "ت، د، ط", "ف، و، ب، م"], jawabanBenar: "ء، هـ، ع، ح، غ، خ" },
        { pertanyaan: "Manakah kelompok huruf yang keluar dari bibir (Syafawiyah)?", opsi: ["ف، و، ب، م", "ء، هـ، ع، ح", "ق، ك، ج", "ت، د، ط"], jawabanBenar: "ف، و، ب، م" },
        { pertanyaan: "Manakah kelompok huruf yang keluar dari rongga (Jaufiyah)?", opsi: ["ا، و، ي (Huruf Mad)", "ت، ث، ج", "ص، ض، ط", "ر، ل، ن"], jawabanBenar: "ا، و، ي (Huruf Mad)" }
    ],
    menengah: [
       { pertanyaan: "Huruf Ain (ع) dan Ha (ح) keluar dari bagian tenggorokan sebelah...", opsi: ["Tengah (Wasatuh Halq)", "Bawah (Aqshal Halq)", "Atas (Adnal Halq)", "Ujung lidah"], jawabanBenar: "Tengah (Wasatuh Halq)" },
        { pertanyaan: "Huruf Kha (خ) dan Ghain (غ) keluar dari bagian tenggorokan sebelah...", opsi: ["Atas (Adnal Halq)", "Bawah (Aqshal Halq)", "Tengah (Wasatuh Halq)", "Pangkal lidah"], jawabanBenar: "Atas (Adnal Halq)" },
        { pertanyaan: "Huruf Qaf (ق) keluar dari makhraj...", opsi: ["Pangkal lidah yang menempel pada langit-langit mulut bagian atas", "Ujung lidah yang menempel pada gusi gigi seri atas", "Tengah lidah yang menempel ke langit-langit", "Dua bibir"], jawabanBenar: "Pangkal lidah yang menempel pada langit-langit mulut bagian atas" },
        { pertanyaan: "Huruf Kaf (ك) keluar dari makhraj pangkal lidah, posisinya terhadap huruf Qaf adalah...", opsi: ["Sedikit di bawah/depan makhraj Qaf", "Sama persis dengan Qaf", "Di ujung lidah", "Di tenggorokan atas"], jawabanBenar: "Sedikit di bawah/depan makhraj Qaf" },
        { pertanyaan: "Huruf Jim (ج), Syin (ش), dan Ya' (ي) keluar dari makhraj...", opsi: ["Tengah lidah yang menempel pada langit-langit atas", "Pangkal lidah", "Ujung lidah", "Tepi lidah"], jawabanBenar: "Tengah lidah yang menempel pada langit-langit atas" },
        { pertanyaan: "Huruf Dhad (ض) keluar dari makhraj...", opsi: ["Salah satu tepi lidah (atau kedua-duanya) menempel pada geraham atas", "Ujung lidah menempel gigi seri atas", "Pangkal lidah", "Dua bibir"], jawabanBenar: "Salah satu tepi lidah (atau kedua-duanya) menempel pada geraham atas" },
        { pertanyaan: "Huruf Lam (ل) keluar dari makhraj...", opsi: ["Dari tepi lidah bagian depan hingga ujungnya yang menempel pada gusi atas", "Ujung lidah menempel gigi seri", "Pangkal lidah", "Tengah lidah"], jawabanBenar: "Dari tepi lidah bagian depan hingga ujungnya yang menempel pada gusi atas" },
        { pertanyaan: "Huruf Nun (ن) keluar dari makhraj...", opsi: ["Ujung lidah menempel pada gusi gigi seri atas (sedikit di bawah makhraj Lam)", "Ujung lidah menempel gigi seri bawah", "Pangkal lidah", "Tengah lidah"], jawabanBenar: "Ujung lidah menempel pada gusi gigi seri atas (sedikit di bawah makhraj Lam)" },
        { pertanyaan: "Huruf Ra' (ر) keluar dari makhraj...", opsi: ["Ujung lidah (sedikit masuk ke punggung lidah) menempel pada gusi atas dekat makhraj Nun", "Ujung lidah menempel gigi seri", "Tepi lidah", "Bibir bawah"], jawabanBenar: "Ujung lidah (sedikit masuk ke punggung lidah) menempel pada gusi atas dekat makhraj Nun" },
        { pertanyaan: "Huruf apakah yang keluar dari bertemunya ujung lidah dengan pangkal gigi seri atas (huruf Nithaqiyyah: Ta, Dal, Tha)?", opsi: ["ت، د، ط", "س، ز، ص", "ث، ذ، ظ", "ف، و، ب، م"], jawabanBenar: "ت، د، ط" },
        { pertanyaan: "Bagian manakah dari lidah yang menghasilkan huruf Dhad?", opsi: ["Hafatul Lisan (Tepi lidah / sisi lidah sebelah kiri atau kanan)", "Tarful Lisan (Ujung lidah)", "Wasatul Lisan (Tengah lidah)", "Aqshal Lisan (Pangkal lidah)"], jawabanBenar: "Hafatul Lisan (Tepi lidah / sisi lidah sebelah kiri atau kanan)" },
        { pertanyaan: "Apakah nama kelompok huruf Tha (ط), Dal (د), dan Ta (ت) berdasarkan penamaan makhrajnya?", opsi: ["Huruf Nithaqiyyah", "Huruf Asliyah", "Huruf Lisawiyah", "Huruf Syafawiyah"], jawabanBenar: "Huruf Nithaqiyyah" },
        { pertanyaan: "Apakah nama kelompok huruf Shad (ص), Zai (ز), dan Sin (س) berdasarkan penamaan makhrajnya?", opsi: ["Huruf Asliyah / Safiriyah", "Huruf Nithaqiyyah", "Huruf Lisawiyah", "Huruf Halqiyah"], jawabanBenar: "Huruf Asliyah / Safiriyah" },
        { pertanyaan: "Apakah nama kelompok huruf Tsa (ث), Dzal (ذ), dan Zha (ظ) berdasarkan penamaan makhrajnya?", opsi: ["Huruf Lisawiyah", "Huruf Nithaqiyyah", "Huruf Asliyah", "Huruf Syafawiyah"], jawabanBenar: "Huruf Lisawiyah" },
        { pertanyaan: "Berapa jumlah makhraj khusus yang ada pada lidah (Al-Lisan) secara rinci?", opsi: ["10 makhraj khusus", "5 makhraj khusus", "3 makhraj khusus", "7 makhraj khusus"], jawabanBenar: "10 makhraj khusus" },
        { pertanyaan: "Berapa jumlah huruf yang keluar dari makhraj tenggorokan (Al-Halq)?", opsi: ["6 huruf", "5 huruf", "4 huruf", "7 huruf"], jawabanBenar: "6 huruf" },
        { pertanyaan: "Di antara huruf-huruf tengah lidah (Jim, Syin, Ya), huruf manakah yang memiliki sifat Tafasysyi (menyebarnya angin di dalam mulut)?", opsi: ["Syin (ش)", "Jim (ج)", "Ya (ي)", "Semua huruf tengah lidah"], jawabanBenar: "Syin (ش)" },
        { pertanyaan: "Di antara huruf-huruf tengah lidah, huruf manakah yang memiliki sifat Qalqalah?", opsi: ["Jim (ج)", "Syin (ش)", "Ya (ي)", "Tidak ada"], jawabanBenar: "Jim (ج)" },
        { pertanyaan: "Bagaimanakah bentuk aliran suara dan angin pada huruf Ya' (ي) mati yang didahului kasrah?", opsi: ["Mengalir lembut sebagai huruf mad / rakhawah", "Tertahan kuat (syiddah)", "Memantul keras", "Bergetar hebat"], jawabanBenar: "Mengalir lembut sebagai huruf mad / rakhawah" },
        { pertanyaan: "Manakah huruf lidah yang terkenal memiliki sifat 'Istithalah' (memanjangnya suara dari pangkal tepi lidah hingga ujung tepi lidah)?", opsi: ["Dhad (ض)", "Lam (ل)", "Ra (ر)", "Nun (ن)"], jawabanBenar: "Dhad (ض)" },
        { pertanyaan: "Bagian gigi manakah yang menjadi sandaran makhraj huruf Tha, Dal, Ta?", opsi: ["Pangkal gigi seri atas (ushul ats-tsanayal ulya)", "Ujung gigi seri bawah", "Geraham belakang", "Gigi taring"], jawabanBenar: "Pangkal gigi seri atas (ushul ats-tsanayal ulya)" },
        { pertanyaan: "Bagian gigi manakah yang menjadi sandaran makhraj huruf Shad, Zai, Sin?", opsi: ["Punggung ujung gigi seri bawah (bukan gusi, tapi dekat ujung gigi seri bawah/atas)", "Pangkal langit-langit", "Geraham atas", "Tenggorokan atas"], jawabanBenar: "Punggung ujung gigi seri bawah (bukan gusi, tapi dekat ujung gigi seri bawah/atas)" },
        { pertanyaan: "Bagian gigi manakah yang menjadi sandaran makhraj huruf Tsa, Dzal, Zha?", opsi: ["Ujung gigi seri atas (athraf ats-tsanayal ulya)", "Gigi seri bawah", "Geraham", "Langit-langit"], jawabanBenar: "Ujung gigi seri atas (athraf ats-tsanayal ulya)" },
        { pertanyaan: "Manakah makhraj huruf Ra' yang benar menurut ulama tajwid?", opsi: ["Ujung lidah agak masuk ke punggungnya menempel pada gusi atas", "Tepat di ujung lidah luar", "Di tengah lidah", "Di dua bibir"], jawabanBenar: "Ujung lidah agak masuk ke punggungnya menempel pada gusi atas" },
        { pertanyaan: "Manakah makhraj huruf Nun yang benar?", opsi: ["Ujung lidah menempel pada gusi atas di bawah makhraj Lam", "Di tepi lidah", "Di tenggorokan", "Di bibir"], jawabanBenar: "Ujung lidah menempel pada gusi atas di bawah makhraj Lam" },
        { pertanyaan: "Manakah makhraj huruf Lam yang benar?", opsi: ["Dari tepi lidah bagian depan hingga ujungnya menempel pada langit-langit gusi atas", "Pangkal lidah menempel kerongkongan", "Dua bibir merapat", "Rongga hidung"], jawabanBenar: "Dari tepi lidah bagian depan hingga ujungnya menempel pada langit-langit gusi atas" },
        { pertanyaan: "Huruf Kaf keluar dari pangkal lidah, namun apa yang membedakannya dengan Qaf?", opsi: ["Kaf sedikit lebih maju ke depan dan lebih turun dibanding Qaf", "Kaf keluar dari bibir", "Kaf keluar dari hidung", "Kaf memiliki sifat qalqalah"], jawabanBenar: "Kaf sedikit lebih maju ke depan dan lebih turun dibanding Qaf" },
        { pertanyaan: "Apakah huruf Qaf memiliki sifat Qalqalah?", opsi: ["Ya, Qaf adalah salah satu huruf Qalqalah (ق، ط، ب، ج، د)", "Tidak, Qaf tidak punya qalqalah", "Qaf hanya qalqalah kubra", "Qaf qalqalah sughra saja"], jawabanBenar: "Ya, Qaf adalah salah satu huruf Qalqalah (ق، ط، ب، ج، د)" },
        { pertanyaan: "Apakah huruf Kaf memiliki sifat Qalqalah?", opsi: ["Tidak, Kaf bukan huruf qalqalah (Kaf bersifat hams/syiddah)", "Ya, Kaf huruf qalqalah", "Kaf qalqalah saat sukun saja", "Kaf dipantulkan jika waqaf"], jawabanBenar: "Tidak, Kaf bukan huruf qalqalah (Kaf bersifat hams/syiddah)" },
        { pertanyaan: "Huruf Mim keluar dari dua bibir. Apa yang membedakan makhraj fisik Mim dengan Ba?", opsi: ["Mim melibatkan rongga hidung (khaisyum) untuk menyempurnakan dengung zatnya, sedangkan Ba murni di bibir", "Ba keluar dari lidah", "Mim keluar dari tenggorokan", "Tidak ada bedanya"], jawabanBenar: "Mim melibatkan rongga hidung (khaisyum) untuk menyempurnakan dengung zatnya, sedangkan Ba murni di bibir" },
        { pertanyaan: "Bagaimanakah posisi bibir bawah saat mengucapkan huruf Fa (ف)?", opsi: ["Bagian perut/dalam bibir bawah menyentuh ujung gigi seri atas", "Bibir bawah di luar gigi", "Bibir terbuka lebar", "Bibir mencucu ke depan"], jawabanBenar: "Bagian perut/dalam bibir bawah menyentuh ujung gigi seri atas" },
        { pertanyaan: "Bagaimanakah posisi dua bibir saat mengucapkan huruf Wawu (و) non-mad?", opsi: ["Mencucu ke depan dengan ada celah kecil di tengahnya", "Tertutup rapat", "Merata datar", "Ditarik ke samping"], jawabanBenar: "Mencucu ke depan dengan ada celah kecil di tengahnya" },
        { pertanyaan: "Bagaimanakah posisi dua bibir saat mengucapkan huruf Ba (ب) sukun?", opsi: ["Tertutup rapat dan kuat pada dua belahan bibir", "Terbuka lebar", "Menyentuh gigi", "Menempel di langit-langit"], jawabanBenar: "Tertutup rapat dan kuat pada dua belahan bibir" },
        { pertanyaan: "Berapa jumlah huruf hijaiyah yang keluar dari makhraj Al-Lisan (Lidah) secara spesifik?", opsi: ["18 huruf", "15 huruf", "10 huruf", "22 huruf"], jawabanBenar: "18 huruf" },
        { pertanyaan: "Huruf manakah yang keluar dari tepi lidah sebelah kiri atau kanan hingga geraham atas?", opsi: ["Dhad (ض)", "Lam (ل)", "Ra (ر)", "Nun (ن)"], jawabanBenar: "Dhad (ض)" },
        { pertanyaan: "Huruf manakah yang keluar dari dua tepi lidah secara bersamaan atau salah satunya menempel pada gusi atas dari gigi taring hingga gigi seri?", opsi: ["Lam (ل)", "Dhad (ض)", "Ra (ر)", "Nun (ن)"], jawabanBenar: "Lam (ل)" },
        { pertanyaan: "Apa nama sifat angin mendesis yang keluar pada huruf Shad, Zai, dan Sin?", opsi: ["Safir (Desis)", "Hams", "Qalqalah", "Infitah"], jawabanBenar: "Safir (Desis)" },
        { pertanyaan: "Huruf manakah di antara huruf Safir yang dibaca dengan suara tebal (isti'la/ithbaq)?", opsi: ["Shad (ص)", "Zai (ز)", "Sin (س)", "Semuanya tebal"], jawabanBenar: "Shad (ص)" },
        { pertanyaan: "Manakah huruf Safir yang dibaca tipis dengan suara mirip lebah?", opsi: ["Zai (ز)", "Shad (ص)", "Sin (س)", "Tha (ط)"], jawabanBenar: "Zai (ز)" },
        { pertanyaan: "Manakah huruf Safir yang dibaca tipis dengan suara mirip desisan ular?", opsi: ["Sin (س)", "Zai (ز)", "Shad (ص)", "Tsa (ث)"], jawabanBenar: "Sin (س)" },
        { pertanyaan: "Manakah makhraj khusus lidah yang paling dalam?", opsi: ["Pangkal lidah (Aqshal Lisan) tempat Qaf", "Tengah lidah", "Ujung lidah", "Tepi lidah"], jawabanBenar: "Pangkal lidah (Aqshal Lisan) tempat Qaf" },
        { pertanyaan: "Manakah makhraj khusus lidah yang paling luar/dekat dengan bibir?", opsi: ["Ujung lidah (Tarful Lisan)", "Pangkal lidah", "Tengah lidah", "Tepi lidah"], jawabanBenar: "Ujung lidah (Tarful Lisan)" },
        { pertanyaan: "Huruf apa saja yang keluar dari makhraj Ujung Lidah dan gusi atas (Nun, Lam, Ra)? Ketiganya sering disebut kelompok huruf...", opsi: ["Huruf Dhlalaq / Dzlaqiyyah", "Huruf Halqiyah", "Huruf Syafawiyah", "Huruf Jaufiyah"], jawabanBenar: "Huruf Dhlalaq / Dzlaqiyyah" },
        { pertanyaan: "Apa nama kelompok huruf Tha, Dal, Ta yang keluar dari ujung lidah dan pangkal gigi seri atas?", opsi: ["Nithaqiyyah", "Asliyah", "Lisawiyah", "Syafawiyah"], jawabanBenar: "Nithaqiyyah" },
        { pertanyaan: "Apa nama kelompok huruf Shad, Zai, Sin yang keluar dari ujung lidah dan ujung gigi seri bawah/atas?", opsi: ["Asliyah", "Nithaqiyyah", "Lisawiyah", "Halqiyah"], jawabanBenar: "Asliyah" }
    ],
    lanjut: [
        { pertanyaan: "Huruf Asliyah (huruf desis ujung lidah: Shad, Zai, Sin) keluar dari makhraj...", opsi: ["Ujung lidah yang keluar dan hampir bersentuhan dengan ujung gigi seri atas dan bawah", "Ujung lidah menempel langit-langit keras", "Dua bibir", "Pangkal tenggorokan"], jawabanBenar: "Ujung lidah yang keluar dan hampir bersentuhan dengan ujung gigi seri atas dan bawah" },
        { pertanyaan: "Huruf Lisan yang keluar dari bertemunya ujung lidah dengan ujung gigi seri atas (huruf Lisaniyah: Tsa, Dzal, Zha) diucapkan dengan cara...", opsi: ["Menjulurkan sedikit ujung lidah keluar (tipis/lembut untuk Tsa & Dzal, tebal untuk Zha)", "Menempelkan lidah ke langit-langit", "Merapatkan dua bibir", "Memantulkan suara"], jawabanBenar: "Menjulurkan sedikit ujung lidah keluar (tipis/lembut untuk Tsa & Dzal, tebal untuk Zha)" },
        { pertanyaan: "Huruf Fa (ف) keluar dari makhraj khusus pada daerah bibir, yaitu...", opsi: ["Pertemuan antara ujung gigi seri atas dengan bagian dalam bibir bawah", "Dua bibir tertutup rapat", "Bibir bawah bagian luar", "Antara dua bibir yang terbuka"], jawabanBenar: "Pertemuan antara ujung gigi seri atas dengan bagian dalam bibir bawah" },
        { pertanyaan: "Huruf Wawu (و), Ba (ب), dan Mim (م) keluar dari makhraj Asy-Syafatan. Bagaimanakah rincian makhraj ketiganya?", opsi: ["Wawu dengan memonyongkan bibir, Ba dan Mim dengan merapatkan bibir (Mim lewat rongga hidung juga)", "Ketiganya dari ujung lidah", "Ketiganya dari tenggorokan", "Wawu dari gigi, Ba dan Mim dari lidah"], jawabanBenar: "Wawu dengan memonyongkan bibir, Ba dan Mim dengan merapatkan bibir (Mim lewat rongga hidung juga)" },
        { pertanyaan: "Mengapa huruf Dhad (ض) dianggap sebagai huruf yang paling sulit diucapkan dalam bahasa Arab (dijuluki Lughatud Dhad)?", opsi: ["Karena makhrajnya melibatkan seluruh sisi lidah menempel pada geraham atas secara luas", "Karena keluar dari rongga hidung", "Karena diucapkan dengan suara melengking", "Karena hurufnya mirip dengan huruf Tha"], jawabanBenar: "Karena makhrajnya melibatkan seluruh sisi lidah menempel pada geraham atas secara luas" },
        { pertanyaan: "Apa perbedaan persis makhraj huruf Tha (ط), Dal (د), dan Ta (ت)?", opsi: ["Ketiganya dari makhraj yang sama (ujung lidah dan gusi atas), namun beda pada sifat ketebalan dan pantulannya", "Tha dari tenggorokan, Dal dan Ta dari bibir", "Ta dari ujung lidah, Dal dari pangkal lidah", "Tidak ada persamaan makhraj sama sekali"], jawabanBenar: "Ketiganya dari makhraj yang sama (ujung lidah dan gusi atas), namun beda pada sifat ketebalan dan pantulannya" },
        { pertanyaan: "Apa perbedaan makhraj huruf Shad (ص), Zai (ز), dan Sin (س)?", opsi: ["Ketiganya dari makhraj yang sama (ujung lidah dekat gigi seri), dibedakan oleh sifat Ishti'la/Ithbaq pada Shad", "Shad dari tenggorokan, Sin dari bibir", "Zai dari langit-langit mulut", "Ketiganya keluar dari rongga hidung"], jawabanBenar: "Ketiganya dari makhraj yang sama (ujung lidah dekat gigi seri), dibedakan oleh sifat Ishti'la/Ithbaq pada Shad" },
        { pertanyaan: "Apa beda makhraj huruf Zha (ظ), Dzal (ذ), dan Tsa (ث)?", opsi: ["Ketiganya dari makhraj yang sama (ujung lidah bertemu ujung gigi seri atas), Zha bersifat tebal (isti'la/ithbaq), sedang Tsa & Dzal tipis", "Zha dari tenggorokan", "Tsa dari bibir", "Dzal dari tengah lidah"], jawabanBenar: "Ketiganya dari makhraj yang sama (ujung lidah bertemu ujung gigi seri atas), Zha bersifat tebal (isti'la/ithbaq), sedang Tsa & Dzal tipis" },
        { pertanyaan: "Manakah kelompok huruf yang keluar dari makhraj Wasatullisan (tengah lidah)?", opsi: ["Jim (ج), Syin (ش), Ya (ي)", "Qaf (ق), Kaf (ك)", "Ta (ت), Dal (د), Tha (ط)", "Fa (ف), Wawu (و), Mim (م)"], jawabanBenar: "Jim (ج), Syin (ش), Ya (ي)" },
        { pertanyaan: "Manakah kelompok huruf yang keluar dari makhraj Adnallisan (ujung lidah / terluar)?", opsi: ["Lam (ل), Nun (ن), Ra (ر)", "Hamzah (ء), Ha (هـ)", "Ain (ع), Ha (ح)", "Kha (خ), Ghain (غ)"], jawabanBenar: "Lam (ل), Nun (ن), Ra (ر)" },
        { pertanyaan: "Manakah ulama tajwid yang menyatakan bahwa makhraj huruf Al-Jauf (rongga) adalah makhraj muqaddar (perkiraan/tidak berpuncak pada titik fisik tertentu)?", opsi: ["Mayoritas ulama peniliti qiraat dan tajwid (seperti Ibnu Jazari)", "Hanya ulama mazhab Hanafi", "Imam Syafii secara pribadi", "Tidak ada yang menyebut muقaddar"], jawabanBenar: "Mayoritas ulama peniliti qiraat dan tajwid (seperti Ibnu Jazari)" },
        { pertanyaan: "Apa makna istilah 'Makhraj Muqaddar' (مخرج مقدر) dalam ilmu makharijul huruf?", opsi: ["Makhraj yang tempat keluarnya tidak memiliki batasan fisik/pemberhentian tetap (seperti rongga mulut/tenggorokan)", "Makhraj yang tersembunyi di dalam hidung", "Makhraj yang hanya dibaca saat shalat", "Makhraj yang berpuncak di ujung gigi"], jawabanBenar: "Makhraj yang tempat keluarnya tidak memiliki batasan fisik/pemberhentian tetap (seperti rongga mulut/tenggorokan)" },
        { pertanyaan: "Apa makna istilah 'Makhraj Muhaqqaq' (مخرج محقق) dalam ilmu makharijul huruf?", opsi: ["Makhraj yang memiliki tempat atau titik fisik pemberhentian yang pasti dan nyata (seperti lidah menyentuh gigi/langit-langit)", "Makhraj yang keluar dari rongga hidung", "Makhraj huruf mad", "Makhraj suara dengung"], jawabanBenar: "Makhraj yang memiliki tempat atau titik fisik pemberhentian yang pasti dan nyata (seperti lidah menyentuh gigi/langit-langit)" },
        { pertanyaan: "Manakah huruf-huruf yang termasuk ber-makhraj Muhaqqaq?", opsi: ["Hampir seluruh huruf lidah, tenggorokan, dan bibir (seperti Qaf, Ba, Lam, dll)", "Hanya huruf Alif, Wawu, Ya mad", "Hanya suara ghunnah", "Huruf jauf"], jawabanBenar: "Hampir seluruh huruf lidah, tenggorokan, dan bibir (seperti Qaf, Ba, Lam, dll)" },
        { pertanyaan: "Manakah huruf-huruf yang termasuk ber-makhraj Muqaddar?", opsi: ["Huruf-huruf Mad (Alif, Wawu sukun, Ya sukun dari jauf) dan suara ghunnah dari khaisyum", "Huruf Qaf dan Kaf", "Huruf Dhad dan Zha", "Huruf Tha dan Dal"], jawabanBenar: "Huruf-huruf Mad (Alif, Wawu sukun, Ya sukun dari jauf) dan suara ghunnah dari khaisyum" },
        { pertanyaan: "Bagaimanakah perselisihan ulama mengenai jumlah makhraj secara garis besar?", opsi: ["Sebagian berpendapat 17 makhraj (Al-Khalil & Ibnu Jazari), sebagian 16 (membuang jauf), sebagian 14 (meringkas makhraj lidah/bibir)", "Semua ulama sepakat mutlak 20 makhraj", "Hanya ada 5 makhraj tanpa ada rincian lagi", "Semua ulama sepakat 10 makhraj"], jawabanBenar: "Sebagian berpendapat 17 makhraj (Al-Khalil & Ibnu Jazari), sebagian 16 (membuang jauf), sebagian 14 (meringkas makhraj lidah/bibir)" },
        { pertanyaan: "Berapa jumlah makhraj menurut mazhab Imam Sibawaih dan Syekh Al-Syathibi (yang menggabungkan makhraj Al-Jauf ke dalam makhraj tenggorokan/mulut)?", opsi: ["16 makhraj khusus", "17 makhraj khusus", "14 makhraj khusus", "18 makhraj khusus"], jawabanBenar: "16 makhraj khusus" },
        { pertanyaan: "Berapa jumlah makhraj menurut mazhab Imam Al-Farra' dan Qutrub?", opsi: ["14 makhraj khusus", "17 makhraj khusus", "16 makhraj khusus", "20 makhraj khusus"], jawabanBenar: "14 makhraj khusus" },
        { pertanyaan: "Mengapa huruf Dhad (ض) disebut sebagai huruf yang paling unik dan hanya dimiliki oleh bahasa Arab (hingga dijuluki Lughatud Dhad)?", opsi: ["Karena makhrajnya yang memanjang di sisi lidah menempel ke geraham jarang ditemukan dalam bahasa lain", "Karena huruf Dhad keluar dari hidung", "Karena Dhad tidak memiliki suara sama sekali", "Karena Dhad selalu dibaca pantul"], jawabanBenar: "Karena makhrajnya yang memanjang di sisi lidah menempel ke geraham jarang ditemukan dalam bahasa lain" },
        { pertanyaan: "Apakah perbedaan mendasar antara makhraj huruf Dhad (ض) dan Zha (ظ)?", opsi: ["Dhad keluar dari sisi/tepi lidah menempel geraham atas, sedangkan Zha keluar dari ujung lidah bertemu ujung gigi seri atas", "Dhad dari bibir, Zha dari tenggorokan", "Disedot dari rongga hidung", "Tidak ada bedanya kecuali nama"], jawabanBenar: "Dhad keluar dari sisi/tepi lidah menempel geraham atas, sedangkan Zha keluar dari ujung lidah bertemu ujung gigi seri atas" },
        { pertanyaan: "Apa kesalahan umum (lahn khafi) yang sering terjadi saat mengucapkan huruf Dhad (ض)?", opsi: ["Diucapkan mirip huruf Zha (ظ) atau Dal (د) tebal karena kurang menempelkan sisi lidah ke geraham", "Diucapkan seperti huruf Mim", "Diucapkan seperti huruf Kha", "Diucapkan dengan mendengung di hidung"], jawabanBenar: "Diucapkan mirip huruf Zha (ظ) atau Dal (د) tebal karena kurang menempelkan sisi lidah ke geraham" },
        { pertanyaan: "Apa kesalahan umum saat mengucapkan huruf Ha (هـ) di tenggorokan bawah?", opsi: ["Kurang menekan tenaga udara sehingga suaranya hilang atau berubah menjadi huruf biasa", "Diucapkan dengan sangat melengking seperti huruf Ain", "Dipantulkan seperti huruf Qalqalah", "Dialirkan lewat hidung"], jawabanBenar: "Kurang menekan tenaga udara sehingga suaranya hilang atau berubah menjadi huruf biasa" },
        { pertanyaan: "Bagaimanakah cara melatih makhraj huruf Kha (خ) dan Ghain (غ) di tenggorokan atas (Adnal Halq) agar tidak terlalu ke dalam?", opsi: ["Merasakan getaran gesekan suara di dekat pangkal langit-langit mulut / dekat laring atas", "Menempelkan lidah ke gigi", "Merapatkan dua bibir", "Memonyongkan bibir"], jawabanBenar: "Merasakan getaran gesekan suara di dekat pangkal langit-langit mulut / dekat laring atas" },
        { pertanyaan: "Manakah makhraj huruf yang melibatkan area paling luas pada rongga mulut bagian atas?", opsi: ["Huruf Dhad (ض) dan Lam (ل)", "Huruf Hamzah", "Huruf Ba", "Huruf Mim"], jawabanBenar: "Huruf Dhad (ض) dan Lam (ل)" },
        { pertanyaan: "Bagaimanakah karakteristik aliran suara pada huruf-huruf Syiddah (seperti Ta, Dal, Qaf, Kaf, Ba, Jim, Tha) saat sukun?", opsi: ["Suara tertahan secara total pada titik makhrajnya sebelum dilepas", "Suara mengalir bebas", "Suara mendesis panjang", "Suara bergetar tak terkendali"], jawabanBenar: "Suara tertahan secara total pada titik makhrajnya sebelum dilepas" },
        { pertanyaan: "Bagaimanakah karakteristik aliran suara pada huruf-huruf Rakhawah (seperti Tsa, Dzal, Zha, Ha, Kha, Syin, Sin, Shad, Zai, Fa, Fha, Wawu, Ya)?", opsi: ["Suara mengalir terus menerus melewati makhrajnya tanpa tertahan", "Suara tertahan rapat", "Suara memantul kuat", "Suara terhenti di tenggorokan"], jawabanBenar: "Suara mengalir terus menerus melewati makhrajnya tanpa tertahan" },
        { pertanyaan: "Bagaimanakah karakteristik aliran suara pada huruf-huruf Tawassuth / Bainiyyah (ل، ن، ع، م، ر)?", opsi: ["Suara tidak tertahan sempurna dan tidak mengalir bebas (di tengah-tengah antara syiddah dan rakhawah)", "Suara memantul keras", "Suara hilang sama sekali", "Suara mendengung di hidung"], jawabanBenar: "Suara tidak tertahan sempurna dan tidak mengalir bebas (di tengah-tengah antara syiddah dan rakhawah)" },
        { pertanyaan: "Jika seseorang mengucapkan huruf Kaf (ك) terlalu ke dalam mendekati tenggorokan, suara apa yang akan dihasilkan?", opsi: ["Suara huruf Qaf (ق) atau suara yang terlalu berat", "Suara huruf Jim", "Suara huruf Fa", "Suara huruf Mim"], jawabanBenar: "Suara huruf Qaf (ق) atau suara yang terlalu berat" },
        { pertanyaan: "Jika seseorang mengucapkan huruf Qaf (ق) terlalu ke depan mendekati posisi Kaf, suara apa yang akan dihasilkan?", opsi: ["Suara huruf Kaf yang terlalu ringan atau tidak sempurna ketebalannya", "Suara huruf Dhad", "Suara huruf Zha", "Suara huruf Ain"], jawabanBenar: "Suara huruf Kaf yang terlalu ringan atau tidak sempurna ketebalannya" },
        { pertanyaan: "Mengapa huruf-huruf Mad (Alif, Wawu, Ya) disebut tidak memiliki tempat makhraj yang spesifik di gigi atau lidah?", opsi: ["Karena titik tumpunya bergantung pada habisnya aliran udara di rongga tenggorokan dan mulut (Jauf)", "Karena keluar dari hidung", "Karena keluar dari bibir saja", "Karena tidak berbunyi"], jawabanBenar: "Karena titik tumpunya bergantung pada habisnya aliran udara di rongga tenggorokan dan mulut (Jauf)" },
        { pertanyaan: "Apa hubungan antara Makhraj dan Sifat Huruf (Sifatul Huruf) dalam pengucapan Al-Quran?", opsi: ["Makhraj adalah tempat keluarnya huruf, sedangkan Sifat adalah cara/karakteristik menempelnya huruf pada makhraj tersebut", "Keduanya adalah hal yang sama persis", "Sifat huruf tidak memengaruhi makhraj", "Makhraj hanya untuk huruf mati, sifat untuk huruf hidup"], jawabanBenar: "Makhraj adalah tempat keluarnya huruf, sedangkan Sifat adalah cara/karakteristik menempelnya huruf pada makhraj tersebut" },
        { pertanyaan: "Dapatkah dua huruf memiliki makhraj yang persis sama persis?", opsi: ["Ya, ada beberapa huruf yang berbagi makhraj yang sama (seperti Tsa, Dzal, Zha di ujung lidah), dan dibedakan oleh sifatnya", "Tidak boleh ada dua huruf yang makhrajnya sama", "Semua huruf makhrajnya berbeda total", "Hanya ada 1 makhraj untuk 1 huruf"], jawabanBenar: "Ya, ada beberapa huruf yang berbagi makhraj yang sama (seperti Tsa, Dzal, Zha di ujung lidah), dan dibedakan oleh sifatnya" },
        { pertanyaan: "Huruf apakah yang berbagi makhraj dengan huruf Tha (ط) dan Dal (د)?", opsi: ["Huruf Ta (ت)", "Huruf Tsa", "Huruf Shad", "Huruf Sin"], jawabanBenar: "Huruf Ta (ت)" },
        { pertanyaan: "Huruf apakah yang berbagi makhraj dengan huruf Shad (ص) dan Zai (ز)?", opsi: ["Huruf Sin (س)", "Huruf Syin", "Huruf Dhad", "Huruf Tha"], jawabanBenar: "Huruf Sin (س)" },
        { pertanyaan: "Huruf apakah yang berbagi makhraj dengan huruf Tsa (ث) dan Dzal (ذ)?", opsi: ["Huruf Zha (ظ)", "Huruf Tha", "Huruf Shad", "Huruf Ta"], jawabanBenar: "Huruf Zha (ظ)" },
        { pertanyaan: "Huruf apakah yang berbagi makhraj dengan huruf Hamzah (ء)?", opsi: ["Huruf Ha (هـ) - keduanya di tenggorokan bawah", "Huruf Ain", "Huruf Qaf", "Huruf Kaf"], jawabanBenar: "Huruf Ha (هـ) - keduanya di tenggorokan bawah" },
        { pertanyaan: "Huruf apakah yang berbagi makhraj dengan huruf Ain (ع)?", opsi: ["Huruf Ha (ح) - keduanya di tenggorokan tengah", "Huruf Kha", "Huruf Ghain", "Huruf Hamzah"], jawabanBenar: "Huruf Ha (ح) - keduanya di tenggorokan tengah" },
        { pertanyaan: "Huruf apakah yang berbagi makhraj dengan huruf Ghain (غ)?", opsi: ["Huruf Kha (خ) - keduanya di tenggorokan atas", "Huruf Ain", "Huruf Ha", "Huruf Hamzah"], jawabanBenar: "Huruf Kha (خ) - keduanya di tenggorokan atas" },
        { pertanyaan: "Huruf apakah yang berbagi makhraj dengan huruf Jim (ج) dan Syin (ش)?", opsi: ["Huruf Ya' (ي) non-mad - ketiganya di tengah lidah", "Huruf Qaf", "Huruf Kaf", "Huruf Lam"], jawabanBenar: "Huruf Ya' (ي) non-mad - ketiganya di tengah lidah" },
        { pertanyaan: "Huruf apakah yang berbagi makhraj dengan huruf Ba (ب) dan Mim (م)?", opsi: ["Huruf Wawu (و) non-mad - semuanya di daerah bibir (syafawiyah)", "Huruf Fa", "Huruf Nun", "Huruf Ra"], jawabanBenar: "Huruf Wawu (و) non-mad - semuanya di daerah bibir (syafawiyah)" }
    ]
};

const bankSoalJuz30 = {
    // Fokus murni SAMBUNG AYAT: setiap soal menampilkan SATU ayat penuh (tidak
    // pernah dipotong di tengah kata/ayat), lalu meminta ayat SELANJUTNYA secara
    // utuh. Tidak ada lagi soal tentang isi/arti surat atau jumlah ayat.
    dasar: [
        { pertanyaan: "Lanjutkan ayat: 'عَمَّ يَتَسَاءَلُونَ'", opsi: ["عَنِ النَّبَإِ الْعَظِيمِ", "الَّذِي هُمْ فِيهِ مُخْتَلِفُونَ", "كَلَّا سَيَعْلَمُونَ", "أَلَمْ نَجْعَلِ الْأَرْضَ مِهَادًا"], jawabanBenar: "عَنِ النَّبَإِ الْعَظِيمِ" },
        { pertanyaan: "Lanjutkan ayat: 'عَنِ النَّبَإِ الْعَظِيمِ'", opsi: ["الَّذِي هُمْ فِيهِ مُخْتَلِفُونَ", "كَلَّا سَيَعْلَمُونَ", "ثُمَّ كَلَّا سَيَعْلَمُونَ", "أَلَمْ نَجْعَلِ الْأَرْضَ مِهَادًا"], jawabanBenar: "الَّذِي هُمْ فِيهِ مُخْتَلِفُونَ" },
        { pertanyaan: "Lanjutkan ayat: 'الَّذِي هُمْ فِيهِ مُخْتَلِفُونَ'", opsi: ["كَلَّا سَيَعْلَمُونَ", "ثُمَّ كَلَّا سَيَعْلَمُونَ", "أَلَمْ نَجْعَلِ الْأَرْضَ مِهَادًا", "وَالْجِبَالَ أَوْتَادًا"], jawabanBenar: "كَلَّا سَيَعْلَمُونَ" },
        { pertanyaan: "Lanjutkan ayat: 'كَلَّا سَيَعْلَمُونَ'", opsi: ["ثُمَّ كَلَّا سَيَعْلَمُونَ", "أَلَمْ نَجْعَلِ الْأَرْضَ مِهَادًا", "وَالْجِبَالَ أَوْتَادًا", "وَخَلَقْنَاكُمْ أَزْوَاجًا"], jawabanBenar: "ثُمَّ كَلَّا سَيَعْلَمُونَ" },
        { pertanyaan: "Lanjutkan ayat: 'وَالنَّازِعَاتِ غَرْقًا'", opsi: ["وَالنَّاشِطَاتِ نَشْطًا", "وَالسَّابِحَاتِ سَبْحًا", "فَالسَّابِقَاتِ سَبْقًا", "فَالْمُدَبِّرَاتِ أَمْرًا"], jawabanBenar: "وَالنَّاشِطَاتِ نَشْطًا" },
        { pertanyaan: "Lanjutkan ayat: 'وَالنَّاشِطَاتِ نَشْطًا'", opsi: ["وَالسَّابِحَاتِ سَبْحًا", "فَالسَّابِقَاتِ سَبْقًا", "فَالْمُدَبِّرَاتِ أَمْرًا", "يَوْمَ تَرْجُفُ الرَّاجِفَةُ"], jawabanBenar: "وَالسَّابِحَاتِ سَبْحًا" },
        { pertanyaan: "Lanjutkan ayat: 'يَوْمَ تَرْجُفُ الرَّاجِفَةُ'", opsi: ["تَتْبَعُهَا الرَّادِفَةُ", "قُلُوبٌ يَوْمَئِذٍ وَاجِفَةٌ", "أَبْصَارُهَا خَاشِعَةٌ", "يَقُولُونَ أَئِنَّا لَمَرْدُودُونَ فِي الْحَافِرَةِ"], jawabanBenar: "تَتْبَعُهَا الرَّادِفَةُ" },
        { pertanyaan: "Lanjutkan ayat: 'عَبَسَ وَتَوَلَّىٰ'", opsi: ["أَنْ جَاءَهُ الْأَعْمَىٰ", "وَمَا يُدْرِيكَ لَعَلَّهُ يَزَّكَّىٰ", "أَوْ يَذَّكَّرُ فَتَنْفَعَهُ الذِّكْرَىٰ", "أَمَّا مَنِ اسْتَغْنَىٰ"], jawabanBenar: "أَنْ جَاءَهُ الْأَعْمَىٰ" },
        { pertanyaan: "Lanjutkan ayat: 'أَنْ جَاءَهُ الْأَعْمَىٰ'", opsi: ["وَمَا يُدْرِيكَ لَعَلَّهُ يَزَّكَّىٰ", "أَوْ يَذَّكَّرُ فَتَنْفَعَهُ الذِّكْرَىٰ", "أَمَّا مَنِ اسْتَغْنَىٰ", "فَأَنْتَ لَهُ تَصَدَّىٰ"], jawabanBenar: "وَمَا يُدْرِيكَ لَعَلَّهُ يَزَّكَّىٰ" },
        { pertanyaan: "Lanjutkan ayat: 'وَمَا يُدْرِيكَ لَعَلَّهُ يَزَّكَّىٰ'", opsi: ["أَوْ يَذَّكَّرُ فَتَنْفَعَهُ الذِّكْرَىٰ", "أَمَّا مَنِ اسْتَغْنَىٰ", "فَأَنْتَ لَهُ تَصَدَّىٰ", "وَمَا عَلَيْكَ أَلَّا يَزَّكَّىٰ"], jawabanBenar: "أَوْ يَذَّكَّرُ فَتَنْفَعَهُ الذِّكْرَىٰ" },
        { pertanyaan: "Lanjutkan ayat: 'إِذَا الشَّمْسُ كُوِّرَتْ'", opsi: ["وَإِذَا النُّجُومُ انْكَدَرَتْ", "وَإِذَا الْجِبَالُ سُيِّرَتْ", "وَإِذَا الْعِشَارُ عُطِّلَتْ", "وَإِذَا الْوُحُوشُ حُشِرَتْ"], jawabanBenar: "وَإِذَا النُّجُومُ انْكَدَرَتْ" },
        { pertanyaan: "Lanjutkan ayat: 'وَإِذَا النُّجُومُ انْكَدَرَتْ'", opsi: ["وَإِذَا الْجِبَالُ سُيِّرَتْ", "وَإِذَا الْعِشَارُ عُطِّلَتْ", "وَإِذَا الْوُحُوشُ حُشِرَتْ", "وَإِذَا الْبِحَارُ سُجِّرَتْ"], jawabanBenar: "وَإِذَا الْجِبَالُ سُيِّرَتْ" },
        { pertanyaan: "Lanjutkan ayat: 'وَإِذَا الْجِبَالُ سُيِّرَتْ'", opsi: ["وَإِذَا الْعِشَارُ عُطِّلَتْ", "وَإِذَا الْوُحُوشُ حُشِرَتْ", "وَإِذَا الْبِحَارُ سُجِّرَتْ", "وَإِذَا النُّفُوسُ زُوِّجَتْ"], jawabanBenar: "وَإِذَا الْعِشَارُ عُطِّلَتْ" },
        { pertanyaan: "Lanjutkan ayat: 'إِذَا السَّمَاءُ انْفَطَرَتْ'", opsi: ["وَإِذَا الْكَوَاكِبُ انْتَثَرَتْ", "وَإِذَا الْبِحَارُ فُجِّرَتْ", "وَإِذَا الْقُبُورُ بُعْثِرَتْ", "عَلِمَتْ نَفْسٌ مَا قَدَّمَتْ وَأَخَّرَتْ"], jawabanBenar: "وَإِذَا الْكَوَاكِبُ انْتَثَرَتْ" },
        { pertanyaan: "Lanjutkan ayat: 'وَإِذَا الْكَوَاكِبُ انْتَثَرَتْ'", opsi: ["وَإِذَا الْبِحَارُ فُجِّرَتْ", "وَإِذَا الْقُبُورُ بُعْثِرَتْ", "عَلِمَتْ نَفْسٌ مَا قَدَّمَتْ وَأَخَّرَتْ", "يَا أَيُّهَا الْإِنْسَانُ مَا غَرَّكَ بِرَبِّكَ الْكَرِيمِ"], jawabanBenar: "وَإِذَا الْبِحَارُ فُجِّرَتْ" },
        { pertanyaan: "Lanjutkan ayat: 'وَإِذَا الْبِحَارُ فُجِّرَتْ'", opsi: ["وَإِذَا الْقُبُورُ بُعْثِرَتْ", "عَلِمَتْ نَفْسٌ مَا قَدَّمَتْ وَأَخَّرَتْ", "يَا أَيُّهَا الْإِنْسَانُ مَا غَرَّكَ بِرَبِّكَ الْكَرِيمِ", "الَّذِي خَلَقَكَ فَسَوَّاكَ فَعَدَلَكَ"], jawabanBenar: "وَإِذَا الْقُبُورُ بُعْثِرَتْ" },
        { pertanyaan: "Lanjutkan ayat: 'وَيْلٌ لِلْمُطَفِّفِينَ'", opsi: ["الَّذِينَ إِذَا اكْتَالُوا عَلَى النَّاسِ يَسْتَوْفُونَ", "وَإِذَا كَالُوهُمْ أَوْ وَزَنُوهُمْ يُخْسِرُونَ", "أَلَا يَظُنُّ أُولَٰئِكَ أَنَّهُمْ مَبْعُوثُونَ", "لِيَوْمٍ عَظِيمٍ"], jawabanBenar: "الَّذِينَ إِذَا اكْتَالُوا عَلَى النَّاسِ يَسْتَوْفُونَ" },
        { pertanyaan: "Lanjutkan ayat: 'الَّذِينَ إِذَا اكْتَالُوا عَلَى النَّاسِ يَسْتَوْفُونَ'", opsi: ["وَإِذَا كَالُوهُمْ أَوْ وَزَنُوهُمْ يُخْسِرُونَ", "أَلَا يَظُنُّ أُولَٰئِكَ أَنَّهُمْ مَبْعُوثُونَ", "لِيَوْمٍ عَظِيمٍ", "يَوْمَ يَقُومُ النَّاسُ لِرَبِّ الْعَالَمِينَ"], jawabanBenar: "وَإِذَا كَالُوهُمْ أَوْ وَزَنُوهُمْ يُخْسِرُونَ" },
        { pertanyaan: "Lanjutkan ayat: 'وَإِذَا كَالُوهُمْ أَوْ وَزَنُوهُمْ يُخْسِرُونَ'", opsi: ["أَلَا يَظُنُّ أُولَٰئِكَ أَنَّهُمْ مَبْعُوثُونَ", "لِيَوْمٍ عَظِيمٍ", "يَوْمَ يَقُومُ النَّاسُ لِرَبِّ الْعَالَمِينَ", "كَلَّا إِنَّ كِتَابَ الْفُجَّارِ لَفِي سِجِّينٍ"], jawabanBenar: "أَلَا يَظُنُّ أُولَٰئِكَ أَنَّهُمْ مَبْعُوثُونَ" },
        { pertanyaan: "Lanjutkan ayat: 'إِذَا السَّمَاءُ انْشَقَّتْ'", opsi: ["وَأَذِنَتْ لِرَبِّهَا وَحُقَّتْ", "وَإِذَا الْأَرْضُ مُدَّتْ", "وَأَلْقَتْ مَا فِيهَا وَتَخَلَّتْ", "وَأَذِنَتْ لِرَبِّهَا وَحُقَّتْ (ulangan)"], jawabanBenar: "وَأَذِنَتْ لِرَبِّهَا وَحُقَّتْ" },
        { pertanyaan: "Lanjutkan ayat: 'وَأَذِنَتْ لِرَبِّهَا وَحُقَّتْ'", opsi: ["وَإِذَا الْأَرْضُ مُدَّتْ", "وَأَلْقَتْ مَا فِيهَا وَتَخَلَّتْ", "وَأَذِنَتْ لِرَبِّهَا وَحُقَّتْ (ulangan)", "يَا أَيُّهَا الْإِنْسَانُ إِنَّكَ كَادِحٌ إِلَىٰ رَبِّكَ"], jawabanBenar: "وَإِذَا الْأَرْضُ مُدَّتْ" },
        { pertanyaan: "Lanjutkan ayat: 'وَإِذَا الْأَرْضُ مُدَّتْ'", opsi: ["وَأَلْقَتْ مَا فِيهَا وَتَخَلَّتْ", "وَأَذِنَتْ لِرَبِّهَا وَحُقَّتْ", "يَا أَيُّهَا الْإِنْسَانُ إِنَّكَ كَادِحٌ", "فَأَمَّا مَنْ أُوتِيَ كِتَابَهُ بِيَمِينِهِ"], jawabanBenar: "وَأَلْقَتْ مَا فِيهَا وَتَخَلَّتْ" },
        { pertanyaan: "Lanjutkan ayat: 'وَالسَّمَاءِ ذَاتِ الْبُرُوجِ'", opsi: ["وَالْيَوْمِ الْمَوْعُودِ", "وَشَاهِدٍ وَمَشْهُودٍ", "قُتِلَ أَصْحَابُ الْأُخْدُودِ", "النَّارِ ذَاتِ الْوَقُودِ"], jawabanBenar: "وَالْيَوْمِ الْمَوْعُودِ" },
        { pertanyaan: "Lanjutkan ayat: 'وَالْيَوْمِ الْمَوْعُودِ'", opsi: ["وَشَاهِدٍ وَمَشْهُودٍ", "قُتِلَ أَصْحَابُ الْأُخْدُودِ", "النَّارِ ذَاتِ الْوَقُودِ", "إِذْ هُمْ عَلَيْهَا قُعُودٌ"], jawabanBenar: "وَشَاهِدٍ وَمَشْهُودٍ" },
        { pertanyaan: "Lanjutkan ayat: 'وَشَاهِدٍ وَمَشْهُودٍ'", opsi: ["قُتِلَ أَصْحَابُ الْأُخْدُودِ", "النَّارِ ذَاتِ الْوَقُودِ", "إِذْ هُمْ عَلَيْهَا قُعُودٌ", "وَهُمْ عَلَىٰ مَا يَفْعَلُونَ بِالْمُؤْمِنِينَ شُهُودٌ"], jawabanBenar: "قُتِلَ أَصْحَابُ الْأُخْدُودِ" },
        { pertanyaan: "Lanjutkan ayat: 'وَالسَّمَاءِ وَالطَّارِقِ'", opsi: ["وَمَا أَدْرَاكَ مَا الطَّارِقُ", "النَّجْمُ الثَّاقِبُ", "إِنْ كُلُّ نَفْسٍ لَمَّا عَلَيْهَا حَافِظٌ", "فَلْيَنْظُرِ الْإِنْسَانُ مِمَّ خُلِقَ"], jawabanBenar: "وَمَا أَدْرَاكَ مَا الطَّارِقُ" },
        { pertanyaan: "Lanjutkan ayat: 'وَمَا أَدْرَاكَ مَا الطَّارِقُ'", opsi: ["النَّجْمُ الثَّاقِبُ", "إِنْ كُلُّ نَفْسٍ لَمَّا عَلَيْهَا حَافِظٌ", "فَلْيَنْظُرِ الْإِنْسَانُ مِمَّ خُلِقَ", "خُلِقَ مِنْ مَاءٍ دَافِقٍ"], jawabanBenar: "النَّجْمُ الثَّاقِبُ" },
        { pertanyaan: "Lanjutkan ayat: 'سَبِّحِ اسْمَ رَبِّكَ الْأَعْلَى'", opsi: ["الَّذِي خَلَقَ فَسَوَّىٰ", "وَالَّذِي قَدَّرَ فَهَدَىٰ", "وَالَّذِي أَخْرَجَ الْمَرْعَىٰ", "فَجَعَلَهُ غُثَاءً أَحْوَىٰ"], jawabanBenar: "الَّذِي خَلَقَ فَسَوَّىٰ" },
        { pertanyaan: "Lanjutkan ayat: 'الَّذِي خَلَقَ فَسَوَّىٰ'", opsi: ["وَالَّذِي قَدَّرَ فَهَدَىٰ", "وَالَّذِي أَخْرَجَ الْمَرْعَىٰ", "فَجَعَلَهُ غُثَاءً أَحْوَىٰ", "سَنُقْرِئُكَ فَلَا تَنْسَىٰ"], jawabanBenar: "وَالَّذِي قَدَّرَ فَهَدَىٰ" },
        { pertanyaan: "Lanjutkan ayat: 'هَلْ أَتَاكَ حَدِيثُ الْغَاشِيَةِ'", opsi: ["وُجُوهٌ يَوْمَئِذٍ خَاشِعَةٌ", "عَامِلَةٌ نَاصِبَةٌ", "تَصْلَىٰ نَارًا حَامِيَةً", "تُسْقَىٰ مِنْ عَيْنٍ آنِيَةٍ"], jawabanBenar: "وُجُوهٌ يَوْمَئِذٍ خَاشِعَةٌ" },
        { pertanyaan: "Lanjutkan ayat: 'وُجُوهٌ يَوْمَئِذٍ خَاشِعَةٌ'", opsi: ["عَامِلَةٌ نَاصِبَةٌ", "تَصْلَىٰ نَارًا حَامِيَةً", "تُسْقَىٰ مِنْ عَيْنٍ آنِيَةٍ", "لَيْسَ لَهُمْ طَعَامٌ إِلَّا مِنْ ضَرِيعٍ"], jawabanBenar: "عَامِلَةٌ نَاصِبَةٌ" },
        { pertanyaan: "Lanjutkan ayat: 'وَالْفَجْرِ'", opsi: ["وَلَيَالٍ عَشْرٍ", "وَالشَّفْعِ وَالْوَتْرِ", "وَاللَّيْلِ إِذَا يَسْرِ", "هَلْ فِي ذَٰلِكَ قَسَمٌ لِذِي حِجْرٍ"], jawabanBenar: "وَلَيَالٍ عَشْرٍ" },
        { pertanyaan: "Lanjutkan ayat: 'وَلَيَالٍ عَشْرٍ'", opsi: ["وَالشَّفْعِ وَالْوَتْرِ", "وَاللَّيْلِ إِذَا يَسْرِ", "هَلْ فِي ذَٰلِكَ قَسَمٌ لِذِي حِجْرٍ", "أَلَمْ تَرَ كَيْفَ فَعَلَ رَبُّكَ بِعَادٍ"], jawabanBenar: "وَالشَّفْعِ وَالْوَتْرِ" },
        { pertanyaan: "Lanjutkan ayat: 'لَا أُقْسِمُ بِهَٰذَا الْبَلَدِ'", opsi: ["وَأَنْتَ حِلٌّ بِهَٰذَا الْبَلَدِ", "وَوَالِدٍ وَمَا وَلَدَ", "لَقَدْ خَلَقْنَا الْإِنْسَانَ فِي كَبَدٍ", "أَيَحْسَبُ أَنْ لَنْ يَقْدِرَ عَلَيْهِ أَحَدٌ"], jawabanBenar: "وَأَنْتَ حِلٌّ بِهَٰذَا الْبَلَدِ" },
        { pertanyaan: "Lanjutkan ayat: 'وَأَنْتَ حِلٌّ بِهَٰذَا الْبَلَدِ'", opsi: ["وَوَالِدٍ وَمَا وَلَدَ", "لَقَدْ خَلَقْنَا الْإِنْسَانَ فِي كَبَدٍ", "أَيَحْسَبُ أَنْ لَنْ يَقْدِرَ عَلَيْهِ أَحَدٌ", "يَقُولُ أَهْلَكْتُ مَالًا لُبَدًا"], jawabanBenar: "وَوَالِدٍ وَمَا وَلَدَ" },
        { pertanyaan: "Lanjutkan ayat: 'وَالشَّمْسِ وَضُحَاهَا'", opsi: ["وَالْقَمَرِ إِذَا تَلَاهَا", "وَالنَّهَارِ إِذَا جَلَّاهَا", "وَاللَّيْلِ إِذَا يَغْشَاهَا", "وَالسَّمَاءِ وَمَا بَنَاهَا"], jawabanBenar: "وَالْقَمَرِ إِذَا تَلَاهَا" },
        { pertanyaan: "Lanjutkan ayat: 'وَالْقَمَرِ إِذَا تَلَاهَا'", opsi: ["وَالنَّهَارِ إِذَا جَلَّاهَا", "وَاللَّيْلِ إِذَا يَغْشَاهَا", "وَالسَّمَاءِ وَمَا بَنَاهَا", "وَالْأَرْضِ وَمَا طَحَاهَا"], jawabanBenar: "وَالنَّهَارِ إِذَا جَلَّاهَا" },
        { pertanyaan: "Lanjutkan ayat: 'وَاللَّيْلِ إِذَا يَغْشَىٰ'", opsi: ["وَالنَّهَارِ إِذَا تَجَلَّىٰ", "وَمَا خَلَقَ الذَّكَرَ وَالْأُنْثَىٰ", "إِنَّ سَعْيَكُمْ لَشَتَّىٰ", "فَأَمَّا مَنْ أَعْطَىٰ وَاتَّقَىٰ"], jawabanBenar: "وَالنَّهَارِ إِذَا تَجَلَّىٰ" },
        { pertanyaan: "Lanjutkan ayat: 'وَالنَّهَارِ إِذَا تَجَلَّىٰ'", opsi: ["وَمَا خَلَقَ الذَّكَرَ وَالْأُنْثَىٰ", "إِنَّ سَعْيَكُمْ لَشَتَّىٰ", "فَأَمَّا مَنْ أَعْطَىٰ وَاتَّقَىٰ", "وَصَدَّقَ بِالْحُسْنَىٰ"], jawabanBenar: "وَمَا خَلَقَ الذَّكَرَ وَالْأُنْثَىٰ" },
        { pertanyaan: "Lanjutkan ayat: 'وَالضُّحَىٰ'", opsi: ["وَاللَّيْلِ إِذَا سَجَىٰ", "مَا وَدَّعَكَ رَبُّكَ وَمَا قَلَىٰ", "وَلَلْآخِرَةُ خَيْرٌ لَكَ مِنَ الْأُولَىٰ", "وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ"], jawabanBenar: "وَاللَّيْلِ إِذَا سَجَىٰ" },
        { pertanyaan: "Lanjutkan ayat: 'وَاللَّيْلِ إِذَا سَجَىٰ'", opsi: ["مَا وَدَّعَكَ رَبُّكَ وَمَا قَلَىٰ", "وَلَلْآخِرَةُ خَيْرٌ لَكَ مِنَ الْأُولَىٰ", "وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ", "أَلَمْ يَجِدْكَ يَتِيمًا فَآوَىٰ"], jawabanBenar: "مَا وَدَّعَكَ رَبُّكَ وَمَا قَلَىٰ" },
        { pertanyaan: "Lanjutkan ayat: 'أَلَمْ نَشْرَحْ لَكَ صَدْرَكَ'", opsi: ["وَوَضَعْنَا عَنْكَ وِزْرَكَ", "الَّذِي أَنْقَضَ ظَهْرَكَ", "وَرَفَعْنَا لَكَ ذِكْرَكَ", "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا"], jawabanBenar: "وَوَضَعْنَا عَنْكَ وِزْرَكَ" },
        { pertanyaan: "Lanjutkan ayat: 'وَوَضَعْنَا عَنْكَ وِزْرَكَ'", opsi: ["الَّذِي أَنْقَضَ ظَهْرَكَ", "وَرَفَعْنَا لَكَ ذِكْرَكَ", "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا", "إِنَّ مَعَ الْعُسْرِ يُسْرًا"], jawabanBenar: "الَّذِي أَنْقَضَ ظَهْرَكَ" },
        { pertanyaan: "Lanjutkan ayat: 'وَالتِّينِ وَالزَّيْتُونِ'", opsi: ["وَطُورِ سِينِينَ", "وَهَٰذَا الْبَلَدِ الْأَمِينِ", "لَقَدْ خَلَقْنَا الْإِنْسَانَ فِي أَحْسَنِ تَقْوِيمٍ", "ثُمَّ رَدَدْنَاهُ أَسْفَلَ سَافِلِينَ"], jawabanBenar: "وَطُورِ سِينِينَ" },
        { pertanyaan: "Lanjutkan ayat: 'وَطُورِ سِينِينَ'", opsi: ["وَهَٰذَا الْبَلَدِ الْأَمِينِ", "لَقَدْ خَلَقْنَا الْإِنْسَانَ فِي أَحْسَنِ تَقْوِيمٍ", "ثُمَّ رَدَدْنَاهُ أَسْفَلَ سَافِلِينَ", "إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ"], jawabanBenar: "وَهَٰذَا الْبَلَدِ الْأَمِينِ" },
        { pertanyaan: "Lanjutkan ayat: 'اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ'", opsi: ["خَلَقَ الْإِنْسَانَ مِنْ عَلَقٍ", "اقْرَأْ وَرَبُّكَ الْأَكْرَمُ", "الَّذِي عَلَّمَ بِالْقَلَمِ", "عَلَّمَ الْإِنْسَانَ مَا لَمْ يَعْلَمْ"], jawabanBenar: "خَلَقَ الْإِنْسَانَ مِنْ عَلَقٍ" },
        { pertanyaan: "Lanjutkan ayat: 'خَلَقَ الْإِنْسَانَ مِنْ عَلَقٍ'", opsi: ["اقْرَأْ وَرَبُّكَ الْأَكْرَمُ", "الَّذِي عَلَّمَ بِالْقَلَمِ", "عَلَّمَ الْإِنْسَانَ مَا لَمْ يَعْلَمْ", "كَلَّا إِنَّ الْإِنْسَانَ لَيَطْغَىٰ"], jawabanBenar: "اقْرَأْ وَرَبُّكَ الْأَكْرَمُ" },
        { pertanyaan: "Lanjutkan ayat: 'إِنَّا أَنْزَلْنَاهُ فِي لَيْلَةِ الْقَدْرِ'", opsi: ["وَمَا أَدْرَاكَ مَا لَيْلَةُ الْقَدْرِ", "لَيْلَةُ الْقَدْرِ خَيْرٌ مِنْ أَلْفِ شَهْرٍ", "تَنَزَّلُ الْمَلَائِكَةُ وَالرُّوحُ فِيهَا", "سَلَامٌ هِيَ حَتَّىٰ مَطْلَعِ الْفَجْرِ"], jawabanBenar: "وَمَا أَدْرَاكَ مَا لَيْلَةُ الْقَدْرِ" },
        { pertanyaan: "Lanjutkan ayat: 'لَمْ يَكُنِ الَّذِينَ كَفَرُوا مِنْ أَهْلِ الْكِتَابِ وَالْمُشْرِكِينَ مُنْفَكِّينَ حَتَّىٰ تَأْتِيَهُمُ الْبَيِّنَةُ'", opsi: ["رَسُولٌ مِنَ اللَّهِ يَتْلُو صُحُفًا مُطَهَّرَةً", "فِيهَا كُتُبٌ قَيِّمَةٌ", "وَمَا تَفَرَّقَ الَّذِينَ أُوتُوا الْكِتَابَ", "وَمَا أُمِرُوا إِلَّا لِيَعْبُدُوا اللَّهَ مُخْلِصِينَ لَهُ الدِّينَ"], jawabanBenar: "رَسُولٌ مِنَ اللَّهِ يَتْلُو صُحُفًا مُطَهَّرَةً" },
        { pertanyaan: "Lanjutkan ayat: 'إِذَا زُلْزِلَتِ الْأَرْضُ زِلْزَالَهَا'", opsi: ["وَأَخْرَجَتِ الْأَرْضُ أَثْقَالَهَا", "وَقَالَ الْإِنْسَانُ مَا لَهَا", "يَوْمَئِذٍ تُحَدِّثُ أَخْبَارَهَا", "بِأَنَّ رَبَّكَ أَوْحَىٰ لَهَا"], jawabanBenar: "وَأَخْرَجَتِ الْأَرْضُ أَثْقَالَهَا" },
        { pertanyaan: "Lanjutkan ayat: 'وَأَخْرَجَتِ الْأَرْضُ أَثْقَالَهَا'", opsi: ["وَقَالَ الْإِنْسَانُ مَا لَهَا", "يَوْمَئِذٍ تُحَدِّثُ أَخْبَارَهَا", "بِأَنَّ رَبَّكَ أَوْحَىٰ لَهَا", "يَوْمَئِذٍ يَصْدُرُ النَّاسُ أَشْتَاتًا لِيُرَوْا أَعْمَالَهُمْ"], jawabanBenar: "وَقَالَ الْإِنْسَانُ مَا لَهَا" },
        { pertanyaan: "Lanjutkan ayat: 'وَالْعَادِيَاتِ ضَبْحًا'", opsi: ["فَالْمُورِيَاتِ قَدْحًا", "فَالْمُغِيرَاتِ صُبْحًا", "فَأَثَرْنَ بِهِ نَقْعًا", "فَوَسَطْنَ بِهِ جَمْعًا"], jawabanBenar: "فَالْمُورِيَاتِ قَدْحًا" },
        { pertanyaan: "Lanjutkan ayat: 'فَالْمُورِيَاتِ قَدْحًا'", opsi: ["فَالْمُغِيرَاتِ صُبْحًا", "فَأَثَرْنَ بِهِ نَقْعًا", "فَوَسَطْنَ بِهِ جَمْعًا", "إِنَّ الْإِنْسَانَ لِرَبِّهِ لَكَنُودٌ"], jawabanBenar: "فَالْمُغِيرَاتِ صُبْحًا" },
        { pertanyaan: "Lanjutkan ayat: 'الْقَارِعَةُ'", opsi: ["مَا الْقَارِعَةُ", "وَمَا أَدْرَاكَ مَا الْقَارِعَةُ", "يَوْمَ يَكُونُ النَّاسُ كَالْفَرَاشِ الْمَبْثُوثِ", "وَتَكُونُ الْجِبَالُ كَالْعِهْنِ الْمَنْفُوشِ"], jawabanBenar: "مَا الْقَارِعَةُ" },
        { pertanyaan: "Lanjutkan ayat: 'أَلْهَاكُمُ التَّكَاثُرُ'", opsi: ["حَتَّىٰ زُرْتُمُ الْمَقَابِرَ", "كَلَّا سَوْفَ تَعْلَمُونَ", "ثُمَّ كَلَّا سَوْفَ تَعْلَمُونَ", "كَلَّا لَوْ تَعْلَمُونَ عِلْمَ الْيَقِينِ"], jawabanBenar: "حَتَّىٰ زُرْتُمُ الْمَقَابِرَ" },
        { pertanyaan: "Lanjutkan ayat: 'وَالْعَصْرِ'", opsi: ["إِنَّ الْإِنْسَانَ لَفِي خُسْرٍ", "إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ", "وَتَوَاصَوْا بِالْحَقِّ وَتَوَاصَوْا بِالصَّبْرِ", "وَيْلٌ لِكُلِّ هُمَزَةٍ لُمَزَةٍ"], jawabanBenar: "إِنَّ الْإِنْسَانَ لَفِي خُسْرٍ" },
        { pertanyaan: "Lanjutkan ayat: 'وَيْلٌ لِكُلِّ هُمَزَةٍ لُمَزَةٍ'", opsi: ["الَّذِي جَمَعَ مَالًا وَعَدَّدَهُ", "يَحْسَبُ أَنَّ مَالَهُ أَخْلَدَهُ", "كَلَّا ۖ لَيُنْبَذَنَّ فِي الْحُطَمَةِ", "وَمَا أَدْرَاكَ مَا الْحُطَمَةُ"], jawabanBenar: "الَّذِي جَمَعَ مَالًا وَعَدَّدَهُ" },
        { pertanyaan: "Lanjutkan ayat: 'أَلَمْ تَرَ كَيْفَ فَعَلَ رَبُّكَ بِأَصْحَابِ الْفِيلِ'", opsi: ["أَلَمْ يَجْعَلْ كَيْدَهُمْ فِي تَضْلِيلٍ", "وَأَرْسَلَ عَلَيْهِمْ طَيْرًا أَبَابِيلَ", "تَرْمِيهِمْ بِحِجَارَةٍ مِنْ سِجِّيلٍ", "فَجَعَلَهُمْ كَعَصْفٍ مَأْكُولٍ"], jawabanBenar: "أَلَمْ يَجْعَلْ كَيْدَهُمْ فِي تَضْلِيلٍ" },
        { pertanyaan: "Lanjutkan ayat: 'لِإِيلَافِ قُرَيْشٍ'", opsi: ["إِيلَافِهِمْ رِحْلَةَ الشِّتَاءِ وَالصَّيْفِ", "فَلْيَعْبُدُوا رَبَّ هَٰذَا الْبَيْتِ", "الَّذِي أَطْعَمَهُمْ مِنْ جُوعٍ", "وَآمَنَهُمْ مِنْ خَوْفٍ"], jawabanBenar: "إِيلَافِهِمْ رِحْلَةَ الشِّتَاءِ وَالصَّيْفِ" },
        { pertanyaan: "Lanjutkan ayat: 'أَرَأَيْتَ الَّذِي يُكَذِّبُ بِالدِّينِ'", opsi: ["فَذَٰلِكَ الَّذِي يَدُعُّ الْيَتِيمَ", "وَلَا يَحُضُّ عَلَىٰ طَعَامِ الْمِسْكِينِ", "فَوَيْلٌ لِلْمُصَلِّينَ", "الَّذِينَ هُمْ عَنْ صَلَاتِهِمْ سَاهُونَ"], jawabanBenar: "فَذَٰلِكَ الَّذِي يَدُعُّ الْيَتِيمَ" },
        { pertanyaan: "Lanjutkan ayat: 'إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ'", opsi: ["فَصَلِّ لِرَبِّكَ وَانْحَرْ", "إِنَّ شَانِئَكَ هُوَ الْأَبْتَرُ", "قُلْ يَا أَيُّهَا الْكَافِرُونَ", "لَا أَعْبُدُ مَا تَعْبُدُونَ"], jawabanBenar: "فَصَلِّ لِرَبِّكَ وَانْحَرْ" },
        { pertanyaan: "Lanjutkan ayat: 'قُلْ يَا أَيُّهَا الْكَافِرُونَ'", opsi: ["لَا أَعْبُدُ مَا تَعْبُدُونَ", "وَلَا أَنْتُمْ عَابِدُونَ مَا أَعْبُدُ", "وَلَا أَنَا عَابِدٌ مَا عَبَدْتُمْ", "لَكُمْ دِينُكُمْ وَلِيَ دِينِ"], jawabanBenar: "لَا أَعْبُدُ مَا تَعْبُدُونَ" },
        { pertanyaan: "Lanjutkan ayat: 'إِذَا جَاءَ نَصْرُ اللَّهِ وَالْفَتْحُ'", opsi: ["وَرَأَيْتَ النَّاسَ يَدْخُلُونَ فِي دِينِ اللَّهِ أَفْوَاجًا", "فَسَبِّحْ بِحَمْدِ رَبِّكَ وَاسْتَغْفِرْهُ", "إِنَّهُ كَانَ تَوَّابًا", "تَبَّتْ يَدَا أَبِي لَهَبٍ وَتَبَّ"], jawabanBenar: "وَرَأَيْتَ النَّاسَ يَدْخُلُونَ فِي دِينِ اللَّهِ أَفْوَاجًا" },
        { pertanyaan: "Lanjutkan ayat: 'تَبَّتْ يَدَا أَبِي لَهَبٍ وَتَبَّ'", opsi: ["مَا أَغْنَىٰ عَنْهُ مَالُهُ وَمَا كَسَبَ", "سَيَصْلَىٰ نَارًا ذَاتَ لَهَبٍ", "وَامْرَأَتُهُ حَمَّالَةَ الْحَطَبِ", "فِي جِيدِهَا حَبْلٌ مِنْ مَسَدٍ"], jawabanBenar: "مَا أَغْنَىٰ عَنْهُ مَالُهُ وَمَا كَسَبَ" },
        { pertanyaan: "Lanjutkan ayat: 'قُلْ هُوَ اللَّهُ أَحَدٌ'", opsi: ["اللَّهُ الصَّمَدُ", "لَمْ يَلِدْ وَلَمْ يُولَدْ", "وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ", "مِنْ شَرِّ مَا خَلَقَ"], jawabanBenar: "اللَّهُ الصَّمَدُ" }
    ],
    menengah: [
        { pertanyaan: "Lanjutkan ayat: 'وَجَعَلْنَا النَّهَارَ مَعَاشًا'", opsi: ["وَبَنَيْنَا فَوْقَكُمْ سَبْعًا شِدَادًا", "وَجَعَلْنَا سِرَاجًا وَهَّاجًا", "وَأَنْزَلْنَا مِنَ الْمُعْصِرَاتِ مَاءً ثَجَّاجًا", "لِنُخْرِجَ بِهِ حَبًّا وَنَبَاتًا"], jawabanBenar: "وَبَنَيْنَا فَوْقَكُمْ سَبْعًا شِدَادًا" },
        { pertanyaan: "Lanjutkan ayat: 'وَبَنَيْنَا فَوْقَكُمْ سَبْعًا شِدَادًا'", opsi: ["وَجَعَلْنَا سِرَاجًا وَهَّاجًا", "وَأَنْزَلْنَا مِنَ الْمُعْصِرَاتِ مَاءً ثَجَّاجًا", "لِنُخْرِجَ بِهِ حَبًّا وَنَبَاتًا", "وَجَنَّاتٍ أَلْفَافًا"], jawabanBenar: "وَجَعَلْنَا سِرَاجًا وَهَّاجًا" },
        { pertanyaan: "Lanjutkan ayat: 'إِنَّ يَوْمَ الْفَصْلِ كَانَ مِيقَاتًا'", opsi: ["يَوْمَ يُنْفَخُ فِي الصُّورِ فَتَأْتُونَ أَفْوَاجًا", "وَفُتِحَتِ السَّمَاءُ فَكَانَتْ أَبْوَابًا", "وَسُيِّرَتِ الْجِبَالُ فَكَانَتْ سَرَابًا", "إِنَّ جَهَنَّمَ كَانَتْ مِرْصَادًا"], jawabanBenar: "يَوْمَ يُنْفَخُ فِي الصُّورِ فَتَأْتُونَ أَفْوَاجًا" },
        { pertanyaan: "Lanjutkan ayat: 'وَفُتِحَتِ السَّمَاءُ فَكَانَتْ أَبْوَابًا'", opsi: ["وَسُيِّرَتِ الْجِبَالُ فَكَانَتْ سَرَابًا", "إِنَّ جَهَنَّمَ كَانَتْ مِرْصَادًا", "لِلطَّاغِينَ مَآبًا", "لَابِثِينَ فِيهَا أَحْقَابًا"], jawabanBenar: "وَسُيِّرَتِ الْجِبَالُ فَكَانَتْ سَرَابًا" },
        { pertanyaan: "Lanjutkan ayat: 'إِنَّ لِلْمُتَّقِينَ مَفَازًا'", opsi: ["حَدَائِقَ وَأَعْنَابًا", "وَكَوَاعِبَ أَتْرَابًا", "وَكَأْسًا دِهَاقًا", "لَا يَسْمَعُونَ فِيهَا لَغْوًا وَلَا كِذَّابًا"], jawabanBenar: "حَدَائِقَ وَأَعْنَابًا" },
        { pertanyaan: "Lanjutkan ayat: 'هَلْ أَتَاكَ حَدِيثُ مُوسَىٰ'", opsi: ["إِذْ نَادَاهُ رَبُّهُ بِالْوَادِ الْمُقَدَّسِ طُوًى", "اذْهَبْ إِلَىٰ فِرْعَوْنَ إِنَّهُ طَغَىٰ", "فَقُلْ هَلْ لَكَ إِلَىٰ أَنْ تَزَكَّىٰ", "وَأَهْدِيَكَ إِلَىٰ رَبِّكَ فَتَخْشَىٰ"], jawabanBenar: "إِذْ نَادَاهُ رَبُّهُ بِالْوَادِ الْمُقَدَّسِ طُوًى" },
        { pertanyaan: "Lanjutkan ayat: 'اذْهَبْ إِلَىٰ فِرْعَوْنَ إِنَّهُ طَغَىٰ'", opsi: ["فَقُلْ هَلْ لَكَ إِلَىٰ أَنْ تَزَكَّىٰ", "وَأَهْدِيَكَ إِلَىٰ رَبِّكَ فَتَخْشَىٰ", "فَأَرَاهُ الْآيَةَ الْكُبْرَىٰ", "فَكَذَّبَ وَعَصَىٰ"], jawabanBenar: "فَقُلْ هَلْ لَكَ إِلَىٰ أَنْ تَزَكَّىٰ" },
        { pertanyaan: "Lanjutkan ayat: 'فَأَرَاهُ الْآيَةَ الْكُبْرَىٰ'", opsi: ["فَكَذَّبَ وَعَصَىٰ", "ثُمَّ أَدْبَرَ يَسْعَىٰ", "فَحَشَرَ فَنَادَىٰ", "فَقَالَ أَنَا رَبُّكُمُ الْأَعْلَىٰ"], jawabanBenar: "فَكَذَّبَ وَعَصَىٰ" },
        { pertanyaan: "Lanjutkan ayat: 'أَأَنْتُمْ أَشَدُّ خَلْقًا أَمِ السَّمَاءُ ۚ بَنَاهَا'", opsi: ["رَفَعَ سَمْكَهَا فَسَوَّاهَا", "وَأَغْطَشَ لَيْلَهَا وَأَخْرَجَ ضُحَاهَا", "وَالْأَرْضَ بَعْدَ ذَٰلِكَ دَحَاهَا", "أَخْرَجَ مِنْهَا مَاءَهَا وَمَرْعَاهَا"], jawabanBenar: "رَفَعَ سَمْكَهَا فَسَوَّاهَا" },
        { pertanyaan: "Lanjutkan ayat: 'وَأَغْطَشَ لَيْلَهَا وَأَخْرَجَ ضُحَاهَا'", opsi: ["وَالْأَرْضَ بَعْدَ ذَٰلِكَ دَحَاهَا", "أَخْرَجَ مِنْهَا مَاءَهَا وَمَرْعَاهَا", "وَالْجِبَالَ أَرْسَاهَا", "مَتَاعًا لَكُمْ وَلِأَنْعَامِكُمْ"], jawabanBenar: "وَالْأَرْضَ بَعْدَ ذَٰلِكَ دَحَاهَا" },
        { pertanyaan: "Lanjutkan ayat: 'فَلْيَنْظُرِ الْإِنْسَانُ إِلَىٰ طَعَامِهِ'", opsi: ["أَنَّا صَبَبْنَا الْمَاءَ صَبًّا", "ثُمَّ شَقَقْنَا الْأَرْضَ شَقًّا", "فَأَنْبَتْنَا فِيهَا حَبًّا", "وَعِنَبًا وَقَضْبًا"], jawabanBenar: "أَنَّا صَبَبْنَا الْمَاءَ صَبًّا" },
        { pertanyaan: "Lanjutkan ayat: 'أَنَّا صَبَبْنَا الْمَاءَ صَبًّا'", opsi: ["ثُمَّ شَقَقْنَا الْأَرْضَ شَقًّا", "فَأَنْبَتْنَا فِيهَا حَبًّا", "وَعِنَبًا وَقَضْبًا", "وَزَيْتُونًا وَنَخْلًا"], jawabanBenar: "ثُمَّ شَقَقْنَا الْأَرْضَ شَقًّا" },
        { pertanyaan: "Lanjutkan ayat: 'وَزَيْتُونًا وَنَخْلًا'", opsi: ["وَحَدَائِقَ غُلْبًا", "وَفَاكِهَةً وَأَبًّا", "مَتَاعًا لَكُمْ وَلِأَنْعَامِكُمْ", "فَإِذَا جَاءَتِ الصَّاخَّةُ"], jawabanBenar: "وَحَدَائِقَ غُلْبًا" },
        { pertanyaan: "Lanjutkan ayat: 'وَحَدَائِقَ غُلْبًا'", opsi: ["وَفَاكِهَةً وَأَبًّا", "مَتَاعًا لَكُمْ وَلِأَنْعَامِكُمْ", "فَإِذَا جَاءَتِ الصَّاخَّةُ", "يَوْمَ يَفِرُّ الْمَرْءُ مِنْ أَخِيهِ"], jawabanBenar: "وَفَاكِهَةً وَأَبًّا" },
        { pertanyaan: "Lanjutkan ayat: 'فَلَا أُقْسِمُ بِالْخُنَّسِ'", opsi: ["الْجَوَارِ الْكُنَّسِ", "وَاللَّيْلِ إِذَا عَسْعَسَ", "وَالصُّبْحِ إِذَا تَنَفَّسَ", "إِنَّهُ لَقَوْلُ رَسُولٍ كَرِيمٍ"], jawabanBenar: "الْجَوَارِ الْكُنَّسِ" },
        { pertanyaan: "Lanjutkan ayat: 'وَاللَّيْلِ إِذَا عَسْعَسَ'", opsi: ["وَالصُّبْحِ إِذَا تَنَفَّسَ", "إِنَّهُ لَقَوْلُ رَسُولٍ كَرِيمٍ", "ذِي قُوَّةٍ عِنْدَ ذِي الْعَرْشِ مَكِينٍ", "مُطَاعٍ ثَمَّ أَمِينٍ"], jawabanBenar: "وَالصُّبْحِ إِذَا تَنَفَّسَ" },
        { pertanyaan: "Lanjutkan ayat: 'مُطَاعٍ ثَمَّ أَمِينٍ'", opsi: ["وَمَا صَاحِبُكُمْ بِمَجْنُونٍ", "وَلَقَدْ رَآهُ بِالْأُفُقِ الْمُبِينِ", "وَمَا هُوَ عَلَى الْغَيْبِ بِضَنِينٍ", "وَمَا هُوَ بِقَوْلِ شَيْطَانٍ رَجِيمٍ"], jawabanBenar: "وَمَا صَاحِبُكُمْ بِمَجْنُونٍ" },
        { pertanyaan: "Lanjutkan ayat: 'وَمَا صَاحِبُكُمْ بِمَجْنُونٍ'", opsi: ["وَلَقَدْ رَآهُ بِالْأُفُقِ الْمُبِينِ", "وَمَا هُوَ عَلَى الْغَيْبِ بِضَنِينٍ", "وَمَا هُوَ بِقَوْلِ شَيْطَانٍ رَجِيمٍ", "فَأَيْنَ تَذْهَبُونَ"], jawabanBenar: "وَلَقَدْ رَآهُ بِالْأُفُقِ الْمُبِينِ" },
        { pertanyaan: "Lanjutkan ayat: 'يَعْلَمُونَ مَا تَفْعَلُونَ'", opsi: ["إِنَّ الْأَبْرَارَ لَفِي نَعِيمٍ", "وَإِنَّ الْفُجَّارَ لَفِي جَحِيمٍ", "يَصْلَوْنَهَا يَوْمَ الدِّينِ", "وَمَا هُمْ عَنْهَا بِغَائِبِينَ"], jawabanBenar: "إِنَّ الْأَبْرَارَ لَفِي نَعِيمٍ" },
        { pertanyaan: "Lanjutkan ayat: 'إِنَّ الْأَبْرَارَ لَفِي نَعِيمٍ'", opsi: ["وَإِنَّ الْفُجَّارَ لَفِي جَحِيمٍ", "يَصْلَوْنَهَا يَوْمَ الدِّينِ", "وَمَا هُمْ عَنْهَا بِغَائِبِينَ", "وَمَا أَدْرَاكَ مَا يَوْمُ الدِّينِ"], jawabanBenar: "وَإِنَّ الْفُجَّارَ لَفِي جَحِيمٍ" },
        { pertanyaan: "Lanjutkan ayat: 'وَإِنَّ الْفُجَّارَ لَفِي جَحِيمٍ'", opsi: ["يَصْلَوْنَهَا يَوْمَ الدِّينِ", "وَمَا هُمْ عَنْهَا بِغَائِبِينَ", "وَمَا أَدْرَاكَ مَا يَوْمُ الدِّينِ", "ثُمَّ مَا أَدْرَاكَ مَا يَوْمُ الدِّينِ"], jawabanBenar: "يَصْلَوْنَهَا يَوْمَ الدِّينِ" },
        { pertanyaan: "Lanjutkan ayat: 'وَيْلٌ يَوْمَئِذٍ لِلْمُكَذِّبِينَ'", opsi: ["الَّذِينَ يُكَذِّبُونَ بِيَوْمِ الدِّينِ", "وَمَا يُكَذِّبُ بِهِ إِلَّا كُلُّ مُعْتَدٍ أَثِيمٍ", "إِذَا تُتْلَىٰ عَلَيْهِ آيَاتُنَا قَالَ أَسَاطِيرُ الْأَوَّلِينَ", "كَلَّا ۖ بَلْ ۜ رَانَ عَلَىٰ قُلُوبِهِمْ مَا كَانُوا يَكْسِبُونَ"], jawabanBenar: "الَّذِينَ يُكَذِّبُونَ بِيَوْمِ الدِّينِ" },
        { pertanyaan: "Lanjutkan ayat: 'إِذَا تُتْلَىٰ عَلَيْهِ آيَاتُنَا قَالَ أَسَاطِيرُ الْأَوَّلِينَ'", opsi: ["كَلَّا ۖ بَلْ ۜ رَانَ عَلَىٰ قُلُوبِهِمْ مَا كَانُوا يَكْسِبُونَ", "كَلَّا إِنَّهُمْ عَنْ رَبِّهِمْ يَوْمَئِذٍ لَمَحْجُوبُونَ", "ثُمَّ إِنَّهُمْ لَصَالُو الْجَحِيمِ", "ثُمَّ يُقَالُ هَٰذَا الَّذِي كُنْتُمْ بِهِ تُكَذِّبُونَ"], jawabanBenar: "كَلَّا ۖ بَلْ ۜ رَانَ عَلَىٰ قُلُوبِهِمْ مَا كَانُوا يَكْسِبُونَ" },
        { pertanyaan: "Lanjutkan ayat: 'خِتَامُهُ مِسْكٌ ۚ وَفِي ذَٰلِكَ فَلْيَتَنَافَسِ الْمُتَنَافِسُونَ'", opsi: ["وَمِزَاجُهُ مِنْ تَسْنِيمٍ", "عَيْنًا يَشْرَبُ بِهَا الْمُقَرَّبُونَ", "إِنَّ الَّذِينَ أَجْرَمُوا كَانُوا مِنَ الَّذِينَ آمَنُوا يَضْحَكُونَ", "وَإِذَا مَرُّوا بِهِمْ يَتَغَامَزُونَ"], jawabanBenar: "وَمِزَاجُهُ مِنْ تَسْنِيمٍ" },
        { pertanyaan: "Lanjutkan ayat: 'وَمِزَاجُهُ مِنْ تَسْنِيمٍ'", opsi: ["عَيْنًا يَشْرَبُ بِهَا الْمُقَرَّبُونَ", "إِنَّ الَّذِينَ أَجْرَمُوا كَانُوا مِنَ الَّذِينَ آمَنُوا يَضْحَكُونَ", "وَإِذَا مَرُّوا بِهِمْ يَتَغَامَزُونَ", "وَإِذَا انْقَلَبُوا إِلَىٰ أَهْلِهِمُ انْقَلَبُوا فَكِهِينَ"], jawabanBenar: "عَيْنًا يَشْرَبُ بِهَا الْمُقَرَّبُونَ" },
        { pertanyaan: "Lanjutkan ayat: 'فَلَا أُقْسِمُ بِالشَّفَقِ'", opsi: ["وَاللَّيْلِ وَمَا وَسَقَ", "وَالْقَمَرِ إِذَا اتَّسَقَ", "لَتَرْكَبُنَّ طَبَقًا عَنْ طَبَقٍ", "فَمَا لَهُمْ لَا يُؤْمِنُونَ"], jawabanBenar: "وَاللَّيْلِ وَمَا وَسَقَ" },
        { pertanyaan: "Lanjutkan ayat: 'وَاللَّيْلِ وَمَا وَسَقَ'", opsi: ["وَالْقَمَرِ إِذَا اتَّسَقَ", "لَتَرْكَبُنَّ طَبَقًا عَنْ طَبَقٍ", "فَمَا لَهُمْ لَا يُؤْمِنُونَ", "وَإِذَا قُرِئَ عَلَيْهِمُ الْقُرْآنُ لَا يَسْجُدُونَ ۩"], jawabanBenar: "وَالْقَمَرِ إِذَا اتَّسَقَ" },
        { pertanyaan: "Lanjutkan ayat: 'إِنَّ بَطْشَ رَبِّكَ لَشَدِيدٌ'", opsi: ["إِنَّهُ هُوَ يُبْدِئُ وَيُعِيدُ", "وَهُوَ الْغَفُورُ الْوَدُودُ", "ذُو الْعَرْشِ الْمَجِيدُ", "فَعَّالٌ لِمَا يُرِيدُ"], jawabanBenar: "إِنَّهُ هُوَ يُبْدِئُ وَيُعِيدُ" },
        { pertanyaan: "Lanjutkan ayat: 'إِنَّهُ هُوَ يُبْدِئُ وَيُعِيدُ'", opsi: ["وَهُوَ الْغَفُورُ الْوَدُودُ", "ذُو الْعَرْشِ الْمَجِيدُ", "فَعَّالٌ لِمَا يُرِيدُ", "هَلْ أَتَاكَ حَدِيثُ الْجُنُودِ"], jawabanBenar: "وَهُوَ الْغَفُورُ الْوَدُودُ" },
        { pertanyaan: "Lanjutkan ayat: 'وَهُوَ الْغَفُورُ الْوَدُودُ'", opsi: ["ذُو الْعَرْشِ الْمَجِيدُ", "فَعَّالٌ لِمَا يُرِيدُ", "هَلْ أَتَاكَ حَدِيثُ الْجُنُودِ", "فِرْعَوْنَ وَثَمُودَ"], jawabanBenar: "ذُو الْعَرْشِ الْمَجِيدُ" },
        { pertanyaan: "Lanjutkan ayat: 'وَالسَّمَاءِ ذَاتِ الرَّجْعِ'", opsi: ["وَالْأَرْضِ ذَاتِ الصَّدْعِ", "إِنَّهُ لَقَوْلٌ فَصْلٌ", "وَمَا هُوَ بِالْهَزْلِ", "إِنَّهُمْ يَكِيدُونَ كَيْدًا"], jawabanBenar: "وَالْأَرْضِ ذَاتِ الصَّدْعِ" },
        { pertanyaan: "Lanjutkan ayat: 'وَالْأَرْضِ ذَاتِ الصَّدْعِ'", opsi: ["إِنَّهُ لَقَوْلٌ فَصْلٌ", "وَمَا هُوَ بِالْهَزْلِ", "إِنَّهُمْ يَكِيدُونَ كَيْدًا", "وَأَكِيدُ كَيْدًا"], jawabanBenar: "إِنَّهُ لَقَوْلٌ فَصْلٌ" },
        { pertanyaan: "Lanjutkan ayat: 'وَالَّذِي قَدَّرَ فَهَدَىٰ'", opsi: ["وَالَّذِي أَخْرَجَ الْمَرْعَىٰ", "فَجَعَلَهُ غُثَاءً أَحْوَىٰ", "سَنُقْرِئُكَ فَلَا تَنْسَىٰ", "إِلَّا مَا شَاءَ اللَّهُ"], jawabanBenar: "وَالَّذِي أَخْرَجَ الْمَرْعَىٰ" },
        { pertanyaan: "Lanjutkan ayat: 'وَالَّذِي أَخْرَجَ الْمَرْعَىٰ'", opsi: ["فَجَعَلَهُ غُثَاءً أَحْوَىٰ", "سَنُقْرِئُكَ فَلَا تَنْسَىٰ", "إِلَّا مَا شَاءَ اللَّهُ ۚ إِنَّهُ يَعْلَمُ الْجَهْرَ وَمَا يَخْفَىٰ", "وَنُيَسِّرُكَ لِلْيُسْرَىٰ"], jawabanBenar: "فَجَعَلَهُ غُثَاءً أَحْوَىٰ" },
        { pertanyaan: "Lanjutkan ayat: 'أَفَلَا يَنْظُرُونَ إِلَى الْإِبِلِ كَيْفَ خُلِقَتْ'", opsi: ["وَإِلَى السَّمَاءِ كَيْفَ رُفِعَتْ", "وَإِلَى الْجِبَالِ كَيْفَ نُصِبَتْ", "وَإِلَى الْأَرْضِ كَيْفَ سُطِحَتْ", "فَذَكِّرْ إِنَّمَا أَنْتَ مُذَكِّرٌ"], jawabanBenar: "وَإِلَى السَّمَاءِ كَيْفَ رُفِعَتْ" },
        { pertanyaan: "Lanjutkan ayat: 'وَإِلَى السَّمَاءِ كَيْفَ رُفِعَتْ'", opsi: ["وَإِلَى الْجِبَالِ كَيْفَ نُصِبَتْ", "وَإِلَى الْأَرْضِ كَيْفَ سُطِحَتْ", "فَذَكِّرْ إِنَّمَا أَنْتَ مُذَكِّرٌ", "لَسْتَ عَلَيْهِمْ بِمُصَيْطِرٍ"], jawabanBenar: "وَإِلَى الْجِبَالِ كَيْفَ نُصِبَتْ" },
        { pertanyaan: "Lanjutkan ayat: 'وَإِلَى الْجِبَالِ كَيْفَ نُصِبَتْ'", opsi: ["وَإِلَى الْأَرْضِ كَيْفَ سُطِحَتْ", "فَذَكِّرْ إِنَّمَا أَنْتَ مُذَكِّرٌ", "لَسْتَ عَلَيْهِمْ بِمُصَيْطِرٍ", "إِلَّا مَنْ تَوَلَّىٰ وَكَفَرَ"], jawabanBenar: "وَإِلَى الْأَرْضِ كَيْفَ سُطِحَتْ" },
        { pertanyaan: "Lanjutkan ayat: 'يَا أَيَّتُهَا النَّفْسُ الْمُطْمَئِنَّةُ'", opsi: ["ارْجِعِي إِلَىٰ رَبِّكِ رَاضِيَةً مَرْضِيَّةً", "فَادْخُلِي فِي عِبَادِي", "وَادْخُلِي جَنَّتِي", "يَوْمَئِذٍ يَتَذَكَّرُ الْإِنْسَانُ وَأَنَّىٰ لَهُ الذِّكْرَىٰ"], jawabanBenar: "ارْجِعِي إِلَىٰ رَبِّكِ رَاضِيَةً مَرْضِيَّةً" },
        { pertanyaan: "Lanjutkan ayat: 'ارْجِعِي إِلَىٰ رَبِّكِ رَاضِيَةً مَرْضِيَّةً'", opsi: ["فَادْخُلِي فِي عِبَادِي", "وَادْخُلِي جَنَّتِي", "فَيَوْمَئِذٍ لَا يُعَذِّبُ عَذَابَهُ أَحَدٌ", "وَلَا يُوثِقُ وَثَاقَهُ أَحَدٌ"], jawabanBenar: "فَادْخُلِي فِي عِبَادِي" },
        { pertanyaan: "Lanjutkan ayat: 'فَادْخُلِي فِي عِبَادِي'", opsi: ["وَادْخُلِي جَنَّتِي", "يَا أَيَّتُهَا النَّفْسُ الْمُطْمَئِنَّةُ", "ارْجِعِي إِلَىٰ رَبِّكِ رَاضِيَةً مَرْضِيَّةً", "(Ini adalah akhir surat)"], jawabanBenar: "وَادْخُلِي جَنَّتِي" },
        { pertanyaan: "Lanjutkan ayat: 'فَأَنْذَرْتُكُمْ نَارًا تَلَظَّىٰ'", opsi: ["لَا يَصْلَاهَا إِلَّا الْأَشْقَى", "الَّذِي كَذَّبَ وَتَوَلَّىٰ", "وَسَيُجَنَّبُهَا الْأَتْقَى", "الَّذِي يُؤْتِي مَالَهُ يَتَزَكَّىٰ"], jawabanBenar: "لَا يَصْلَاهَا إِلَّا الْأَشْقَى" },
        { pertanyaan: "Lanjutkan ayat: 'لَا يَصْلَاهَا إِلَّا الْأَشْقَى'", opsi: ["الَّذِي كَذَّبَ وَتَوَلَّىٰ", "وَسَيُجَنَّبُهَا الْأَتْقَى", "الَّذِي يُؤْتِي مَالَهُ يَتَزَكَّىٰ", "وَمَا لِأَحَدٍ عِنْدَهُ مِنْ نِعْمَةٍ تُجْزَىٰ"], jawabanBenar: "الَّذِي كَذَّبَ وَتَوَلَّىٰ" },
        { pertanyaan: "Lanjutkan ayat: 'الَّذِي كَذَّبَ وَتَوَلَّىٰ'", opsi: ["وَسَيُجَنَّبُهَا الْأَتْقَى", "الَّذِي يُؤْتِي مَالَهُ يَتَزَكَّىٰ", "وَمَا لِأَحَدٍ عِنْدَهُ مِنْ نِعْمَةٍ تُجْزَىٰ", "إِلَّا ابْتِغَاءَ وَجْهِ رَبِّهِ الْأَعْلَىٰ"], jawabanBenar: "وَسَيُجَنَّبُهَا الْأَتْقَى" },
        { pertanyaan: "Lanjutkan ayat: 'إِلَّا ابْتِغَاءَ وَجْهِ رَبِّهِ الْأَعْلَىٰ'", opsi: ["وَلَسَوْفَ يَرْضَىٰ", "وَسَيُجَنَّبُهَا الْأَتْقَى", "الَّذِي يُؤْتِي مَالَهُ يَتَزَكَّىٰ", "(Ini adalah akhir surat)"], jawabanBenar: "وَلَسَوْفَ يَرْضَىٰ" },
        { pertanyaan: "Lanjutkan ayat: 'وَلَلْآخِرَةُ خَيْرٌ لَكَ مِنَ الْأُولَىٰ'", opsi: ["وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ", "أَلَمْ يَجِدْكَ يَتِيمًا فَآوَىٰ", "وَوَجَدَكَ ضَالًّا فَهَدَىٰ", "وَوَجَدَكَ عَائِلًا فَأَغْنَىٰ"], jawabanBenar: "وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ" },
        { pertanyaan: "Lanjutkan ayat: 'وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ'", opsi: ["أَلَمْ يَجِدْكَ يَتِيمًا فَآوَىٰ", "وَوَجَدَكَ ضَالًّا فَهَدَىٰ", "وَوَجَدَكَ عَائِلًا فَأَغْنَىٰ", "فَأَمَّا الْيَتِيمَ فَلَا تَقْهَرْ"], jawabanBenar: "أَلَمْ يَجِدْكَ يَتِيمًا فَآوَىٰ" },
        { pertanyaan: "Lanjutkan ayat: 'أَلَمْ يَجِدْكَ يَتِيمًا فَآوَىٰ'", opsi: ["وَوَجَدَكَ ضَالًّا فَهَدَىٰ", "وَوَجَدَكَ عَائِلًا فَأَغْنَىٰ", "فَأَمَّا الْيَتِيمَ فَلَا تَقْهَرْ", "وَأَمَّا السَّائِلَ فَلَا تَنْهَرْ"], jawabanBenar: "وَوَجَدَكَ ضَالًّا فَهَدَىٰ" },
        { pertanyaan: "Lanjutkan ayat: 'فَأَمَّا الْيَتِيمَ فَلَا تَقْهَرْ'", opsi: ["وَأَمَّا السَّائِلَ فَلَا تَنْهَرْ", "وَأَمَّا بِنِعْمَةِ رَبِّكَ فَحَدِّثْ", "وَوَجَدَكَ ضَالًّا فَهَدَىٰ", "وَوَجَدَكَ عَائِلًا فَأَغْنَىٰ"], jawabanBenar: "وَأَمَّا السَّائِلَ فَلَا تَنْهَرْ" },
        { pertanyaan: "Lanjutkan ayat: 'وَأَمَّا السَّائِلَ فَلَا تَنْهَرْ'", opsi: ["وَأَمَّا بِنِعْمَةِ رَبِّكَ فَحَدِّثْ", "وَإِلَىٰ رَبِّكَ فَارْغَبْ", "فَإِذَا فَرَغْتَ فَانْصَبْ", "(Ini adalah akhir surat)"], jawabanBenar: "وَأَمَّا بِنِعْمَةِ رَبِّكَ فَحَدِّثْ" },
        { pertanyaan: "Lanjutkan ayat: 'فَإِذَا فَرَغْتَ فَانْصَبْ'", opsi: ["وَإِلَىٰ رَبِّكَ فَارْغَبْ", "وَأَمَّا بِنِعْمَةِ رَبِّكَ فَحَدِّثْ", "(Ini adalah akhir surat)", "الَّذِي أَنْقَضَ ظَهْرَكَ"], jawabanBenar: "وَإِلَىٰ رَبِّكَ فَارْغَبْ" },
        { pertanyaan: "Lanjutkan ayat: 'رَسُولٌ مِنَ اللَّهِ يَتْلُو صُحُفًا مُطَهَّرَةً'", opsi: ["فِيهَا كُتُبٌ قَيِّمَةٌ", "وَمَا تَفَرَّقَ الَّذِينَ أُوتُوا الْكِتَابَ", "وَمَا أُمِرُوا إِلَّا لِيَعْبُدُوا اللَّهَ", "إِنَّ الَّذِينَ كَفَرُوا مِنْ أَهْلِ الْكِتَابِ"], jawabanBenar: "فِيهَا كُتُبٌ قَيِّمَةٌ" },
        { pertanyaan: "Lanjutkan ayat: 'فِيهَا كُتُبٌ قَيِّمَةٌ'", opsi: ["وَمَا تَفَرَّقَ الَّذِينَ أُوتُوا الْكِتَابَ إِلَّا مِنْ بَعْدِ مَا جَاءَتْهُمُ الْبَيِّنَةُ", "وَمَا أُمِرُوا إِلَّا لِيَعْبُدُوا اللَّهَ", "إِنَّ الَّذِينَ كَفَرُوا مِنْ أَهْلِ الْكِتَابِ", "إِنَّ الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ"], jawabanBenar: "وَمَا تَفَرَّقَ الَّذِينَ أُوتُوا الْكِتَابَ إِلَّا مِنْ بَعْدِ مَا جَاءَتْهُمُ الْبَيِّنَةُ" },
        { pertanyaan: "Lanjutkan ayat: 'يَوْمَئِذٍ يَصْدُرُ النَّاسُ أَشْتَاتًا لِيُرَوْا أَعْمَالَهُمْ'", opsi: ["فَمَنْ يَعْمَلْ مِثْقَالَ ذَرَّةٍ خَيْرًا يَرَهُ", "وَمَنْ يَعْمَلْ مِثْقَالَ ذَرَّةٍ شَرًّا يَرَهُ", "يَوْمَئِذٍ تُحَدِّثُ أَخْبَارَهَا", "وَقَالَ الْإِنْسَانُ مَا لَهَا"], jawabanBenar: "فَمَنْ يَعْمَلْ مِثْقَالَ ذَرَّةٍ خَيْرًا يَرَهُ" },
        { pertanyaan: "Lanjutkan ayat: 'فَمَنْ يَعْمَلْ مِثْقَالَ ذَرَّةٍ خَيْرًا يَرَهُ'", opsi: ["وَمَنْ يَعْمَلْ مِثْقَالَ ذَرَّةٍ شَرًّا يَرَهُ", "يَوْمَئِذٍ يَصْدُرُ النَّاسُ أَشْتَاتًا", "إِنَّ الْإِنْسَانَ لِرَبِّهِ لَكَنُودٌ", "وَإِنَّهُ عَلَىٰ ذَٰلِكَ لَشَهِيدٌ"], jawabanBenar: "وَمَنْ يَعْمَلْ مِثْقَالَ ذَرَّةٍ شَرًّا يَرَهُ" },
        { pertanyaan: "Lanjutkan ayat: 'أَفَلَا يَعْلَمُ إِذَا بُعْثِرَ مَا فِي الْقُبُورِ'", opsi: ["وَحُصِّلَ مَا فِي الصُّدُورِ", "إِنَّ رَبَّهُمْ بِهِمْ يَوْمَئِذٍ لَخَبِيرٌ", "يَوْمَئِذٍ تُحَدِّثُ أَخْبَارَهَا", "يَوْمَئِذٍ يَصْدُرُ النَّاسُ أَشْتَاتًا"], jawabanBenar: "وَحُصِّلَ مَا فِي الصُّدُورِ" },
        { pertanyaan: "Lanjutkan ayat: 'وَحُصِّلَ مَا فِي الصُّدُورِ'", opsi: ["إِنَّ رَبَّهُمْ بِهِمْ يَوْمَئِذٍ لَخَبِيرٌ", "أَفَلَا يَعْلَمُ إِذَا بُعْثِرَ مَا فِي الْقُبُورِ", "وَإِنَّهُ لِحُبِّ الْخَيْرِ لَشَدِيدٌ", "(Ini adalah akhir surat)"], jawabanBenar: "إِنَّ رَبَّهُمْ بِهِمْ يَوْمَئِذٍ لَخَبِيرٌ" },
        { pertanyaan: "Lanjutkan ayat: 'وَأَمَّا مَنْ خَفَّتْ مَوَازِينُهُ'", opsi: ["فَأُمُّهُ هَاوِيَةٌ", "وَمَا أَدْرَاكَ مَا هِيَهْ", "نَارٌ حَامِيَةٌ", "فَهُوَ فِي عِيشَةٍ رَاضِيَةٍ"], jawabanBenar: "فَأُمُّهُ هَاوِيَةٌ" },
        { pertanyaan: "Lanjutkan ayat: 'فَأُمُّهُ هَاوِيَةٌ'", opsi: ["وَمَا أَدْرَاكَ مَا هِيَهْ", "نَارٌ حَامِيَةٌ", "وَأَمَّا مَنْ خَفَّتْ مَوَازِينُهُ", "نَارُ اللَّهِ الْمُوقَدَةُ"], jawabanBenar: "وَمَا أَدْرَاكَ مَا هِيَهْ" },
        { pertanyaan: "Lanjutkan ayat: 'وَمَا أَدْرَاكَ مَا هِيَهْ'", opsi: ["نَارٌ حَامِيَةٌ", "فَأُمُّهُ هَاوِيَةٌ", "نَارُ اللَّهِ الْمُوقَدَةُ", "سَيَصْلَىٰ نَارًا ذَاتَ لَهَبٍ"], jawabanBenar: "نَارٌ حَامِيَةٌ" },
        { pertanyaan: "Lanjutkan ayat: 'كَلَّا لَوْ تَعْلَمُونَ عِلْمَ الْيَقِينِ'", opsi: ["لَتَرَوُنَّ الْجَحِيمَ", "ثُمَّ لَتَرَوُنَّهَا عَيْنَ الْيَقِينِ", "ثُمَّ لَتُسْأَلُنَّ يَوْمَئِذٍ عَنِ النَّعِيمِ", "كَلَّا سَوْفَ تَعْلَمُونَ"], jawabanBenar: "لَتَرَوُنَّ الْجَحِيمَ" },
        { pertanyaan: "Lanjutkan ayat: 'لَتَرَوُنَّ الْجَحِيمَ'", opsi: ["ثُمَّ لَتَرَوُنَّهَا عَيْنَ الْيَقِينِ", "ثُمَّ لَتُسْأَلُنَّ يَوْمَئِذٍ عَنِ النَّعِيمِ", "كَلَّا لَوْ تَعْلَمُونَ عِلْمَ الْيَقِينِ", "حَتَّىٰ زُرْتُمُ الْمَقَابِرَ"], jawabanBenar: "ثُمَّ لَتَرَوُنَّهَا عَيْنَ الْيَقِينِ" },
        { pertanyaan: "Lanjutkan ayat: 'ثُمَّ لَتَرَوُنَّهَا عَيْنَ الْيَقِينِ'", opsi: ["ثُمَّ لَتُسْأَلُنَّ يَوْمَئِذٍ عَنِ النَّعِيمِ", "لَتَرَوُنَّ الْجَحِيمَ", "كَلَّا لَوْ تَعْلَمُونَ عِلْمَ الْيَقِينِ", "ثُمَّ كَلَّا سَوْفَ تَعْلَمُونَ"], jawabanBenar: "ثُمَّ لَتُسْأَلُنَّ يَوْمَئِذٍ عَنِ النَّعِيمِ" },
        { pertanyaan: "Lanjutkan ayat: 'إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ وَتَوَاصَوْا بِالْحَقِّ'", opsi: ["وَتَوَاصَوْا بِالصَّبْرِ", "إِنَّ الْإِنْسَانَ لَفِي خُسْرٍ", "فَلَهُمْ أَجْرٌ غَيْرُ مَمْنُونٍ", "وَيْلٌ لِكُلِّ هُمَزَةٍ لُمَزَةٍ"], jawabanBenar: "وَتَوَاصَوْا بِالصَّبْرِ" },
        { pertanyaan: "Lanjutkan ayat: 'وَمَا أَدْرَاكَ مَا الْحُطَمَةُ'", opsi: ["نَارُ اللَّهِ الْمُوقَدَةُ", "الَّتِي تَطَّلِعُ عَلَى الْأَفْئِدَةِ", "إِنَّهَا عَلَيْهِمْ مُؤْصَدَةٌ", "فِي عَمَدٍ مُمَدَّدَةٍ"], jawabanBenar: "نَارُ اللَّهِ الْمُوقَدَةُ" },
        { pertanyaan: "Lanjutkan ayat: 'نَارُ اللَّهِ الْمُوقَدَةُ'", opsi: ["الَّتِي تَطَّلِعُ عَلَى الْأَفْئِدَةِ", "إِنَّهَا عَلَيْهِمْ مُؤْصَدَةٌ", "فِي عَمَدٍ مُمَدَّدَةٍ", "وَمَا أَدْرَاكَ مَا الْحُطَمَةُ"], jawabanBenar: "الَّتِي تَطَّلِعُ عَلَى الْأَفْئِدَةِ" },
        { pertanyaan: "Lanjutkan ayat: 'الَّتِي تَطَّلِعُ عَلَى الْأَفْئِدَةِ'", opsi: ["إِنَّهَا عَلَيْهِمْ مُؤْصَدَةٌ", "فِي عَمَدٍ مُمَدَّدَةٍ", "نَارُ اللَّهِ الْمُوقَدَةُ", "كَلَّا ۖ لَيُنْبَذَنَّ فِي الْحُطَمَةِ"], jawabanBenar: "إِنَّهَا عَلَيْهِمْ مُؤْصَدَةٌ" },
        { pertanyaan: "Lanjutkan ayat: 'فَلْيَعْبُدُوا رَبَّ هَٰذَا الْبَيْتِ'", opsi: ["الَّذِي أَطْعَمَهُمْ مِنْ جُوعٍ وَآمَنَهُمْ مِنْ خَوْفٍ", "إِيلَافِهِمْ رِحْلَةَ الشِّتَاءِ وَالصَّيْفِ", "لِإِيلَافِ قُرَيْشٍ", "فَجَعَلَهُمْ كَعَصْفٍ مَأْكُولٍ"], jawabanBenar: "الَّذِي أَطْعَمَهُمْ مِنْ جُوعٍ وَآمَنَهُمْ مِنْ خَوْفٍ" },
        { pertanyaan: "Lanjutkan ayat: 'وَوَلَدٍ وَمَا وَلَدَ'", opsi: ["لَقَدْ خَلَقْنَا الْإِنْسَانَ فِي كَبَدٍ", "أَيَحْسَبُ أَنْ لَنْ يَقْدِرَ عَلَيْهِ أَحَدٌ", "يَقُولُ أَهْلَكْتُ مَالًا لُبَدًا", "أَيَحْسَبُ أَنْ لَمْ يَرَهُ أَحَدٌ"], jawabanBenar: "لَقَدْ خَلَقْنَا الْإِنْسَانَ فِي كَبَدٍ" }
    ],
    lanjut: [
        { pertanyaan: "Hati-hati tertukar! Lanjutkan ayat: 'فَإِذَا جَاءَتِ الطَّامَّةُ الْكُبْرَىٰ'", opsi: ["يَوْمَ يَتَذَكَّرُ الْإِنْسَانُ مَا سَعَىٰ", "يَوْمَ يَفِرُّ الْمَرْءُ مِنْ أَخِيهِ", "وُجُوهٌ يَوْمَئِذٍ خَاشِعَةٌ", "يَوْمَ يَنْظُرُ الْمَرْءُ مَا قَدَّمَتْ يَدَاهُ"], jawabanBenar: "يَوْمَ يَتَذَكَّرُ الْإِنْسَانُ مَا سَعَىٰ" },
        { pertanyaan: "Bandingkan dengan yang sebelumnya! Lanjutkan ayat: 'فَإِذَا جَاءَتِ الصَّاخَّةُ'", opsi: ["يَوْمَ يَفِرُّ الْمَرْءُ مِنْ أَخِيهِ", "يَوْمَ يَتَذَكَّرُ الْإِنْسَانُ مَا سَعَىٰ", "لِكُلِّ امْرِئٍ مِنْهُمْ يَوْمَئِذٍ شَأْنٌ يُغْنِيهِ", "يَوْمَ تَرْجُفُ الرَّاجِفَةُ"], jawabanBenar: "يَوْمَ يَفِرُّ الْمَرْءُ مِنْ أَخِيهِ" },
        { pertanyaan: "Lanjutkan ayat yang diawali 'Kalla' ini: 'كَلَّا ۖ بَلْ ۜ رَانَ عَلَىٰ قُلُوبِهِمْ مَا كَانُوا يَكْسِبُونَ'", opsi: ["كَلَّا إِنَّهُمْ عَنْ رَبِّهِمْ يَوْمَئِذٍ لَمَحْجُوبُونَ", "ثُمَّ إِنَّهُمْ لَصَالُو الْجَحِيمِ", "وَمَا يُكَذِّبُ بِهِ إِلَّا كُلُّ مُعْتَدٍ أَثِيمٍ", "كَلَّا إِنَّ كِتَابَ الْأَبْرَارِ لَفِي عِلِّيِّينَ"], jawabanBenar: "كَلَّا إِنَّهُمْ عَنْ رَبِّهِمْ يَوْمَئِذٍ لَمَحْجُوبُونَ" },
        { pertanyaan: "Lanjutkan ayat yang cukup panjang ini: 'إِنَّ الَّذِينَ كَفَرُوا مِنْ أَهْلِ الْكِتَابِ وَالْمُشْرِكِينَ فِي نَارِ جَهَنَّمَ خَالِدِينَ فِيهَا ۚ'", opsi: ["أُولَٰئِكَ هُمْ شَرُّ الْبَرِيَّةِ", "أُولَٰئِكَ هُمْ خَيْرُ الْبَرِيَّةِ", "جَزَاؤُهُمْ عِنْدَ رَبِّهِمْ جَنَّاتُ عَدْنٍ", "وَمَا أُمِرُوا إِلَّا لِيَعْبُدُوا اللَّهَ"], jawabanBenar: "أُولَٰئِكَ هُمْ شَرُّ الْبَرِيَّةِ" },
        { pertanyaan: "Hati-hati tertukar rima 'yah/yat'! Lanjutkan ayat: 'تَصْلَىٰ نَارًا حَامِيَةً'", opsi: ["تُسْقَىٰ مِنْ عَيْنٍ آنِيَةٍ", "لَيْسَ لَهُمْ طَعَامٌ إِلَّا مِنْ ضَرِيعٍ", "لَا يُسْمِنُ وَلَا يُغْنِي مِنْ جُوعٍ", "فِيهَا عَيْنٌ جَارِيَةٌ"], jawabanBenar: "تُسْقَىٰ مِنْ عَيْنٍ آنِيَةٍ" },
        { pertanyaan: "Perhatikan kata awalnya! Lanjutkan ayat: 'كَلَّا سَوْفَ تَعْلَمُونَ'", opsi: ["ثُمَّ كَلَّا سَوْفَ تَعْلَمُونَ", "كَلَّا لَوْ تَعْلَمُونَ عِلْمَ الْيَقِينِ", "لَتَرَوُنَّ الْجَحِيمَ", "ثُمَّ لَتَرَوُنَّهَا عَيْنَ الْيَقِينِ"], jawabanBenar: "ثُمَّ كَلَّا سَوْفَ تَعْلَمُونَ" },
        { pertanyaan: "Lanjutkan ayat yang mengulang kata ini: 'كَلَّا ۖ إِذَا دُكَّتِ الْأَرْضُ دَكًّا دَكًّا'", opsi: ["وَجَاءَ رَبُّكَ وَالْمَلَكُ صَفًّا صَفًّا", "وَجِيءَ يَوْمَئِذٍ بِجَهَنَّمَ", "يَقُولُ يَا لَيْتَنِي قَدَّمْتُ لِحَيَاتِي", "يَوْمَئِذٍ يَتَذَكَّرُ الْإِنْسَانُ وَأَنَّىٰ لَهُ الذِّكْرَىٰ"], jawabanBenar: "وَجَاءَ رَبُّكَ وَالْمَلَكُ صَفًّا صَفًّا" },
        { pertanyaan: "Lanjutkan ayat 'Wa-amma': 'وَأَمَّا مَنْ أُوتِيَ كِتَابَهُ وَرَاءَ ظَهْرِهِ'", opsi: ["فَسَوْفَ يَدْعُو ثُبُورًا", "فَسَوْفَ يُحَاسَبُ حِسَابًا يَسِيرًا", "وَيَنْقَلِبُ إِلَىٰ أَهْلِهِ مَسْرُورًا", "وَيَصْلَىٰ سَعِيرًا"], jawabanBenar: "فَسَوْفَ يَدْعُو ثُبُورًا" },
        { pertanyaan: "Jangan tertukar dengan ayat surat lain. Lanjutkan ayat: 'يَا أَيُّهَا الْإِنْسَانُ مَا غَرَّكَ بِرَبِّكَ الْكَرِيمِ'", opsi: ["الَّذِي خَلَقَكَ فَسَوَّاكَ فَعَدَلَكَ", "فِي أَيِّ صُورَةٍ مَا شَاءَ رَكَّبَكَ", "لَقَدْ خَلَقْنَا الْإِنْسَانَ فِي أَحْسَنِ تَقْوِيمٍ", "كَلَّا بَلْ تُكَذِّبُونَ بِالدِّينِ"], jawabanBenar: "الَّذِي خَلَقَكَ فَسَوَّاكَ فَعَدَلَكَ" },
        { pertanyaan: "Ayat ini sering tertukar posisinya! Lanjutkan: 'أَرَأَيْتَ الَّذِي يَنْهَىٰ'", opsi: ["عَبْدًا إِذَا صَلَّىٰ", "أَرَأَيْتَ إِنْ كَانَ عَلَى الْهُدَىٰ", "أَوْ أَمَرَ بِالتَّقْوَىٰ", "أَلَمْ يَعْلَمْ بِأَنَّ اللَّهَ يَرَىٰ"], jawabanBenar: "عَبْدًا إِذَا صَلَّىٰ" },
        { pertanyaan: "Lanjutkan ayat panjang ini: 'فَكَذَّبُوهُ فَعَقَرُوهَا فَدَمْدَمَ عَلَيْهِمْ رَبُّهُمْ بِذَنْبِهِمْ فَسَوَّاهَا'", opsi: ["وَلَا يَخَافُ عُقْبَاهَا", "إِذِ انْبَعَثَ أَشْقَاهَا", "فَقَالَ لَهُمْ رَسُولُ اللَّهِ نَاقَةَ اللَّهِ وَسُقْيَاهَا", "وَقَدْ خَابَ مَنْ دَسَّاهَا"], jawabanBenar: "وَلَا يَخَافُ عُقْبَاهَا" },
        { pertanyaan: "Lanjutan 'Fa-amma' yang ini sering tertukar! Lanjutkan: 'فَأَمَّا مَنْ طَغَىٰ'", opsi: ["وَآثَرَ الْحَيَاةَ الدُّنْيَا", "فَإِنَّ الْجَحِيمَ هِيَ الْمَأْوَىٰ", "وَأَمَّا مَنْ خَافَ مَقَامَ رَبِّهِ", "فَإِنَّ الْجَنَّةَ هِيَ الْمَأْوَىٰ"], jawabanBenar: "وَآثَرَ الْحَيَاةَ الدُّنْيَا" },
        { pertanyaan: "Ingatkah rima surat ini? Lanjutkan ayat: 'وَأَمَّا مَنْ خَافَ مَقَامَ رَبِّهِ وَنَهَى النَّفْسَ عَنِ الْهَوَىٰ'", opsi: ["فَإِنَّ الْجَنَّةَ هِيَ الْمَأْوَىٰ", "فَإِنَّ الْجَحِيمَ هِيَ الْمَأْوَىٰ", "يَسْأَلُونَكَ عَنِ السَّاعَةِ أَيَّانَ مُرْسَاهَا", "فِيمَ أَنْتَ مِنْ ذِكْرَاهَا"], jawabanBenar: "فَإِنَّ الْجَنَّةَ هِيَ الْمَأْوَىٰ" },
        { pertanyaan: "Lanjutkan ayat jebakan 'Kalla' ini: 'كَلَّا لَئِنْ لَمْ يَنْتَهِ لَنَسْفَعًا بِالنَّاصِيَةِ'", opsi: ["نَاصِيَةٍ كَاذِبَةٍ خَاطِئَةٍ", "فَلْيَدْعُ نَادِيَهُ", "سَنَدْعُ الزَّبَانِيَةَ", "كَلَّا لَا تُطِعْهُ وَاسْجُدْ وَاقْتَرِبْ"], jawabanBenar: "نَاصِيَةٍ كَاذِبَةٍ خَاطِئَةٍ" },
        { pertanyaan: "Mirip dengan akhir surat lain! Lanjutkan ayat: 'إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ فَلَهُمْ أَجْرٌ غَيْرُ مَمْنُونٍ'", opsi: ["فَمَا يُكَذِّبُكَ بَعْدُ بِالدِّينِ", "أَلَيْسَ اللَّهُ بِأَحْكَمِ الْحَاكِمِينَ", "ثُمَّ رَدَدْنَاهُ أَسْفَلَ سَافِلِينَ", "وَتَوَاصَوْا بِالْحَقِّ وَتَوَاصَوْا بِالصَّبْرِ"], jawabanBenar: "فَمَا يُكَذِّبُكَ بَعْدُ بِالدِّينِ" },
        { pertanyaan: "Lanjutkan ayat yang panjang ini: 'وَجِيءَ يَوْمَئِذٍ بِجَهَنَّمَ ۚ يَوْمَئِذٍ يَتَذَكَّرُ الْإِنْسَانُ وَأَنَّىٰ لَهُ الذِّكْرَىٰ'", opsi: ["يَقُولُ يَا لَيْتَنِي قَدَّمْتُ لِحَيَاتِي", "فَيَوْمَئِذٍ لَا يُعَذِّبُ عَذَابَهُ أَحَدٌ", "وَلَا يُوثِقُ وَثَاقَهُ أَحَدٌ", "يَا أَيَّتُهَا النَّفْسُ الْمُطْمَئِنَّةُ"], jawabanBenar: "يَقُولُ يَا لَيْتَنِي قَدَّمْتُ لِحَيَاتِي" },
        { pertanyaan: "Jangan tertukar posisi 'Wa-Amma' ini! Lanjutkan: 'وَأَمَّا مَنْ بَخِلَ وَاسْتَغْنَىٰ'", opsi: ["وَكَذَّبَ بِالْحُسْنَىٰ", "فَسَنُيَسِّرُهُ لِلْعُسْرَىٰ", "وَمَا يُغْنِي عَنْهُ مَالُهُ إِذَا تَرَدَّىٰ", "وَصَدَّقَ بِالْحُسْنَىٰ"], jawabanBenar: "وَكَذَّبَ بِالْحُسْنَىٰ" },
        { pertanyaan: "Bandingkan dengan soal sebelumnya! Lanjutkan ayat: 'فَأَمَّا مَنْ أَعْطَىٰ وَاتَّقَىٰ'", opsi: ["وَصَدَّقَ بِالْحُسْنَىٰ", "فَسَنُيَسِّرُهُ لِلْيُسْرَىٰ", "وَأَمَّا مَنْ بَخِلَ وَاسْتَغْنَىٰ", "وَكَذَّبَ بِالْحُسْنَىٰ"], jawabanBenar: "وَصَدَّقَ بِالْحُسْنَىٰ" },
        { pertanyaan: "Lanjutkan ayat 'Tsumma' ini: 'ثُمَّ إِنَّ عَلَيْنَا حِسَابَهُمْ'", opsi: ["(Ini adalah akhir surat)", "إِنَّ إِلَيْنَا إِيَابَهُمْ", "فَذَكِّرْ إِنَّمَا أَنْتَ مُذَكِّرٌ", "لَسْتَ عَلَيْهِمْ بِمُصَيْطِرٍ"], jawabanBenar: "(Ini adalah akhir surat)" },
        { pertanyaan: "Lanjutkan ayat sebelum 'Tsumma' tadi: 'إِنَّ إِلَيْنَا إِيَابَهُمْ'", opsi: ["ثُمَّ إِنَّ عَلَيْنَا حِسَابَهُمْ", "فَذَكِّرْ إِنَّمَا أَنْتَ مُذَكِّرٌ", "لَسْتَ عَلَيْهِمْ بِمُصَيْطِرٍ", "إِلَّا مَنْ تَوَلَّىٰ وَكَفَرَ"], jawabanBenar: "ثُمَّ إِنَّ عَلَيْنَا حِسَابَهُمْ" },
        { pertanyaan: "Sering tertukar karena berima 'aab'! Lanjutkan ayat: 'إِنَّهُمْ كَانُوا لَا يَرْجُونَ حِسَابًا'", opsi: ["وَكَذَّبُوا بِآيَاتِنَا كِذَّابًا", "وَكُلَّ شَيْءٍ أَحْصَيْنَاهُ كِتَابًا", "فَذُوقُوا فَلَنْ نَزِيدَكُمْ إِلَّا عَذَابًا", "لَابِثِينَ فِيهَا أَحْقَابًا"], jawabanBenar: "وَكَذَّبُوا بِآيَاتِنَا كِذَّابًا" },
        { pertanyaan: "Lanjutkan urutannya! 'وَكَذَّبُوا بِآيَاتِنَا كِذَّابًا'", opsi: ["وَكُلَّ شَيْءٍ أَحْصَيْنَاهُ كِتَابًا", "فَذُوقُوا فَلَنْ نَزِيدَكُمْ إِلَّا عَذَابًا", "إِنَّ لِلْمُتَّقِينَ مَفَازًا", "إِنَّهُمْ كَانُوا لَا يَرْجُونَ حِسَابًا"], jawabanBenar: "وَكُلَّ شَيْءٍ أَحْصَيْنَاهُ كِتَابًا" },
        { pertanyaan: "Lanjutkan urutannya lagi! 'وَكُلَّ شَيْءٍ أَحْصَيْنَاهُ كِتَابًا'", opsi: ["فَذُوقُوا فَلَنْ نَزِيدَكُمْ إِلَّا عَذَابًا", "إِنَّ لِلْمُتَّقِينَ مَفَازًا", "حَدَائِقَ وَأَعْنَابًا", "وَكَذَّبُوا بِآيَاتِنَا كِذَّابًا"], jawabanBenar: "فَذُوقُوا فَلَنْ نَزِيدَكُمْ إِلَّا عَذَابًا" },
        { pertanyaan: "Lanjutkan ayat akhir ini: 'يَوْمَ يَنْظُرُ الْمَرْءُ مَا قَدَّمَتْ يَدَاهُ...'", opsi: ["وَيَقُولُ الْكَافِرُ يَا لَيْتَنِي كُنْتُ تُرَابًا", "ذَٰلِكَ الْيَوْمُ الْحَقُّ", "إِلَّا مَنْ أَذِنَ لَهُ الرَّحْمَٰنُ وَقَالَ صَوَابًا", "إِنَّا أَنْذَرْنَاكُمْ عَذَابًا قَرِيبًا"], jawabanBenar: "وَيَقُولُ الْكَافِرُ يَا لَيْتَنِي كُنْتُ تُرَابًا" },
        { pertanyaan: "Lanjutkan ayat jebakan ini: 'يَوْمَ لَا تَمْلِكُ نَفْسٌ لِنَفْسٍ شَيْئًا ۖ وَالْأَمْرُ يَوْمَئِذٍ لِلَّهِ'", opsi: ["(Ini adalah akhir surat)", "وَيْلٌ لِلْمُطَفِّفِينَ", "وَإِذَا السَّمَاءُ انْفَطَرَتْ", "إِنَّ الْأَبْرَارَ لَفِي نَعِيمٍ"], jawabanBenar: "(Ini adalah akhir surat)" },
        { pertanyaan: "Lanjutkan ayat jebakan 'Kalla' (Al-Mutaffifin): 'كَلَّا إِنَّ كِتَابَ الْأَبْرَارِ لَفِي عِلِّيِّينَ'", opsi: ["وَمَا أَدْرَاكَ مَا عِلِّيُّونَ", "كِتَابٌ مَرْقُومٌ", "يَشْهَدُهُ الْمُقَرَّبُونَ", "إِنَّ الْأَبْرَارَ لَفِي نَعِيمٍ"], jawabanBenar: "وَمَا أَدْرَاكَ مَا عِلِّيُّونَ" },
        { pertanyaan: "Lanjutkan urutan rima 'yoon/oon': 'وَمَا أَدْرَاكَ مَا عِلِّيُّونَ'", opsi: ["كِتَابٌ مَرْقُومٌ", "يَشْهَدُهُ الْمُقَرَّبُونَ", "إِنَّ الْأَبْرَارَ لَفِي نَعِيمٍ", "عَلَى الْأَرَائِكِ يَنْظُرُونَ"], jawabanBenar: "كِتَابٌ مَرْقُومٌ" },
        { pertanyaan: "Lanjutkan urutannya: 'كِتَابٌ مَرْقُومٌ'", opsi: ["يَشْهَدُهُ الْمُقَرَّبُونَ", "إِنَّ الْأَبْرَارَ لَفِي نَعِيمٍ", "عَلَى الْأَرَائِكِ يَنْظُرُونَ", "وَيْلٌ يَوْمَئِذٍ لِلْمُكَذِّبِينَ"], jawabanBenar: "يَشْهَدُهُ الْمُقَرَّبُونَ" },
        { pertanyaan: "Lanjutkan urutannya: 'يَشْهَدُهُ الْمُقَرَّبُونَ'", opsi: ["إِنَّ الْأَبْرَارَ لَفِي نَعِيمٍ", "عَلَى الْأَرَائِكِ يَنْظُرُونَ", "تَعْرِفُ فِي وُجُوهِهِمْ نَضْرَةَ النَّعِيمِ", "يُسْقَوْنَ مِنْ رَحِيقٍ مَخْتُومٍ"], jawabanBenar: "إِنَّ الْأَبْرَارَ لَفِي نَعِيمٍ" },
        { pertanyaan: "Hati-hati ayat panjang! Lanjutkan: 'يَوْمَ يَقُومُ الرُّوحُ وَالْمَلَائِكَةُ صَفًّا ۖ لَا يَتَكَلَّمُونَ إِلَّا مَنْ أَذِنَ لَهُ الرَّحْمَٰنُ وَقَالَ صَوَابًا'", opsi: ["ذَٰلِكَ الْيَوْمُ الْحَقُّ ۖ فَمَنْ شَاءَ اتَّخَذَ إِلَىٰ رَبِّهِ مَآبًا", "إِنَّا أَنْذَرْنَاكُمْ عَذَابًا قَرِيبًا", "يَوْمَ يَنْظُرُ الْمَرْءُ مَا قَدَّمَتْ يَدَاهُ", "رَبِّ السَّمَاوَاتِ وَالْأَرْضِ وَمَا بَيْنَهُمَا الرَّحْمَٰنِ"], jawabanBenar: "ذَٰلِكَ الْيَوْمُ الْحَقُّ ۖ فَمَنْ شَاءَ اتَّخَذَ إِلَىٰ رَبِّهِ مَآبًا" },
        { pertanyaan: "Lanjutkan ayat rima 'qoo' ini: 'فَأَنْبَتْنَا فِيهَا حَبًّا'", opsi: ["وَعِنَبًا وَقَضْبًا", "وَزَيْتُونًا وَنَخْلًا", "وَحَدَائِقَ غُلْبًا", "وَفَاكِهَةً وَأَبًّا"], jawabanBenar: "وَعِنَبًا وَقَضْبًا" },
        { pertanyaan: "Jangan sampai terbalik! Lanjutkan ayat: 'وَعِنَبًا وَقَضْبًا'", opsi: ["وَزَيْتُونًا وَنَخْلًا", "وَحَدَائِقَ غُلْبًا", "وَفَاكِهَةً وَأَبًّا", "مَتَاعًا لَكُمْ وَلِأَنْعَامِكُمْ"], jawabanBenar: "وَزَيْتُونًا وَنَخْلًا" },
        { pertanyaan: "Lanjutkan urutannya lagi: 'وَزَيْتُونًا وَنَخْلًا'", opsi: ["وَحَدَائِقَ غُلْبًا", "وَفَاكِهَةً وَأَبًّا", "مَتَاعًا لَكُمْ وَلِأَنْعَامِكُمْ", "فَإِذَا جَاءَتِ الصَّاخَّةُ"], jawabanBenar: "وَحَدَائِقَ غُلْبًا" },
        { pertanyaan: "Hati-hati ayat yang mirip di dua surat (Al-Fajr & Al-Balad). Lanjutkan ayat: 'وَتُحِبُّونَ الْمَالَ حُبًّا جَمًّا'", opsi: ["كَلَّا ۖ إِذَا دُكَّتِ الْأَرْضُ دَكًّا دَكًّا", "وَتَأْكُلُونَ التُّرَاثَ أَكْلًا لَمًّا", "وَلَا تَحَاضُّونَ عَلَىٰ طَعَامِ الْمِسْكِينِ", "يَقُولُ أَهْلَكْتُ مَالًا لُبَدًا"], jawabanBenar: "كَلَّا ۖ إِذَا دُكَّتِ الْأَرْضُ دَكًّا دَكًّا" },
        { pertanyaan: "Bandingkan dengan surat sebelumnya. Lanjutkan: 'كَلَّا ۖ بَلْ لَا تُكْرِمُونَ الْيَتِيمَ'", opsi: ["وَلَا تَحَاضُّونَ عَلَىٰ طَعَامِ الْمِسْكِينِ", "وَتَأْكُلُونَ التُّرَاثَ أَكْلًا لَمًّا", "وَتُحِبُّونَ الْمَالَ حُبًّا جَمًّا", "فَأَمَّا الْإِنْسَانُ إِذَا مَا ابْتَلَاهُ رَبُّهُ"], jawabanBenar: "وَلَا تَحَاضُّونَ عَلَىٰ طَعَامِ الْمِسْكِينِ" },
        { pertanyaan: "Lanjutkan ayat jebakan 'Tsumma' lagi: 'ثُمَّ لَتُسْأَلُنَّ يَوْمَئِذٍ عَنِ النَّعِيمِ'", opsi: ["(Ini adalah akhir surat)", "ثُمَّ كَلَّا سَوْفَ تَعْلَمُونَ", "كَلَّا لَوْ تَعْلَمُونَ عِلْمَ الْيَقِينِ", "لَتَرَوُنَّ الْجَحِيمَ"], jawabanBenar: "(Ini adalah akhir surat)" },
        { pertanyaan: "Lanjutkan ayat jebakan: 'وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ'", opsi: ["(Ini adalah akhir surat)", "لَمْ يَلِدْ وَلَمْ يُولَدْ", "اللَّهُ الصَّمَدُ", "مِنْ شَرِّ مَا خَلَقَ"], jawabanBenar: "(Ini adalah akhir surat)" },
        { pertanyaan: "Lanjutkan ayat rima 'aat': 'وَإِذَا الْمَوْءُودَةُ سُئِلَتْ'", opsi: ["بِأَيِّ ذَنْبٍ قُتِلَتْ", "وَإِذَا الصُّحُفُ نُشِرَتْ", "وَإِذَا السَّمَاءُ كُشِطَتْ", "وَإِذَا الْجَحِيمُ سُعِّرَتْ"], jawabanBenar: "بِأَيِّ ذَنْبٍ قُتِلَتْ" },
        { pertanyaan: "Lanjutkan urutannya: 'بِأَيِّ ذَنْبٍ قُتِلَتْ'", opsi: ["وَإِذَا الصُّحُفُ نُشِرَتْ", "وَإِذَا السَّمَاءُ كُشِطَتْ", "وَإِذَا الْجَحِيمُ سُعِّرَتْ", "وَإِذَا الْجَنَّةُ أُزْلِفَتْ"], jawabanBenar: "وَإِذَا الصُّحُفُ نُشِرَتْ" },
        { pertanyaan: "Lanjutkan urutannya: 'وَإِذَا الصُّحُفُ نُشِرَتْ'", opsi: ["وَإِذَا السَّمَاءُ كُشِطَتْ", "وَإِذَا الْجَحِيمُ سُعِّرَتْ", "وَإِذَا الْجَنَّةُ أُزْلِفَتْ", "عَلِمَتْ نَفْسٌ مَا أَحْضَرَتْ"], jawabanBenar: "وَإِذَا السَّمَاءُ كُشِطَتْ" },
        { pertanyaan: "Lanjutkan ayat: 'وَإِذَا السَّمَاءُ كُشِطَتْ'", opsi: ["وَإِذَا الْجَحِيمُ سُعِّرَتْ", "وَإِذَا الْجَنَّةُ أُزْلِفَتْ", "عَلِمَتْ نَفْسٌ مَا أَحْضَرَتْ", "فَلَا أُقْسِمُ بِالْخُنَّسِ"], jawabanBenar: "وَإِذَا الْجَحِيمُ سُعِّرَتْ" },
        { pertanyaan: "Lanjutkan ayat panjang: 'جَزَاؤُهُمْ عِنْدَ رَبِّهِمْ جَنَّاتُ عَدْنٍ تَجْرِي مِنْ تَحْتِهَا الْأَنْهَارُ خَالِدِينَ فِيهَا أَبَدًا ۖ'", opsi: ["رَضِيَ اللَّهُ عَنْهُمْ وَرَضُوا عَنْهُ ۚ ذَٰلِكَ لِمَنْ خَشِيَ رَبَّهُ", "أُولَٰئِكَ هُمْ خَيْرُ الْبَرِيَّةِ", "إِنَّ الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ", "ذَٰلِكَ دِينُ الْقَيِّمَةِ"], jawabanBenar: "رَضِيَ اللَّهُ عَنْهُمْ وَرَضُوا عَنْهُ ۚ ذَٰلِكَ لِمَنْ خَشِيَ رَبَّهُ" },
        { pertanyaan: "Lanjutkan ayat ini: 'وَمَا أُمِرُوا إِلَّا لِيَعْبُدُوا اللَّهَ مُخْلِصِينَ لَهُ الدِّينَ حُنَفَاءَ'", opsi: ["وَيُقِيمُوا الصَّلَاةَ وَيُؤْتُوا الزَّكَاةَ ۚ وَذَٰلِكَ دِينُ الْقَيِّمَةِ", "إِنَّ الَّذِينَ كَفَرُوا مِنْ أَهْلِ الْكِتَابِ", "فِيهَا كُتُبٌ قَيِّمَةٌ", "إِنَّ الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ"], jawabanBenar: "وَيُقِيمُوا الصَّلَاةَ وَيُؤْتُوا الزَّكَاةَ ۚ وَذَٰلِكَ دِينُ الْقَيِّمَةِ" }
    ]
};

const bankSoalJuz29 = {
    
    dasar: [
        { pertanyaan: "Lanjutkan ayat: 'تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ'", opsi: ["وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ", "الَّذِي خَلَقَ الْمَوْتَ وَالْحَيَاةَ", "وَهُوَ الْعَزِيزُ الْغَفُورُ", "مَا تَرَىٰ فِي خَلْقِ الرَّحْمَٰنِ مِن تَفَاوُتٍ"], jawabanBenar: "وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ" },
        { pertanyaan: "Lanjutkan ayat: 'وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ'", opsi: ["الَّذِي خَلَقَ الْمَوْتَ وَالْحَيَاةَ لِيَبْلُوَكُمْ أَيُّكُمْ أَحْسَنُ عَمَلًا ۚ", "الَّذِي خَلَقَ سَبْعَ سَمَاوَاتٍ طِبَاقًا ۖ", "وَلَقَدْ زَيَّنَّا السَّمَاءَ الدُّنْيَا بِمَصَابِيحَ", "الَّذِي جَعَلَ لَكُمُ الْأَرْضَ ذَلُولًا"], jawabanBenar: "الَّذِي خَلَقَ الْمَوْتَ وَالْحَيَاةَ لِيَبْلُوَكُمْ أَيُّكُمْ أَحْسَنُ عَمَلًا ۚ" },
        { pertanyaan: "Lanjutkan ayat: 'الَّذِي خَلَقَ الْمَوْتَ وَالْحَيَاةَ لِيَبْلُوَكُمْ أَيُّكُمْ أَحْسَنُ عَمَلًا ۚ'", opsi: ["وَهُوَ الْعَزِيزُ الْغَفُورُ", "الَّذِي خَلَقَ سَبْعَ سَمَاوَاتٍ طِبَاقًا ۖ", "مَا تَرَىٰ فِي خَلْقِ الرَّحْمَٰنِ مِن تَفَاوُتٍ", "هَلْ تَرَىٰ مِن فُطُورٍ"], jawabanBenar: "وَهُوَ الْعَزِيزُ الْغَفُورُ" },
        { pertanyaan: "Lanjutkan ayat: 'وَهُوَ الْعَزِيزُ الْغَفُورُ'", opsi: ["الَّذِي خَلَقَ سَبْعَ سَمَاوَاتٍ طِبَاقًا ۖ", "مَا تَرَىٰ فِي خَلْقِ الرَّحْمَٰنِ مِن تَفَاوُتٍ", "فَارْجِعِ الْبَصَرَ هَلْ تَرَىٰ مِن فُطُورٍ", "وَلَقَدْ زَيَّنَّا السَّمَاءَ الدُّنْيَا بِمَصَابِيحَ"], jawabanBenar: "الَّذِي خَلَقَ سَبْعَ سَمَاوَاتٍ طِبَاقًا ۖ" },
        { pertanyaan: "Lanjutkan ayat: 'الَّذِي خَلَقَ سَبْعَ سَمَاوَاتٍ طِبَاقًا ۖ'", opsi: ["مَا تَرَىٰ فِي خَلْقِ الرَّحْمَٰنِ مِن تَفَاوُتٍ ۖ فَارْجِعِ الْبَصَرَ هَلْ تَرَىٰ مِن فُطُورٍ", "ثُمَّ ارْجِعِ الْبَصَرَ كَرَّتَيْنِ", "يَنقَلِبْ إِلَيْكَ الْبَصَرُ خَاسِئًا وَهُوَ حَسِيرٌ", "وَلَقَدْ زَيَّنَّا السَّمَاءَ الدُّنْيَا بِمَصَابِيحَ"], jawabanBenar: "مَا تَرَىٰ فِي خَلْقِ الرَّحْمَٰنِ مِن تَفَاوُتٍ ۖ فَارْجِعِ الْبَصَرَ هَلْ تَرَىٰ مِن فُطُورٍ" },
        { pertanyaan: "Lanjutkan ayat: 'ثُمَّ ارْجِعِ الْبَصَرَ كَرَّتَيْنِ'", opsi: ["يَنقَلِبْ إِلَيْكَ الْبَصَرُ خَاسِئًا وَهُوَ حَسِيرٌ", "وَلَقَدْ زَيَّنَّا السَّمَاءَ الدُّنْيَا بِمَصَابِيحَ", "وَجَعَلْنَاهَا رُجُومًا لِّلشَّيَاطِينِ ۖ", "وَأَعْتَدْنَا لَهُمْ عَذَابَ السَّعِيرِ"], jawabanBenar: "يَنقَلِبْ إِلَيْكَ الْبَصَرُ خَاسِئًا وَهُوَ حَسِيرٌ" },
        { pertanyaan: "Lanjutkan ayat: 'ن ۚ وَالْقَلَمِ وَمَا يَسْطُرُونَ'", opsi: ["مَا أَنتَ بِنِعْمَةِ رَبِّكَ بِمَجْنُونٍ", "وَإِنَّ لَكَ لَأَجْرًا غَيْرَ مَمْنُونٍ", "وَإِنَّكَ لَعَلَىٰ خُلُقٍ عَظِيمٍ", "فَسَتُبْصِرُ وَيُبْصِرُونَ"], jawabanBenar: "مَا أَنتَ بِنِعْمَةِ رَبِّكَ بِمَجْنُونٍ" },
        { pertanyaan: "Lanjutkan ayat: 'مَا أَنتَ بِنِعْمَةِ رَبِّكَ بِمَجْنُونٍ'", opsi: ["وَإِنَّ لَكَ لَأَجْرًا غَيْرَ مَمْنُونٍ", "وَإِنَّكَ لَعَلَىٰ خُلُقٍ عَظِيمٍ", "فَسَتُبْصِرُ وَيُبْصِرُونَ", "بِأَييِّكُمُ الْمَفْتُونُ"], jawabanBenar: "وَإِنَّ لَكَ لَأَجْرًا غَيْرَ مَمْنُونٍ" },
        { pertanyaan: "Lanjutkan ayat: 'وَإِنَّ لَكَ لَأَجْرًا غَيْرَ مَمْنُونٍ'", opsi: ["وَإِنَّكَ لَعَلَىٰ خُلُقٍ عَظِيمٍ", "فَسَتُبْصِرُ وَيُبْصِرُونَ", "بِأَييِّكُمُ الْمَفْتُونُ", "إِنَّ رَبَّكَ هُوَ أَعْلَمُ بِمَن ضَلَّ عَن سَبِيلِهِ"], jawabanBenar: "وَإِنَّكَ لَعَلَىٰ خُلُقٍ عَظِيمٍ" },
        { pertanyaan: "Lanjutkan ayat: 'فَسَتُبْصِرُ وَيُبْصِرُونَ'", opsi: ["بِأَييِّكُمُ الْمَفْتُونُ", "إِنَّ رَبَّكَ هُوَ أَعْلَمُ بِمَن ضَلَّ عَن سَبِيلِهِ", "وَهُوَ أَعْلَمُ بِالْمُهْتَدِينَ", "فَلَا تُطِعِ الْمُكَذِّبِينَ"], jawabanBenar: "بِأَييِّكُمُ الْمَفْتُونُ" },
        { pertanyaan: "Lanjutkan ayat: 'الْحَاقَّةُ'", opsi: ["مَا الْحَاقَّةُ", "وَمَا أَدْرَاكَ مَا الْحَاقَّةُ", "كَذَّبَتْ ثَمُودُ وَعَادٌ بِالْقَارِعَةِ", "فَأَمَّا ثَمُودُ فَأُهْلِكُوا بِالطَّاغِيَةِ"], jawabanBenar: "مَا الْحَاقَّةُ" },
        { pertanyaan: "Lanjutkan ayat: 'مَا الْحَاقَّةُ'", opsi: ["وَمَا أَدْرَاكَ مَا الْحَاقَّةُ", "كَذَّبَتْ ثَمُودُ وَعَادٌ بِالْقَارِعَةِ", "فَأَمَّا ثَمُودُ فَأُهْلِكُوا بِالطَّاغِيَةِ", "وَأَمَّا عَادٌ فَأُهْلِكُوا بِرِيحٍ صَرْصَرٍ عَاتِيَةٍ"], jawabanBenar: "وَمَا أَدْرَاكَ مَا الْحَاقَّةُ" },
        { pertanyaan: "Lanjutkan ayat: 'كَذَّبَتْ ثَمُودُ وَعَادٌ بِالْقَارِعَةِ'", opsi: ["فَأَمَّا ثَمُودُ فَأُهْلِكُوا بِالطَّاغِيَةِ", "وَأَمَّا عَادٌ فَأُهْلِكُوا بِرِيحٍ صَرْصَرٍ عَاتِيَةٍ", "سَخَّرَهَا عَلَيْهِمْ سَبْعَ لَيَالٍ وَثَمَانِيَةَ أَيَّامٍ حُسُومًا", "فَتَرَى الْقَوْمَ فِيهَا صَرْعَىٰ كَأَنَّهُمْ أَعْجَازُ نَخْلٍ خَاوِيَةٍ"], jawabanBenar: "فَأَمَّا ثَمُودُ فَأُهْلِكُوا بِالطَّاغِيَةِ" },
        { pertanyaan: "Lanjutkan ayat: 'سَأَلَ سَائِلٌ بِعَذَابٍ وَاقِعٍ'", opsi: ["لِّلْكَافِرِينَ لَيْسَ لَهُ دَافِعٌ", "مِّنَ اللَّهِ ذِي الْمَعَارِجِ", "تَعْرُجُ الْمَلَائِكَةُ وَالرُّوحُ إِلَيْهِ", "فِي يَوْمٍ كَانَ مِقْدَارُهُ خَمْسِينَ أَلْفَ سَنَةٍ"], jawabanBenar: "لِّلْكَافِرِينَ لَيْسَ لَهُ دَافِعٌ" },
        { pertanyaan: "Lanjutkan ayat: 'لِّلْكَافِرِينَ لَيْسَ لَهُ دَافِعٌ'", opsi: ["مِّنَ اللَّهِ ذِي الْمَعَارِجِ", "تَعْرُجُ الْمَلَائِكَةُ وَالرُّوحُ إِلَيْهِ", "فِي يَوْمٍ كَانَ مِقْدَارُهُ خَمْسِينَ أَلْفَ سَنَةٍ", "فَاصْبِرْ صَبْرًا جَمِيلًا"], jawabanBenar: "مِّنَ اللَّهِ ذِي الْمَعَارِجِ" },
        { pertanyaan: "Lanjutkan ayat: 'مِّنَ اللَّهِ ذِي الْمَعَارِجِ'", opsi: ["تَعْرُجُ الْمَلَائِكَةُ وَالرُّوحُ إِلَيْهِ", "فِي يَوْمٍ كَانَ مِقْدَارُهُ خَمْسِينَ أَلْفَ سَنَةٍ", "فَاصْبِرْ صَبْرًا جَمِيلًا", "إِنَّهُمْ يَرَوْنَهُ بَعِيدًا"], jawabanBenar: "تَعْرُجُ الْمَلَائِكَةُ وَالرُّوحُ إِلَيْهِ" },
        { pertanyaan: "Lanjutkan ayat: 'تَعْرُجُ الْمَلَائِكَةُ وَالرُّوحُ إِلَيْهِ'", opsi: ["فِي يَوْمٍ كَانَ مِقْدَارُهُ خَمْسِينَ أَلْفَ سَنَةٍ", "فَاصْبِرْ صَبْرًا جَمِيلًا", "إِنَّهُمْ يَرَوْنَهُ بَعِيدًا", "وَنَرَاهُ قَرِيبًا"], jawabanBenar: "فِي يَوْمٍ كَانَ مِقْدَارُهُ خَمْسِينَ أَلْفَ سَنَةٍ" },
        { pertanyaan: "Lanjutkan ayat: 'فَاصْبِرْ صَبْرًا جَمِيلًا'", opsi: ["إِنَّهُمْ يَرَوْنَهُ بَعِيدًا", "وَنَرَاهُ قَرِيبًا", "يَوْمَ تَكُونُ السَّمَاءُ كَالْمُهْلِ", "وَتَكُونُ الْجِبَالُ كَالْعِهْنِ"], jawabanBenar: "إِنَّهُمْ يَرَوْنَهُ بَعِيدًا" },
        { pertanyaan: "Lanjutkan ayat: 'إِنَّا أَرْسَلْنَا نُوحًا إِلَىٰ قَوْمِهِ أَنْ أَنذِرْ قَوْمَكَ مِن قَبْلِ أَن يَأْتِيَهُمْ عَذَابٌ أَلِيمٌ'", opsi: ["قَالَ يَا قَوْمِ إِنِّي لَكُمْ نَذِيرٌ مُّبِينٌ", "أَنِ اعْبُدُوا اللَّهَ وَاتَّقُوهُ وَأَطِيعُونِ", "يَغْفِرْ لَكُم مِّن ذُنُوبِكُمْ", "وَيُؤَخِّرْكُمْ إِلَىٰ أَجَلٍ مُّسَمًّى ۚ"], jawabanBenar: "قَالَ يَا قَوْمِ إِنِّي لَكُمْ نَذِيرٌ مُّبِينٌ" },
        { pertanyaan: "Lanjutkan ayat: 'قَالَ يَا قَوْمِ إِنِّي لَكُمْ نَذِيرٌ مُّبِينٌ'", opsi: ["أَنِ اعْبُدُوا اللَّهَ وَاتَّقُوهُ وَأَطِيعُونِ", "يَغْفِرْ لَكُم مِّن ذُنُوبِكُمْ", "وَيُؤَخِّرْكُمْ إِلَىٰ أَجَلٍ مُّسَمًّى ۚ", "إِنَّ أَجَلَ اللَّهِ إِذَا جَاءَ لَا يُؤَخَّرُ ۖ لَوْ كُنتُمْ تَعْلَمُونَ"], jawabanBenar: "أَنِ اعْبُدُوا اللَّهَ وَاتَّقُوهُ وَأَطِيعُونِ" },
        { pertanyaan: "Lanjutkan ayat: 'أَنِ اعْبُدُوا اللَّهَ وَاتَّقُوهُ وَأَطِيعُونِ'", opsi: ["يَغْفِرْ لَكُم مِّن ذُنُوبِكُمْ وَيُؤَخِّرْكُمْ إِلَىٰ أَجَلٍ مُّسَمًّى ۚ", "إِنَّ أَجَلَ اللَّهِ إِذَا جَاءَ لَا يُؤَخَّرُ ۖ لَوْ كُنتُمْ تَعْلَمُونَ", "قَالَ رَبِّ إِنِّي دَعَوْتُ قَوْمِي لَيْلًا وَنَهَارًا", "فَلَمْ يَزِدْهُمْ دُعَائِي إِلَّا فِرَارًا"], jawabanBenar: "يَغْفِرْ لَكُم مِّن ذُنُوبِكُمْ وَيُؤَخِّرْكُمْ إِلَىٰ أَجَلٍ مُّسَمًّى ۚ" },
        { pertanyaan: "Lanjutkan ayat: 'قُلْ أُوحِيَ إِلَيَّ أَنَّهُ اسْتَمَعَ نَفَرٌ مِّنَ الْجِنِّ فَقَالُوا إِنَّا سَمِعْنَا قُرْآنًا عَجَبًا'", opsi: ["يَهْدِي إِلَى الرُّشْدِ فَآمَنَّا بِهِ ۖ وَلَن نُّشْرِكَ بِرَبِّنَا أَحَدًا", "وَأَنَّهُ تَعَالَىٰ جَدُّ رَبِّنَا مَا اتَّخَذَ صَاحِبَةً وَلَا وَلَدًا", "وَأَنَّهُ كَانَ يَقُولُ سَفِيهُنَا عَلَى اللَّهِ شَطَطًا", "وَأَنَّا ظَنَنَّا أَن لَّن تَقُولَ الْإِنسُ وَالْجِنُّ عَلَى اللَّهِ كَذِبًا"], jawabanBenar: "يَهْدِي إِلَى الرُّشْدِ فَآمَنَّا بِهِ ۖ وَلَن نُّشْرِكَ بِرَبِّنَا أَحَدًا" },
        { pertanyaan: "Lanjutkan ayat: 'يَهْدِي إِلَى الرُّشْدِ فَآمَنَّا بِهِ ۖ وَلَن نُّشْرِكَ بِرَبِّنَا أَحَدًا'", opsi: ["وَأَنَّهُ تَعَالَىٰ جَدُّ رَبِّنَا مَا اتَّخَذَ صَاحِبَةً وَلَا وَلَدًا", "وَأَنَّهُ كَانَ يَقُولُ سَفِيهُنَا عَلَى اللَّهِ شَطَطًا", "وَأَنَّا ظَنَنَّا أَن لَّن تَقُولَ الْإِنسُ وَالْجِنُّ عَلَى اللَّهِ كَذِبًا", "وَأَنَّهُ كَانَ رِجَالٌ مِّنَ الْإِنسِ يَعُوذُونَ بِرِجَالٍ مِّنَ الْجِنِّ"], jawabanBenar: "وَأَنَّهُ تَعَالَىٰ جَدُّ رَبِّنَا مَا اتَّخَذَ صَاحِبَةً وَلَا وَلَدًا" },
        { pertanyaan: "Lanjutkan ayat: 'يَا أَيُّهَا الْمُزَّمِّلُ'", opsi: ["قُمِ اللَّيْلَ إِلَّا قَلِيلًا", "نِّصْفَهُ أَوِ انقُصْ مِنْهُ قَلِيلًا", "أَوْ زِدْ عَلَيْهِ وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا", "إِنَّا سَنُلْقِي عَلَيْكَ قَوْلًا ثَقِيلًا"], jawabanBenar: "قُمِ اللَّيْلَ إِلَّا قَلِيلًا" },
        { pertanyaan: "Lanjutkan ayat: 'قُمِ اللَّيْلَ إِلَّا قَلِيلًا'", opsi: ["نِّصْفَهُ أَوِ انقُصْ مِنْهُ قَلِيلًا", "أَوْ زِدْ عَلَيْهِ وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا", "إِنَّا سَنُلْقِي عَلَيْكَ قَوْلًا ثَقِيلًا", "إِنَّ نَاشِئَةَ اللَّيْلِ هِيَ أَشَدُّ وَطْئًا وَأَقْوَمُ قِيلًا"], jawabanBenar: "نِّصْفَهُ أَوِ انقُصْ مِنْهُ قَلِيلًا" },
        { pertanyaan: "Lanjutkan ayat: 'أَوْ زِدْ عَلَيْهِ وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا'", opsi: ["إِنَّا سَنُلْقِي عَلَيْكَ قَوْلًا ثَقِيلًا", "إِنَّ نَاشِئَةَ اللَّيْلِ هِيَ أَشَدُّ وَطْئًا وَأَقْوَمُ قِيلًا", "إِنَّ لَكَ فِي النَّهَارِ سَبْحًا طَوِيلًا", "وَاذْكُرِ اسْمَ رَبِّكَ وَتَبَتَّلْ إِلَيْهِ تَبْتِيلًا"], jawabanBenar: "إِنَّا سَنُلْقِي عَلَيْكَ قَوْلًا ثَقِيلًا" },
        { pertanyaan: "Lanjutkan ayat: 'يَا أَيُّهَا الْمُدَّثِّرُ'", opsi: ["قُمْ فَأَنذِرْ", "وَرَبَّكَ فَكَبِّرْ", "وَثِيَابَكَ فَطَهِّرْ", "وَالرُّجْزَ فَاهْجُرْ"], jawabanBenar: "قُمْ فَأَنذِرْ" },
        { pertanyaan: "Lanjutkan ayat: 'قُمْ فَأَنذِرْ'", opsi: ["وَرَبَّكَ فَكَبِّرْ", "وَثِيَابَكَ فَطَهِّرْ", "وَالرُّجْزَ فَاهْجُرْ", "وَلَا تَمْنُن تَسْتَكْثِرُ"], jawabanBenar: "وَرَبَّكَ فَكَبِّرْ" },
        { pertanyaan: "Lanjutkan ayat: 'وَرَبَّكَ فَكَبِّرْ'", opsi: ["وَثِيَابَكَ فَطَهِّرْ", "وَالرُّجْزَ فَاهْجُرْ", "وَلَا تَمْنُن تَسْتَكْثِرُ", "وَلِرَبِّكَ فَاصْبِرْ"], jawabanBenar: "وَثِيَابَكَ فَطَهِّرْ" },
        { pertanyaan: "Lanjutkan ayat: 'وَثِيَابَكَ فَطَهِّرْ'", opsi: ["وَالرُّجْزَ فَاهْجُرْ", "وَلَا تَمْنُن تَسْتَكْثِرُ", "وَلِرَبِّكَ فَاصْبِرْ", "فَإِذَا نُقِرَ فِي النَّاقُورِ"], jawabanBenar: "وَالرُّجْزَ فَاهْجُرْ" },
        { pertanyaan: "Lanjutkan ayat: 'لَا أُقْسِمُ بِيَوْمِ الْقِيَامَةِ'", opsi: ["وَلَا أُقْسِمُ بِالنَّفْسِ اللَّوَّامَةِ", "أَيَحْسَبُ الْإِنسَانُ أَلَّن نَّجْمَعَ عِظَامَهُ", "بَلَىٰ قَادِرِينَ عَلَىٰ أَن نُّسَوِّيَ بَنَانَهُ", "بَلْ يُرِيدُ الْإِنسَانُ لِيَفْجُرَ أَمَامَهُ"], jawabanBenar: "وَلَا أُقْسِمُ بِالنَّفْسِ اللَّوَّامَةِ" },
        { pertanyaan: "Lanjutkan ayat: 'وَلَا أُقْسِمُ بِالنَّفْسِ اللَّوَّامَةِ'", opsi: ["أَيَحْسَبُ الْإِنسَانُ أَلَّن نَّجْمَعَ عِظَامَهُ", "بَلَىٰ قَادِرِينَ عَلَىٰ أَن نُّسَوِّيَ بَنَانَهُ", "بَلْ يُرِيدُ الْإِنسَانُ لِيَفْجُرَ أَمَامَهُ", "يَسْأَلُ أَيَّانَ يَوْمُ الْقِيَامَةِ"], jawabanBenar: "أَيَحْسَبُ الْإِنسَانُ أَلَّن نَّجْمَعَ عِظَامَهُ" },
        { pertanyaan: "Lanjutkan ayat: 'أَيَحْسَبُ الْإِنسَانُ أَلَّن نَّجْمَعَ عِظَامَهُ'", opsi: ["بَلَىٰ قَادِرِينَ عَلَىٰ أَن نُّسَوِّيَ بَنَانَهُ", "بَلْ يُرِيدُ الْإِنسَانُ لِيَفْجُرَ أَمَامَهُ", "يَسْأَلُ أَيَّانَ يَوْمُ الْقِيَامَةِ", "فَإِذَا بَرِقَ الْبَصَرُ"], jawabanBenar: "بَلَىٰ قَادِرِينَ عَلَىٰ أَن نُّسَوِّيَ بَنَانَهُ" },
        { pertanyaan: "Lanjutkan ayat: 'بَلَىٰ قَادِرِينَ عَلَىٰ أَن نُّسَوِّيَ بَنَانَهُ'", opsi: ["بَلْ يُرِيدُ الْإِنسَانُ لِيَفْجُرَ أَمَامَهُ", "يَسْأَلُ أَيَّانَ يَوْمُ الْقِيَامَةِ", "فَإِذَا بَرِقَ الْبَصَرُ", "وَخَسَفَ الْقَمَرُ"], jawabanBenar: "بَلْ يُرِيدُ الْإِنسَانُ لِيَفْجُرَ أَمَامَهُ" },
        { pertanyaan: "Lanjutkan ayat: 'هَلْ أَتَىٰ عَلَى الْإِنسَانِ حِينٌ مِّنَ الدَّهْرِ لَمْ يَكُن شَيْئًا مَّذْكُورًا'", opsi: ["إِنَّا خَلَقْنَا الْإِنسَانَ مِن نُّطْفَةٍ أَمْشَاجٍ نَّبْتَلِيهِ فَجَعَلْنَاهُ سَمِيعًا بَصِيرًا", "إِنَّا هَدَيْنَاهُ السَّبِيلَ إِمَّا شَاكِرًا وَإِمَّا كَفُورًا", "إِنَّا أَعْتَدْنَا لِلْكَافِرِينَ سَلَاسِلَ وَأَغْلَالًا وَسَعِيرًا", "إِنَّ الْأَبْرَارَ يَشْرَبُونَ مِن كَأْسٍ كَانَ مِزَاجُهَا كَافُورًا"], jawabanBenar: "إِنَّا خَلَقْنَا الْإِنسَانَ مِن نُّطْفَةٍ أَمْشَاجٍ نَّبْتَلِيهِ فَجَعَلْنَاهُ سَمِيعًا بَصِيرًا" },
        { pertanyaan: "Lanjutkan ayat: 'إِنَّا خَلَقْنَا الْإِنسَانَ مِن نُّطْفَةٍ أَمْشَاجٍ نَّبْتَلِيهِ فَجَعَلْنَاهُ سَمِيعًا بَصِيرًا'", opsi: ["إِنَّا هَدَيْنَاهُ السَّبِيلَ إِمَّا شَاكِرًا وَإِمَّا كَفُورًا", "إِنَّا أَعْتَدْنَا لِلْكَافِرِينَ سَلَاسِلَ وَأَغْلَالًا وَسَعِيرًا", "إِنَّ الْأَبْرَارَ يَشْرَبُونَ مِن كَأْسٍ كَانَ مِزَاجُهَا كَافُورًا", "عَيْنًا يَشْرَبُ بِهَا عِبَادُ اللَّهِ يُفَجِّرُونَهَا تَفْجِيرًا"], jawabanBenar: "إِنَّا هَدَيْنَاهُ السَّبِيلَ إِمَّا شَاكِرًا وَإِمَّا كَفُورًا" },
        { pertanyaan: "Lanjutkan ayat: 'إِنَّا هَدَيْنَاهُ السَّبِيلَ إِمَّا شَاكِرًا وَإِمَّا كَفُورًا'", opsi: ["إِنَّا أَعْتَدْنَا لِلْكَافِرِينَ سَلَاسِلَ وَأَغْلَالًا وَسَعِيرًا", "إِنَّ الْأَبْرَارَ يَشْرَبُونَ مِن كَأْسٍ كَانَ مِزَاجُهَا كَافُورًا", "عَيْنًا يَشْرَبُ بِهَا عِبَادُ اللَّهِ يُفَجِّرُونَهَا تَفْجِيرًا", "يُوفُونَ بِالنَّذْرِ وَيَخَافُونَ يَوْمًا كَانَ شَرُّهُ مُسْتَطِيرًا"], jawabanBenar: "إِنَّا أَعْتَدْنَا لِلْكَافِرِينَ سَلَاسِلَ وَأَغْلَالًا وَسَعِيرًا" },
        { pertanyaan: "Lanjutkan ayat: 'وَالْمُرْسَلَاتِ عُرْفًا'", opsi: ["فَالْعَاصِفَاتِ عَصْفًا", "وَالنَّاشِرَاتِ نَشْرًا", "فَالْفَارِقَاتِ فَرْقًا", "فَالْمُلْقِيَاتِ ذِكْرًا"], jawabanBenar: "فَالْعَاصِفَاتِ عَصْفًا" },
        { pertanyaan: "Lanjutkan ayat: 'فَالْعَاصِفَاتِ عَصْفًا'", opsi: ["وَالنَّاشِرَاتِ نَشْرًا", "فَالْفَارِقَاتِ فَرْقًا", "فَالْمُلْقِيَاتِ ذِكْرًا", "عُذْرًا أَوْ نُذْرًا"], jawabanBenar: "وَالنَّاشِرَاتِ نَشْرًا" },
        { pertanyaan: "Lanjutkan ayat: 'وَالنَّاشِرَاتِ نَشْرًا'", opsi: ["فَالْفَارِقَاتِ فَرْقًا", "فَالْمُلْقِيَاتِ ذِكْرًا", "عُذْرًا أَوْ نُذْرًا", "إِنَّمَا تُوعَدُونَ لَوَاقِعٌ"], jawabanBenar: "فَالْفَارِقَاتِ فَرْقًا" },
        { pertanyaan: "Lanjutkan ayat: 'فَالْفَارِقَاتِ فَرْقًا'", opsi: ["فَالْمُلْقِيَاتِ ذِكْرًا", "عُذْرًا أَوْ نُذْرًا", "إِنَّمَا تُوعَدُونَ لَوَاقِعٌ", "فَإِذَا النُّجُومُ طُمِسَتْ"], jawabanBenar: "فَالْمُلْقِيَاتِ ذِكْرًا" },
        { pertanyaan: "Lanjutkan ayat: 'فَالْمُلْقِيَاتِ ذِكْرًا'", opsi: ["عُذْرًا أَوْ نُذْرًا", "إِنَّمَا تُوعَدُونَ لَوَاقِعٌ", "فَإِذَا النُّجُومُ طُمِسَتْ", "وَإِذَا السَّمَاءُ فُرِجَتْ"], jawabanBenar: "عُذْرًا أَوْ نُذْرًا" },
        { pertanyaan: "Lanjutkan ayat: 'وَلَقَدْ زَيَّنَّا السَّمَاءَ الدُّنْيَا بِمَصَابِيحَ وَجَعَلْنَاهَا رُجُومًا لِّلشَّيَاطِينِ ۖ'", opsi: ["وَأَعْتَدْنَا لَهُمْ عَذَابَ السَّعِيرِ", "وَلِلَّذِينَ كَفَرُوا بِرَبِّهِمْ عَذَابُ جَهَنَّمَ ۖ", "إِذَا أُلْقُوا فِيهَا سَمِعُوا لَهَا شَهِيقًا وَهِيَ تَفُورُ", "تَكَادُ تَمَيَّزُ مِنَ الْغَيْظِ ۖ"], jawabanBenar: "وَأَعْتَدْنَا لَهُمْ عَذَابَ السَّعِيرِ" },
        { pertanyaan: "Lanjutkan ayat: 'تَكَادُ تَمَيَّزُ مِنَ الْغَيْظِ ۖ كُلَّمَا أُلْقِيَ فِيهَا فَوْجٌ سَأَلَهُمْ خَزَنَتُهَا'", opsi: ["أَلَمْ يَأْتِكُمْ نَذِيرٌ", "قَالُوا بَلَىٰ قَدْ جَاءَنَا نَذِيرٌ", "فَكَذَّبْنَا وَقُلْنَا مَا نَزَّلَ اللَّهُ مِن شَيْءٍ", "إِنْ أَنتُمْ إِلَّا فِي ضَلَالٍ كَبِيرٍ"], jawabanBenar: "أَلَمْ يَأْتِكُمْ نَذِيرٌ" },
        { pertanyaan: "Lanjutkan ayat: 'فَلَا تُطِعِ الْمُكَذِّبِينَ'", opsi: ["وَدُّوا لَوْ تُدْهِنُ فَيُدْهِنُونَ", "وَلَا تُطِعْ كُلَّ حَلَّافٍ مَّهِينٍ", "هَمَّازٍ مَّشَّاءٍ بِنَمِيمٍ", "مَّنَّاعٍ لِّلْخَيْرِ مُعْتَدٍ أَثِيمٍ"], jawabanBenar: "وَدُّوا لَوْ تُدْهِنُ فَيُدْهِنُونَ" },
        { pertanyaan: "Lanjutkan ayat: 'وَدُّوا لَوْ تُدْهِنُ فَيُدْهِنُونَ'", opsi: ["وَلَا تُطِعْ كُلَّ حَلَّافٍ مَّهِينٍ", "هَمَّازٍ مَّشَّاءٍ بِنَمِيمٍ", "مَّنَّاعٍ لِّلْخَيْرِ مُعْتَدٍ أَثِيمٍ", "عُتُلٍّ بَعْدَ ذَٰلِكَ زَنِيمٍ"], jawabanBenar: "وَلَا تُطِعْ كُلَّ حَلَّافٍ مَّهِينٍ" },
        { pertanyaan: "Lanjutkan ayat: 'يَوْمَ تَكُونُ السَّمَاءُ كَالْمُهْلِ'", opsi: ["وَتَكُونُ الْجِبَالُ كَالْعِهْنِ", "وَلَا يَسْأَلُ حَمِيمٌ حَمِيمًا", "يُبَصَّرُونَهُمْ ۚ يَوَدُّ الْمُجْرِمُ لَوْ يَفْتَدِي مِن عَذَابِ يَوْمِئِذٍ بِبَنِيهِ", "وَصَاحِبَتِهِ وَأَخِيهِ"], jawabanBenar: "وَتَكُونُ الْجِبَالُ كَالْعِهْنِ" },
        { pertanyaan: "Lanjutkan ayat: 'وَتَكُونُ الْجِبَالُ كَالْعِهْنِ'", opsi: ["وَلَا يَسْأَلُ حَمِيمٌ حَمِيمًا", "يُبَصَّرُونَهُمْ ۚ يَوَدُّ الْمُجْرِمُ لَوْ يَفْتَدِي مِن عَذَابِ يَوْمِئِذٍ بِبَنِيهِ", "وَصَاحِبَتِهِ وَأَخِيهِ", "وَفَصِيلَتِهِ الَّتِي تُؤْوِيهِ"], jawabanBenar: "وَلَا يَسْأَلُ حَمِيمٌ حَمِيمًا" },
        { pertanyaan: "Lanjutkan ayat: 'إِنَّا سَنُلْقِي عَلَيْكَ قَوْلًا ثَقِيلًا'", opsi: ["إِنَّ نَاشِئَةَ اللَّيْلِ هِيَ أَشَدُّ وَطْئًا وَأَقْوَمُ قِيلًا", "إِنَّ لَكَ فِي النَّهَارِ سَبْحًا طَوِيلًا", "وَاذْكُرِ اسْمَ رَبِّكَ وَتَبَتَّلْ إِلَيْهِ تَبْتِيلًا", "رَّبُّ الْمَشْرِقِ وَالْمَغْرِبِ لَا إِلَٰهَ إِلَّا هُوَ فَاتَّخِذْهُ وَكِيلًا"], jawabanBenar: "إِنَّ نَاشِئَةَ اللَّيْلِ هِيَ أَشَدُّ وَطْئًا وَأَقْوَمُ قِيلًا" },
        { pertanyaan: "Lanjutkan ayat: 'إِنَّ نَاشِئَةَ اللَّيْلِ هِيَ أَشَدُّ وَطْئًا وَأَقْوَمُ قِيلًا'", opsi: ["إِنَّ لَكَ فِي النَّهَارِ سَبْحًا طَوِيلًا", "وَاذْكُرِ اسْمَ رَبِّكَ وَتَبَتَّلْ إِلَيْهِ تَبْتِيلًا", "رَّبُّ الْمَشْرِقِ وَالْمَغْرِبِ لَا إِلَٰهَ إِلَّا هُوَ فَاتَّخِذْهُ وَكِيلًا", "وَاصْبِرْ عَلَىٰ مَا يَقُولُونَ وَاهْجُرْهُمْ هَجْرًا جَمِيلًا"], jawabanBenar: "إِنَّ لَكَ فِي النَّهَارِ سَبْحًا طَوِيلًا" },
        { pertanyaan: "Lanjutkan ayat: 'فَإِذَا بَرِقَ الْبَصَرُ'", opsi: ["وَخَسَفَ الْقَمَرُ", "وَجُمِعَ الشَّمْسُ وَالْقَمَرُ", "يَقُولُ الْإِنسَانُ يَوْمَئِذٍ أَيْنَ الْمَفَرُّ", "كَلَّا لَا وَزَرَ"], jawabanBenar: "وَخَسَفَ الْقَمَرُ" },
        { pertanyaan: "Lanjutkan ayat: 'وَخَسَفَ الْقَمَرُ'", opsi: ["وَجُمِعَ الشَّمْسُ وَالْقَمَرُ", "يَقُولُ الْإِنسَانُ يَوْمَئِذٍ أَيْنَ الْمَفَرُّ", "كَلَّا لَا وَزَرَ", "إِلَىٰ رَبِّكَ يَوْمَئِذٍ الْمُسْتَقَرُّ"], jawabanBenar: "وَجُمِعَ الشَّمْسُ وَالْقَمَرُ" },
        { pertanyaan: "Lanjutkan ayat: 'عَيْنًا يَشْرَبُ بِهَا عِبَادُ اللَّهِ يُفَجِّرُونَهَا تَفْجِيرًا'", opsi: ["يُوفُونَ بِالنَّذْرِ وَيَخَافُونَ يَوْمًا كَانَ شَرُّهُ مُسْتَطِيرًا", "وَيُطْعِمُونَ الطَّعَامَ عَلَىٰ حُبِّهِ مِسْكِينًا وَيَتِيمًا وَأَسِيرًا", "إِنَّمَا نُطْعِمُكُمْ لِوَجْهِ اللَّهِ لَا نُرِيدُ مِنكُمْ جَزَاءً وَلَا شُكُورًا", "إِنَّا نَخَافُ مِن رَّبِّنَا يَوْمًا عَبُوسًا قَمْطَرِيرًا"], jawabanBenar: "يُوفُونَ بِالنَّذْرِ وَيَخَافُونَ يَوْمًا كَانَ شَرُّهُ مُسْتَطِيرًا" },
        { pertanyaan: "Lanjutkan ayat: 'يُوفُونَ بِالنَّذْرِ وَيَخَافُونَ يَوْمًا كَانَ شَرُّهُ مُسْتَطِيرًا'", opsi: ["وَيُطْعِمُونَ الطَّعَامَ عَلَىٰ حُبِّهِ مِسْكِينًا وَيَتِيمًا وَأَسِيرًا", "إِنَّمَا نُطْعِمُكُمْ لِوَجْهِ اللَّهِ لَا نُرِيدُ مِنكُمْ جَزَاءً وَلَا شُكُورًا", "إِنَّا نَخَافُ مِن رَّبِّنَا يَوْمًا عَبُوسًا قَمْطَرِيرًا", "فَوَقَاهُمُ اللَّهُ شَرَّ ذَٰلِكَ الْيَوْمِ وَلَقَّاهُمْ نَضْرَةً وَسُرُورًا"], jawabanBenar: "وَيُطْعِمُونَ الطَّعَامَ عَلَىٰ حُبِّهِ مِسْكِينًا وَيَتِيمًا وَأَسِيرًا" },
        { pertanyaan: "Lanjutkan ayat: 'عُذْرًا أَوْ نُذْرًا'", opsi: ["إِنَّمَا تُوعَدُونَ لَوَاقِعٌ", "فَإِذَا النُّجُومُ طُمِسَتْ", "وَإِذَا السَّمَاءُ فُرِجَتْ", "وَإِذَا الْجِبَالُ نُسِفَتْ"], jawabanBenar: "إِنَّمَا تُوعَدُونَ لَوَاقِعٌ" },
        { pertanyaan: "Lanjutkan ayat: 'إِنَّمَا تُوعَدُونَ لَوَاقِعٌ'", opsi: ["فَإِذَا النُّجُومُ طُمِسَتْ", "وَإِذَا السَّمَاءُ فُرِجَتْ", "وَإِذَا الْجِبَالُ نُسِفَتْ", "وَإِذَا الرُّسُلُ أُقِّتَتْ"], jawabanBenar: "فَإِذَا النُّجُومُ طُمِسَتْ" },
        { pertanyaan: "Lanjutkan ayat: 'فَإِذَا النُّجُومُ طُمِسَتْ'", opsi: ["وَإِذَا السَّمَاءُ فُرِجَتْ", "وَإِذَا الْجِبَالُ نُسِفَتْ", "وَإِذَا الرُّسُلُ أُقِّتَتْ", "لِأَيِّ يَوْمٍ أُجِّلَتْ"], jawabanBenar: "وَإِذَا السَّمَاءُ فُرِجَتْ" },
        { pertanyaan: "Lanjutkan ayat: 'وَإِذَا السَّمَاءُ فُرِجَتْ'", opsi: ["وَإِذَا الْجِبَالُ نُسِفَتْ", "وَإِذَا الرُّسُلُ أُقِّتَتْ", "لِأَيِّ يَوْمٍ أُجِّلَتْ", "لِيَوْمِ الْفَصْلِ"], jawabanBenar: "وَإِذَا الْجِبَالُ نُسِفَتْ" },
        { pertanyaan: "Lanjutkan ayat: 'يَقُولُ أَهْلَكْتُ مَالًا لُبَدًا'", opsi: ["أَيَحْسَبُ أَن لَّمْ يَرَهُ أَحَدٌ", "أَلَمْ نَجْعَل لَّهُ عَيْنَيْنِ", "وَلِسَانًا وَشَفَتَيْنِ", "وَهَدَيْنَاهُ النَّجْدَيْنِ"], jawabanBenar: "أَيَحْسَبُ أَن لَّمْ يَرَهُ أَحَدٌ" },
        { pertanyaan: "Lanjutkan ayat: 'وَهَدَيْنَاهُ النَّجْدَيْنِ'", opsi: ["فَلَا اقْتَحَمَ الْعَقَبَةَ", "وَمَا أَدْرَاكَ مَا الْعَقَبَةُ", "فَكُّ رَقَبَةٍ", "أَوْ إِطْعَامٌ فِي يَوْمٍ ذِي مَسْغَبَةٍ"], jawabanBenar: "فَلَا اقْتَحَمَ الْعَقَبَةَ" },
        { pertanyaan: "Lanjutkan ayat: 'أَلَمْ يَجِدْكَ يَتِيمًا فَآوَىٰ'", opsi: ["وَوَجَدَكَ ضَالًّا فَهَدَىٰ", "وَوَجَدَكَ عَائِلًا فَأَغْنَىٰ", "فَأَمَّا الْيَتِيمَ فَلَا تَقْهَرْ", "وَأَمَّا السَّائِلَ فَلَا تَنْهَرْ"], jawabanBenar: "وَوَجَدَكَ ضَالًّا فَهَدَىٰ" },
        { pertanyaan: "Lanjutkan ayat: 'وَوَجَدَكَ ضَالًّا فَهَدَىٰ'", opsi: ["وَوَجَدَكَ عَائِلًا فَأَغْنَىٰ", "فَأَمَّا الْيَتِيمَ فَلَا تَقْهَرْ", "وَأَمَّا السَّائِلَ فَلَا تَنْهَرْ", "وَأَمَّا بِنِعْمَةِ رَبِّكَ فَحَدِّثْ"], jawabanBenar: "وَوَجَدَكَ عَائِلًا فَأَغْنَىٰ" },
        { pertanyaan: "Lanjutkan ayat: 'اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ'", opsi: ["خَلَقَ الْإِنسَانَ مِنْ عَلَقٍ", "اقْرَأْ وَرَبُّكَ الْأَكْرَمُ", "الَّذِي عَلَّمَ بِالْقَلَمِ", "عَلَّمَ الْإِنسَانَ مَا لَمْ يَعْلَمْ"], jawabanBenar: "خَلَقَ الْإِنسَانَ مِنْ عَلَقٍ" },
        { pertanyaan: "Lanjutkan ayat: 'إِنَّا أَنزَلْنَاهُ فِي لَيْلَةِ الْقَدْرِ'", opsi: ["وَمَا أَدْرَاكَ مَا لَيْلَةُ الْقَدْرِ", "لَيْلَةُ الْقَدْرِ خَيْرٌ مِّنْ أَلْفِ شَهْرٍ", "تَنَزَّلُ الْمَلَائِكَةُ وَالرُّوحُ فِيهَا بِإِذْنِ رَبِّهِم مِّن كُلِّ أَمْرٍ", "سَلَامٌ هِيَ حَتَّىٰ مَطْلَعِ الْفَجْرِ"], jawabanBenar: "وَمَا أَدْرَاكَ مَا لَيْلَةُ الْقَدْرِ" }
    ],
    menengah: [
        { pertanyaan: "Lanjutkan ayat: 'إِنَّ الَّذِينَ يَخْشَوْنَ رَبَّهُم بِالْغَيْبِ'", opsi: ["لَهُم مَّغْفِرَةٌ وَأَجْرٌ كَبِيرٌ", "وَأَسِرُّوا قَوْلَكُمْ أَوِ اجْهَرُوا بِهِ ۖ", "إِنَّهُ عَلِيمٌ بِذَاتِ الصُّدُورِ", "أَلَا يَعْلَمُ مَنْ خَلَقَ وَهُوَ اللَّطِيفُ الْخَبِيرُ"], jawabanBenar: "لَهُم مَّغْفِرَةٌ وَأَجْرٌ كَبِيرٌ" },
        { pertanyaan: "Lanjutkan ayat: 'وَأَسِرُّوا قَوْلَكُمْ أَوِ اجْهَرُوا بِهِ ۖ'", opsi: ["إِنَّهُ عَلِيمٌ بِذَاتِ الصُّدُورِ", "أَلَا يَعْلَمُ مَنْ خَلَقَ وَهُوَ اللَّطِيفُ الْخَبِيرُ", "هُوَ الَّذِي جَعَلَ لَكُمُ الْأَرْضَ ذَلُولًا", "فَامْشُوا فِي مَنَاكِبِهَا وَكُلُوا مِن رِّزْقِهِ ۖ"], jawabanBenar: "إِنَّهُ عَلِيمٌ بِذَاتِ الصُّدُورِ" },
        { pertanyaan: "Lanjutkan ayat: 'أَلَا يَعْلَمُ مَنْ خَلَقَ'", opsi: ["وَهُوَ اللَّطِيفُ الْخَبِيرُ", "هُوَ الَّذِي جَعَلَ لَكُمُ الْأَرْضَ ذَلُولًا", "أَأَمِنتُم مَّن فِي السَّمَاءِ أَن يَخْسِفَ بِكُمُ الْأَرْضَ", "أَمْ أَمِنتُم مَّن فِي السَّمَاءِ أَن يُرْسِلَ عَلَيْكُمْ حَاصِبًا ۖ"], jawabanBenar: "وَهُوَ اللَّطِيفُ الْخَبِيرُ" },
        { pertanyaan: "Lanjutkan ayat: 'هُوَ الَّذِي جَعَلَ لَكُمُ الْأَرْضَ ذَلُولًا فَامْشُوا فِي مَنَاكِبِهَا'", opsi: ["وَكُلُوا مِن رِّزْقِهِ ۖ وَإِلَيْهِ النُّشُورُ", "أَأَمِنتُم مَّن فِي السَّمَاءِ أَن يَخْسِفَ بِكُمُ الْأَرْضَ", "فَإِذَا هِيَ تَمُورُ", "أَمْ أَمِنتُم مَّن فِي السَّمَاءِ أَن يُرْسِلَ عَلَيْكُمْ حَاصِبًا ۖ"], jawabanBenar: "وَكُلُوا مِن رِّزْقِهِ ۖ وَإِلَيْهِ النُّشُورُ" },
        { pertanyaan: "Lanjutkan ayat: 'هَمَّازٍ مَّشَّاءٍ بِنَمِيمٍ'", opsi: ["مَّنَّاعٍ لِّلْخَيْرِ مُعْتَدٍ أَثِيمٍ", "عُتُلٍّ بَعْدَ ذَٰلِكَ زَنِيمٍ", "أَن كَانَ ذَا مَالٍ وَبَنِينَ", "إِذَا تُتْلَىٰ عَلَيْهِ آيَاتُنَا قَالَ أَسَاطِيرُ الْأَوَّلِينَ"], jawabanBenar: "مَّنَّاعٍ لِّلْخَيْرِ مُعْتَدٍ أَثِيمٍ" },
        { pertanyaan: "Lanjutkan ayat: 'مَّنَّاعٍ لِّلْخَيْرِ مُعْتَدٍ أَثِيمٍ'", opsi: ["عُتُلٍّ بَعْدَ ذَٰلِكَ زَنِيمٍ", "أَن كَانَ ذَا مَالٍ وَبَنِينَ", "إِذَا تُتْلَىٰ عَلَيْهِ آيَاتُنَا قَالَ أَسَاطِيرُ الْأَوَّلِينَ", "سَنَسِمُهُ عَلَى الْخُرْطُومِ"], jawabanBenar: "عُتُلٍّ بَعْدَ ذَٰلِكَ زَنِيمٍ" },
        { pertanyaan: "Lanjutkan ayat: 'عُتُلٍّ بَعْدَ ذَٰلِكَ زَنِيمٍ'", opsi: ["أَن كَانَ ذَا مَالٍ وَبَنِينَ", "إِذَا تُتْلَىٰ عَلَيْهِ آيَاتُنَا قَالَ أَسَاطِيرُ الْأَوَّلِينَ", "سَنَسِمُهُ عَلَى الْخُرْطُومِ", "إِنَّا بَلَوْنَاهُمْ كَمَا بَلَوْنَا أَصْحَابَ الْجَنَّةِ"], jawabanBenar: "أَن كَانَ ذَا مَالٍ وَبَنِينَ" },
        { pertanyaan: "Lanjutkan ayat: 'إِنَّا بَلَوْنَاهُمْ كَمَا بَلَوْنَا أَصْحَابَ الْجَنَّةِ إِذْ أَقْسَمُوا لَيَصْرِمُنَّهَا مُصْبِحِينَ'", opsi: ["وَلَا يَسْتَثْنُونَ", "فَطَافَ عَلَيْهَا طَائِفٌ مِّن رَّبِّكَ وَهُمْ نَائِمُونَ", "فَأَصْبَحَتْ كَالصَّرِيمِ", "فَتَنَادَوْا مُصْبِحِينَ"], jawabanBenar: "وَلَا يَسْتَثْنُونَ" },
        { pertanyaan: "Lanjutkan ayat: 'وَلَا يَسْتَثْنُونَ'", opsi: ["فَطَافَ عَلَيْهَا طَائِفٌ مِّن رَّبِّكَ وَهُمْ نَائِمُونَ", "فَأَصْبَحَتْ كَالصَّرِيمِ", "فَتَنَادَوْا مُصْبِحِينَ", "أَنِ اغْدُوا عَلَىٰ حَرْثِكُمْ إِن كُنتُمْ صَارِمِينَ"], jawabanBenar: "فَطَافَ عَلَيْهَا طَائِفٌ مِّن رَّبِّكَ وَهُمْ نَائِمُونَ" },
        { pertanyaan: "Lanjutkan ayat: 'فَطَافَ عَلَيْهَا طَائِفٌ مِّن رَّبِّكَ وَهُمْ نَائِمُونَ'", opsi: ["فَأَصْبَحَتْ كَالصَّرِيمِ", "فَتَنَادَوْا مُصْبِحِينَ", "أَنِ اغْدُوا عَلَىٰ حَرْثِكُمْ إِن كُنتُمْ صَارِمِينَ", "فَانطَلَقُوا وَهُمْ يَتَخَافَتُونَ"], jawabanBenar: "فَأَصْبَحَتْ كَالصَّرِيمِ" },
        { pertanyaan: "Lanjutkan ayat: 'فَأَصْبَحَتْ كَالصَّرِيمِ'", opsi: ["فَتَنَادَوْا مُصْبِحِينَ", "أَنِ اغْدُوا عَلَىٰ حَرْثِكُمْ إِن كُنتُمْ صَارِمِينَ", "فَانطَلَقُوا وَهُمْ يَتَخَافَتُونَ", "أَن لَّا يَدْخُلَنَّهَا الْيَوْمَ عَلَيْكُم مِّسْكِينٌ"], jawabanBenar: "فَتَنَادَوْا مُصْبِحِينَ" },
        { pertanyaan: "Lanjutkan ayat: 'فَهُوَ فِي عِيشَةٍ رَّاضِيَةٍ'", opsi: ["فِي جَنَّةٍ عَالِيَةٍ", "قُطُوفُهَا دَانِيَةٌ", "كُلُوا وَاشْرَبُوا هَنِيئًا بِمَا أَسْلَفْتُمْ فِي الْأَيَّامِ الْخَالِيَةِ", "وَأَمَّا مَنْ أُوتِيَ كِتَابَهُ بِشِمَالِهِ"], jawabanBenar: "فِي جَنَّةٍ عَالِيَةٍ" },
        { pertanyaan: "Lanjutkan ayat: 'فِي جَنَّةٍ عَالِيَةٍ'", opsi: ["قُطُوفُهَا دَانِيَةٌ", "كُلُوا وَاشْرَبُوا هَنِيئًا بِمَا أَسْلَفْتُمْ فِي الْأَيَّامِ الْخَالِيَةِ", "وَأَمَّا مَنْ أُوتِيَ كِتَابَهُ بِشِمَالِهِ فَيَقُولُ يَا لَيْتَنِي لَمْ أُوتَ كِتَابِيَهْ", "وَلَمْ أَدْرِ مَا حِسَابِيَهْ"], jawabanBenar: "قُطُوفُهَا دَانِيَةٌ" },
        { pertanyaan: "Lanjutkan ayat: 'يُبَصَّرُونَهُمْ ۚ يَوَدُّ الْمُجْرِمُ لَوْ يَفْتَدِي مِنْ عَذَابِ يَوْمِئِذٍ بِبَنِيهِ'", opsi: ["وَصَاحِبَتِهِ وَأَخِيهِ", "وَفَصِيلَتِهِ الَّتِي تُؤْوِيهِ", "وَمَن فِي الْأَرْضِ جَمِيعًا ثُمَّ يُنجِيهِ", "كَلَّا ۖ إِنَّهَا لَظَىٰ"], jawabanBenar: "وَصَاحِبَتِهِ وَأَخِيهِ" },
        { pertanyaan: "Lanjutkan ayat: 'وَصَاحِبَتِهِ وَأَخِيهِ'", opsi: ["وَفَصِيلَتِهِ الَّتِي تُؤْوِيهِ", "وَمَن فِي الْأَرْضِ جَمِيعًا ثُمَّ يُنجِيهِ", "كَلَّا ۖ إِنَّهَا لَظَىٰ", "نَزَّاعَةً لِّلشَّوَىٰ"], jawabanBenar: "وَفَصِيلَتِهِ الَّتِي تُؤْوِيهِ" },
        { pertanyaan: "Lanjutkan ayat: 'وَفَصِيلَتِهِ الَّتِي تُؤْوِيهِ'", opsi: ["وَمَن فِي الْأَرْضِ جَمِيعًا ثُمَّ يُنجِيهِ", "كَلَّا ۖ إِنَّهَا لَظَىٰ", "نَزَّاعَةً لِّلشَّوَىٰ", "تَدْعُو مَنْ أَدْبَرَ وَتَوَلَّىٰ"], jawabanBenar: "وَمَن فِي الْأَرْضِ جَمِيعًا ثُمَّ يُنجِيهِ" },
        { pertanyaan: "Lanjutkan ayat: 'فَقُلْتُ اسْتَغْفِرُوا رَبَّكُمْ إِنَّهُ كَانَ غَفَّارًا'", opsi: ["يُرْسِلِ السَّمَاءَ عَلَيْكُم مِّدْرَارًا", "وَيُمْدِدْكُم بِأَمْوَالٍ وَبَنِينَ", "وَيَجْعَل لَّكُمْ جَنَّاتٍ وَيَجْعَل لَّكُمْ أَنْهَارًا", "مَّا لَكُمْ لَا تَرْجُونَ لِلَّهِ وَقَارًا"], jawabanBenar: "يُرْسِلِ السَّمَاءَ عَلَيْكُم مِّدْرَارًا" },
        { pertanyaan: "Lanjutkan ayat: 'يُرْسِلِ السَّمَاءَ عَلَيْكُم مِّدْرَارًا'", opsi: ["وَيُمْدِدْكُم بِأَمْوَالٍ وَبَنِينَ وَيَجْعَل لَّكُمْ جَنَّاتٍ وَيَجْعَل لَّكُمْ أَنْهَارًا", "مَّا لَكُمْ لَا تَرْجُونَ لِلَّهِ وَقَارًا", "وَقَدْ خَلَقَكُمْ أَطْوَارًا", "أَلَمْ تَرَوْا كَيْفَ خَلَقَ اللَّهُ سَبْعَ سَمَاوَاتٍ طِبَاقًا"], jawabanBenar: "وَيُمْدِدْكُم بِأَمْوَالٍ وَبَنِينَ وَيَجْعَل لَّكُمْ جَنَّاتٍ وَيَجْعَل لَّكُمْ أَنْهَارًا" },
        { pertanyaan: "Lanjutkan ayat: 'وَأَنَّا مِنَّا الْمُسْلِمُونَ وَمِنَّا الْقَاسِطُونَ ۖ فَمَنْ أَسْلَمَ'", opsi: ["فَأُولَٰئِكَ تَحَرَّوْا رَشَدًا", "وَأَمَّا الْقَاسِطُونَ فَكَانُوا لِجَهَنَّمَ حَطَبًا", "وَأَلَّوِ اسْتَقَامُوا عَلَى الطَّرِيقَةِ لَأَسْقَيْنَاهُم مَّاءً غَدَقًا", "لِّنَفْتِنَهُمْ فِيهِ ۚ"], jawabanBenar: "فَأُولَٰئِكَ تَحَرَّوْا رَشَدًا" },
        { pertanyaan: "Lanjutkan ayat: 'فَأُولَٰئِكَ تَحَرَّوْا رَشَدًا'", opsi: ["وَأَمَّا الْقَاسِطُونَ فَكَانُوا لِجَهَنَّمَ حَطَبًا", "وَأَلَّوِ اسْتَقَامُوا عَلَى الطَّرِيقَةِ لَأَسْقَيْنَاهُم مَّاءً غَدَقًا", "لِّنَفْتِنَهُمْ فِيهِ ۚ", "وَمَن يُعْرِضْ عَن ذِكْرِ رَبِّهِ يَسْلُكْهُ عَذَابًا صَعَدًا"], jawabanBenar: "وَأَمَّا الْقَاسِطُونَ فَكَانُوا لِجَهَنَّمَ حَطَبًا" },
        { pertanyaan: "Lanjutkan ayat: 'إِنَّ لَدَيْنَا أَنكَالًا وَجَحِيمًا'", opsi: ["وَطَعَامًا ذَا غُصَّةٍ وَعَذَابًا أَلِيمًا", "يَوْمَ تَرْجُفُ الْأَرْضُ وَالْجِبَالُ وَكَانَتِ الْجِبَالُ كَثِيبًا مَّهِيلًا", "إِنَّا أَرْسَلْنَا إِلَيْكُمْ رَسُولًا شَاهِدًا عَلَيْكُمْ", "كَمَا أَرْسَلْنَا إِلَىٰ فِرْعَوْنَ رَسُولًا"], jawabanBenar: "وَطَعَامًا ذَا غُصَّةٍ وَعَذَابًا أَلِيمًا" },
        { pertanyaan: "Lanjutkan ayat: 'وَطَعَامًا ذَا غُصَّةٍ وَعَذَابًا أَلِيمًا'", opsi: ["يَوْمَ تَرْجُفُ الْأَرْضُ وَالْجِبَالُ وَكَانَتِ الْجِبَالُ كَثِيبًا مَّهِيلًا", "إِنَّا أَرْسَلْنَا إِلَيْكُمْ رَسُولًا شَاهِدًا عَلَيْكُمْ", "كَمَا أَرْسَلْنَا إِلَىٰ فِرْعَوْنَ رَسُولًا", "فَعَصَىٰ فِرْعَوْنُ الرَّسُولَ فَأَخَذْنَاهُ أَخْذًا وَبِيلًا"], jawabanBenar: "يَوْمَ تَرْجُفُ الْأَرْضُ وَالْجِبَالُ وَكَانَتِ الْجِبَالُ كَثِيبًا مَّهِيلًا" },
        { pertanyaan: "Lanjutkan ayat: 'سَأُصْلِيهِ سَقَرَ'", opsi: ["وَمَا أَدْرَاكَ مَا سَقَرُ", "لَا تُبْقِي وَلَا تَذَرُ", "لَوَّاحَةٌ لِّلْبَشَرِ", "عَلَيْهَا تِسْعَةَ عَشَرَ"], jawabanBenar: "وَمَا أَدْرَاكَ مَا سَقَرُ" },
        { pertanyaan: "Lanjutkan ayat: 'وَمَا أَدْرَاكَ مَا سَقَرُ'", opsi: ["لَا تُبْقِي وَلَا تَذَرُ", "لَوَّاحَةٌ لِّلْبَشَرِ", "عَلَيْهَا تِسْعَةَ عَشَرَ", "وَمَا جَعَلْنَا أَصْحَابَ النَّارِ إِلَّا مَلَائِكَةً ۙ"], jawabanBenar: "لَا تُبْقِي وَلَا تَذَرُ" },
        { pertanyaan: "Lanjutkan ayat: 'لَا تُبْقِي وَلَا تَذَرُ'", opsi: ["لَوَّاحَةٌ لِّلْبَشَرِ", "عَلَيْهَا تِسْعَةَ عَشَرَ", "وَمَا جَعَلْنَا أَصْحَابَ النَّارِ إِلَّا مَلَائِكَةً ۙ", "كَلَّا وَالْقَمَرِ"], jawabanBenar: "لَوَّاحَةٌ لِّلْبَشَرِ" },
        { pertanyaan: "Lanjutkan ayat: 'وُجُوهٌ يَوْمَئِذٍ نَّاضِرَةٌ'", opsi: ["إِلَىٰ رَبِّهَا نَاظِرَةٌ", "وَوُجُوهٌ يَوْمَئِذٍ بَاسِرَةٌ", "تَظُنُّ أَن يُفْعَلَ بِهَا فَاقِرَةٌ", "كَلَّا إِذَا بَلَغَتِ التَّرَاقِيَ"], jawabanBenar: "إِلَىٰ رَبِّهَا نَاظِرَةٌ" },
        { pertanyaan: "Lanjutkan ayat: 'إِلَىٰ رَبِّهَا نَاظِرَةٌ'", opsi: ["وَوُجُوهٌ يَوْمَئِذٍ بَاسِرَةٌ", "تَظُنُّ أَن يُفْعَلَ بِهَا فَاقِرَةٌ", "كَلَّا إِذَا بَلَغَتِ التَّرَاقِيَ", "وَقِيلَ مَنْ ۜ رَاقٍ"], jawabanBenar: "وَوُجُوهٌ يَوْمَئِذٍ بَاسِرَةٌ" },
        { pertanyaan: "Lanjutkan ayat: 'وَوُجُوهٌ يَوْمَئِذٍ بَاسِرَةٌ'", opsi: ["تَظُنُّ أَن يُفْعَلَ بِهَا فَاقِرَةٌ", "كَلَّا إِذَا بَلَغَتِ التَّرَاقِيَ", "وَقِيلَ مَنْ ۜ رَاقٍ", "وَظَنَّ أَنَّهُ الْفِرَاقُ"], jawabanBenar: "تَظُنُّ أَن يُفْعَلَ بِهَا فَاقِرَةٌ" },
        { pertanyaan: "Lanjutkan ayat: 'وَيُطْعِمُونَ الطَّعَامَ عَلَىٰ حُبِّهِ مِسْكِينًا وَيَتِيمًا وَأَسِيرًا'", opsi: ["إِنَّمَا نُطْعِمُكُمْ لِوَجْهِ اللَّهِ لَا نُرِيدُ مِنكُمْ جَزَاءً وَلَا شُكُورًا", "إِنَّا نَخَافُ مِن رَّبِّنَا يَوْمًا عَبُوسًا قَمْطَرِيرًا", "فَوَقَاهُمُ اللَّهُ شَرَّ ذَٰلِكَ الْيَوْمِ وَلَقَّاهُمْ نَضْرَةً وَسُرُورًا", "وَجَزَاهُم بِمَا صَبَرُوا جَنَّةً وَحَرِيرًا"], jawabanBenar: "إِنَّمَا نُطْعِمُكُمْ لِوَجْهِ اللَّهِ لَا نُرِيدُ مِنكُمْ جَزَاءً وَلَا شُكُورًا" },
        { pertanyaan: "Lanjutkan ayat: 'إِنَّمَا نُطْعِمُكُمْ لِوَجْهِ اللَّهِ لَا نُرِيدُ مِنكُمْ جَزَاءً وَلَا شُكُورًا'", opsi: ["إِنَّا نَخَافُ مِن رَّبِّنَا يَوْمًا عَبُوسًا قَمْطَرِيرًا", "فَوَقَاهُمُ اللَّهُ شَرَّ ذَٰلِكَ الْيَوْمِ وَلَقَّاهُمْ نَضْرَةً وَسُرُورًا", "وَجَزَاهُم بِمَا صَبَرُوا جَنَّةً وَحَرِيرًا", "مُّتَّكِئِينَ فِيهَا عَلَى الْأَرَائِكِ ۖ"], jawabanBenar: "إِنَّا نَخَافُ مِن رَّبِّنَا يَوْمًا عَبُوسًا قَمْطَرِيرًا" },
        { pertanyaan: "Lanjutkan ayat: 'إِنَّا نَخَافُ مِن رَّبِّنَا يَوْمًا عَبُوسًا قَمْطَرِيرًا'", opsi: ["فَوَقَاهُمُ اللَّهُ شَرَّ ذَٰلِكَ الْيَوْمِ وَلَقَّاهُمْ نَضْرَةً وَسُرُورًا", "وَجَزَاهُم بِمَا صَبَرُوا جَنَّةً وَحَرِيرًا", "مُّتَّكِئِينَ فِيهَا عَلَى الْأَرَائِكِ ۖ", "لَا يَرَوْنَ فِيهَا شَمْسًا وَلَا زَمْهَرِيرًا"], jawabanBenar: "فَوَقَاهُمُ اللَّهُ شَرَّ ذَٰلِكَ الْيَوْمِ وَلَقَّاهُمْ نَضْرَةً وَسُرُورًا" },
        { pertanyaan: "Lanjutkan ayat: 'إِنَّ الْمُتَّقِينَ فِي ظِلَالٍ وَعُيُونٍ'", opsi: ["وَفَوَاكِهَ مِمَّا يَشْتَهُونَ", "كُلُوا وَاشْرَبُوا هَنِيئًا بِمَا كُنتُمْ تَعْمَلُونَ", "إِنَّا كَذَٰلِكَ نَجْزِي الْمُحْسِنِينَ", "وَيْلٌ يَوْمَئِذٍ لِّلْمُكَذِّبِينَ"], jawabanBenar: "وَفَوَاكِهَ مِمَّا يَشْتَهُونَ" },
        { pertanyaan: "Lanjutkan ayat: 'وَفَوَاكِهَ مِمَّا يَشْتَهُونَ'", opsi: ["كُلُوا وَاشْرَبُوا هَنِيئًا بِمَا كُنتُمْ تَعْمَلُونَ", "إِنَّا كَذَٰلِكَ نَجْزِي الْمُحْسِنِينَ", "وَيْلٌ يَوْمَئِذٍ لِّلْمُكَذِّبِينَ", "كُلُوا وَتَمَتَّعُوا قَلِيلًا إِنَّكُم مُّجْرِمُونَ"], jawabanBenar: "كُلُوا وَاشْرَبُوا هَنِيئًا بِمَا كُنتُمْ تَعْمَلُونَ" },
        { pertanyaan: "Lanjutkan ayat: 'كُلُوا وَاشْرَبُوا هَنِيئًا بِمَا كُنتُمْ تَعْمَلُونَ'", opsi: ["إِنَّا كَذَٰلِكَ نَجْزِي الْمُحْسِنِينَ", "وَيْلٌ يَوْمَئِذٍ لِّلْمُكَذِّبِينَ", "كُلُوا وَتَمَتَّعُوا قَلِيلًا إِنَّكُم مُّجْرِمُونَ", "وَإِذَا قِيلَ لَهُمُ ارْكَعُوا لَا يَرْكَعُونَ"], jawabanBenar: "إِنَّا كَذَٰلِكَ نَجْزِي الْمُحْسِنِينَ" }
    ],
    lanjut: [
        { pertanyaan: "Ayat ini punya akhiran yang menjebak. Lanjutkan ayat: 'فَمَن يَأْتِيكُم بِمَاءٍ مَّعِينٍ'", opsi: ["(Ini adalah akhir surat)", "مِن مَّاءٍ مَّهِينٍ", "فَجَعَلْنَاهُ فِي قَرَارٍ مَّكِينٍ", "أَلَمْ نَخْلُقكُّم مِّن مَّاءٍ مَّهِينٍ"], jawabanBenar: "(Ini adalah akhir surat)" },
        { pertanyaan: "Perhatikan kata 'Wa-amma'. Lanjutkan ayat: 'وَأَمَّا مَنْ أُوتِيَ كِتَابَهُ بِشِمَالِهِ فَيَقُولُ يَا لَيْتَنِي لَمْ أُوتَ كِتَابِيَهْ'", opsi: ["وَلَمْ أَدْرِ مَا حِسَابِيَهْ", "يَا لَيْتَهَا كَانَتِ الْقَاضِيَةَ", "مَا أَغْنَىٰ عَنِّي مَالِيَهْ ۜ", "هَلَكَ عَنِّي سُلْطَانِيَهْ"], jawabanBenar: "وَلَمْ أَدْرِ مَا حِسَابِيَهْ" },
        { pertanyaan: "Lanjutkan urutannya: 'وَلَمْ أَدْرِ مَا حِسَابِيَهْ'", opsi: ["يَا لَيْتَهَا كَانَتِ الْقَاضِيَةَ", "مَا أَغْنَىٰ عَنِّي مَالِيَهْ ۜ", "هَلَكَ عَنِّي سُلْطَانِيَهْ", "خُذُوهُ فَغُلُّوهُ"], jawabanBenar: "يَا لَيْتَهَا كَانَتِ الْقَاضِيَةَ" },
        { pertanyaan: "Lanjutkan urutannya: 'يَا لَيْتَهَا كَانَتِ الْقَاضِيَةَ'", opsi: ["مَا أَغْنَىٰ عَنِّي مَالِيَهْ ۜ", "هَلَكَ عَنِّي سُلْطَانِيَهْ", "خُذُوهُ فَغُلُّوهُ", "ثُمَّ الْجَحِيمَ صَلُّوهُ"], jawabanBenar: "مَا أَغْنَىٰ عَنِّي مَالِيَهْ ۜ" },
        { pertanyaan: "Lanjutkan urutannya: 'مَا أَغْنَىٰ عَنِّي مَالِيَهْ ۜ'", opsi: ["هَلَكَ عَنِّي سُلْطَانِيَهْ", "خُذُوهُ فَغُلُّوهُ", "ثُمَّ الْجَحِيمَ صَلُّوهُ", "ثُمَّ فِي سِلْسِلَةٍ ذَرْعُهَا سَبْعُونَ ذِرَاعًا فَاسْلُكُوهُ"], jawabanBenar: "هَلَكَ عَنِّي سُلْطَانِيَهْ" },
        { pertanyaan: "Lanjutkan urutannya! 'هَلَكَ عَنِّي سُلْطَانِيَهْ'", opsi: ["خُذُوهُ فَغُلُّوهُ", "ثُمَّ الْجَحِيمَ صَلُّوهُ", "ثُمَّ فِي سِلْسِلَةٍ ذَرْعُهَا سَبْعُونَ ذِرَاعًا فَاسْلُكُوهُ", "إِنَّهُ كَانَ لَا يُؤْمِنُ بِاللَّهِ الْعَظِيمِ"], jawabanBenar: "خُذُوهُ فَغُلُّوهُ" },
        { pertanyaan: "Hati-hati rima 'Tsumma' ini! Lanjutkan: 'خُذُوهُ فَغُلُّوهُ'", opsi: ["ثُمَّ الْجَحِيمَ صَلُّوهُ", "ثُمَّ فِي سِلْسِلَةٍ ذَرْعُهَا سَبْعُونَ ذِرَاعًا فَاسْلُكُوهُ", "إِنَّهُ كَانَ لَا يُؤْمِنُ بِاللَّهِ الْعَظِيمِ", "وَلَا يَحُضُّ عَلَىٰ طَعَامِ الْمِسْكِينِ"], jawabanBenar: "ثُمَّ الْجَحِيمَ صَلُّوهُ" },
        { pertanyaan: "Lanjutkan rima 'Tsumma' lagi: 'ثُمَّ الْجَحِيمَ صَلُّوهُ'", opsi: ["ثُمَّ فِي سِلْسِلَةٍ ذَرْعُهَا سَبْعُونَ ذِرَاعًا فَاسْلُكُوهُ", "إِنَّهُ كَانَ لَا يُؤْمِنُ بِاللَّهِ الْعَظِيمِ", "وَلَا يَحُضُّ عَلَىٰ طَعَامِ الْمِسْكِينِ", "فَلَيْسَ لَهُ الْيَوْمَ هَاهُنَا حَمِيمٌ"], jawabanBenar: "ثُمَّ فِي سِلْسِلَةٍ ذَرْعُهَا سَبْعُونَ ذِرَاعًا فَاسْلُكُوهُ" },
        { pertanyaan: "Ayat ini punya rima 'Kalla' yang bisa tertukar. Lanjutkan: 'كَلَّا ۖ إِنَّهَا لَظَىٰ'", opsi: ["نَزَّاعَةً لِّلشَّوَىٰ", "تَدْعُو مَنْ أَدْبَرَ وَتَوَلَّىٰ", "وَجَمَعَ فَأَوْعَىٰ ۙ", "إِنَّ الْإِنسَانَ خُلِقَ هَلُوعًا"], jawabanBenar: "نَزَّاعَةً لِّلشَّوَىٰ" },
        { pertanyaan: "Lanjutkan urutannya: 'نَزَّاعَةً لِّلشَّوَىٰ'", opsi: ["تَدْعُو مَنْ أَدْبَرَ وَتَوَلَّىٰ", "وَجَمَعَ فَأَوْعَىٰ ۙ", "إِنَّ الْإِنسَانَ خُلِقَ هَلُوعًا", "إِذَا مَسَّهُ الشَّرُّ جَزُوعًا"], jawabanBenar: "تَدْعُو مَنْ أَدْبَرَ وَتَوَلَّىٰ" },
        { pertanyaan: "Lanjutkan ayat jebakan 'Kalla' di surat yang lain: 'كَلَّا ۖ بَل لَّا يَخَافُونَ الْآخِرَةَ'", opsi: ["كَلَّا إِنَّهُ تَذْكِرَةٌ", "فَمَن شَاءَ ذَكَرَهُ", "وَمَا يَذْكُرُونَ إِلَّا أَن يَشَاءَ اللَّهُ", "هُوَ أَهْلُ التَّقْوَىٰ وَأَهْلُ الْمَغْفِرَةِ"], jawabanBenar: "كَلَّا إِنَّهُ تَذْكِرَةٌ" },
        { pertanyaan: "Lanjutkan urutannya: 'كَلَّا إِنَّهُ تَذْكِرَةٌ'", opsi: ["فَمَن شَاءَ ذَكَرَهُ", "وَمَا يَذْكُرُونَ إِلَّا أَن يَشَاءَ اللَّهُ", "هُوَ أَهْلُ التَّقْوَىٰ وَأَهْلُ الْمَغْفِرَةِ", "كَلَّا بَلْ تُحِبُّونَ الْعَاجِلَةَ"], jawabanBenar: "فَمَن شَاءَ ذَكَرَهُ" },
        { pertanyaan: "Jangan tertukar dengan ayat surat Al-Insan! Lanjutkan ini: 'فَمَن شَاءَ ذَكَرَهُ'", opsi: ["وَمَا يَذْكُرُونَ إِلَّا أَن يَشَاءَ اللَّهُ ۚ هُوَ أَهْلُ التَّقْوَىٰ وَأَهْلُ الْمَغْفِرَةِ", "وَمَا تَشَاءُونَ إِلَّا أَن يَشَاءَ اللَّهُ ۚ إِنَّ اللَّهَ كَانَ عَلِيمًا حَكِيمًا", "إِنَّ هَٰذِهِ تَذْكِرَةٌ ۖ فَمَن شَاءَ اتَّخَذَ إِلَىٰ رَبِّهِ سَبِيلًا", "فَمَن شَاءَ اتَّخَذَ إِلَىٰ رَبِّهِ سَبِيلًا"], jawabanBenar: "وَمَا يَذْكُرُونَ إِلَّا أَن يَشَاءَ اللَّهُ ۚ هُوَ أَهْلُ التَّقْوَىٰ وَأَهْلُ الْمَغْفِرَةِ" },
        { pertanyaan: "Nah, sekarang lanjutkan ayat ini: 'إِنَّ هَٰذِهِ تَذْكِرَةٌ ۖ فَمَن شَاءَ اتَّخَذَ إِلَىٰ رَبِّهِ سَبِيلًا'", opsi: ["وَمَا تَشَاءُونَ إِلَّا أَن يَشَاءَ اللَّهُ ۚ إِنَّ اللَّهَ كَانَ عَلِيمًا حَكِيمًا", "وَمَا يَذْكُرُونَ إِلَّا أَن يَشَاءَ اللَّهُ ۚ هُوَ أَهْلُ التَّقْوَىٰ وَأَهْلُ الْمَغْفِرَةِ", "يُدْخِلُ مَن يَشَاءُ فِي رَحْمَتِهِ ۚ وَالظَّالِمِينَ أَعَدَّ لَهُمْ عَذَابًا أَلِيمًا", "إِنَّ اللَّهَ غَفُورٌ رَّحِيمٌ"], jawabanBenar: "وَمَا تَشَاءُونَ إِلَّا أَن يَشَاءَ اللَّهُ ۚ إِنَّ اللَّهَ كَانَ عَلِيمًا حَكِيمًا" },
        { pertanyaan: "Lanjutkan ayat jebakan 'Kalla' lagi: 'كَلَّا لَا وَزَرَ'", opsi: ["إِلَىٰ رَبِّكَ يَوْمَئِذٍ الْمُسْتَقَرُّ", "يُنَبَّأُ الْإِنسَانُ يَوْمَئِذٍ بِمَا قَدَّمَ وَأَخَّرَ", "بَلِ الْإِنسَانُ عَلَىٰ نَفْسِهِ بَصِيرَةٌ", "وَلَوْ أَلْقَىٰ مَعَاذِيرَهُ"], jawabanBenar: "إِلَىٰ رَبِّكَ يَوْمَئِذٍ الْمُسْتَقَرُّ" },
        { pertanyaan: "Lanjutkan ayat 'Kalla' berurutan ini: 'كَلَّا إِذَا بَلَغَتِ التَّرَاقِيَ'", opsi: ["وَقِيلَ مَنْ ۜ رَاقٍ", "وَظَنَّ أَنَّهُ الْفِرَاقُ", "وَالْتَفَّتِ السَّاقُ بِالسَّاقِ", "إِلَىٰ رَبِّكَ يَوْمَئِذٍ الْمَسَاقُ"], jawabanBenar: "وَقِيلَ مَنْ ۜ رَاقٍ" },
        { pertanyaan: "Lanjutkan urutannya: 'وَقِيلَ مَنْ ۜ رَاقٍ'", opsi: ["وَظَنَّ أَنَّهُ الْفِرَاقُ", "وَالْتَفَّتِ السَّاقُ بِالسَّاقِ", "إِلَىٰ رَبِّكَ يَوْمَئِذٍ الْمَسَاقُ", "فَلَا صَدَّقَ وَلَا صَلَّىٰ"], jawabanBenar: "وَظَنَّ أَنَّهُ الْفِرَاقُ" },
        { pertanyaan: "Lanjutkan urutannya: 'وَظَنَّ أَنَّهُ الْفِرَاقُ'", opsi: ["وَالْتَفَّتِ السَّاقُ بِالسَّاقِ", "إِلَىٰ رَبِّكَ يَوْمَئِذٍ الْمَسَاقُ", "فَلَا صَدَّقَ وَلَا صَلَّىٰ", "وَلَٰكِن كَذَّبَ وَتَوَلَّىٰ"], jawabanBenar: "وَالْتَفَّتِ السَّاقُ بِالسَّاقِ" },
        { pertanyaan: "Lanjutkan urutannya: 'وَالْتَفَّتِ السَّاقُ بِالسَّاقِ'", opsi: ["إِلَىٰ رَبِّكَ يَوْمَئِذٍ الْمَسَاقُ", "فَلَا صَدَّقَ وَلَا صَلَّىٰ", "وَلَٰكِن كَذَّبَ وَتَوَلَّىٰ", "ثُمَّ ذَهَبَ إِلَىٰ أَهْلِهِ يَتَمَطَّىٰ"], jawabanBenar: "إِلَىٰ رَبِّكَ يَوْمَئِذٍ الْمَسَاقُ" },
        { pertanyaan: "Hati-hati rima yang mirip di surat lain! Lanjutkan: 'أَلَمْ نَخْلُقكُّم مِّن مَّاءٍ مَّهِينٍ'", opsi: ["فَجَعَلْنَاهُ فِي قَرَارٍ مَّكِينٍ", "فَجَعَلْنَاهُ سَمِيعًا بَصِيرًا", "إِلَىٰ قَدَرٍ مَّعْلُومٍ", "فَقَدَرْنَا فَنِعْمَ الْقَادِرُونَ"], jawabanBenar: "فَجَعَلْنَاهُ فِي قَرَارٍ مَّكِينٍ" },
        { pertanyaan: "Bandingkan dengan surat sebelumnya! Lanjutkan: 'إِنَّا خَلَقْنَا الْإِنسَانَ مِن نُّطْفَةٍ أَمْشَاجٍ نَّبْتَلِيهِ...'", opsi: ["فَجَعَلْنَاهُ سَمِيعًا بَصِيرًا", "فَجَعَلْنَاهُ فِي قَرَارٍ مَّكِينٍ", "إِنَّا هَدَيْنَاهُ السَّبِيلَ إِمَّا شَاكِرًا وَإِمَّا كَفُورًا", "أَلَمْ نَخْلُقكُّم مِّن مَّاءٍ مَّهِينٍ"], jawabanBenar: "فَجَعَلْنَاهُ سَمِيعًا بَصِيرًا" },
        { pertanyaan: "Lanjutkan ayat rima 'Tsumma' ini: 'أَوْلَىٰ لَكَ فَأَوْلَىٰ'", opsi: ["ثُمَّ أَوْلَىٰ لَكَ فَأَوْلَىٰ", "أَيَحْسَبُ الْإِنسَانُ أَن يُتْرَكَ سُدًى", "أَلَمْ يَكُ نُطْفَةً مِّن مَّنِيٍّ يُمْنَىٰ", "ثُمَّ كَانَ عَلَقَةً فَخَلَقَ فَسَوَّىٰ"], jawabanBenar: "ثُمَّ أَوْلَىٰ لَكَ فَأَوْلَىٰ" },
        { pertanyaan: "Perhatikan rima 'Tsumma' lagi. Lanjutkan: 'ثُمَّ إِنَّكُمْ أَيُّهَا الضَّالُّونَ الْمُكَذِّبُونَ'", opsi: ["(Ini adalah ayat dari Juz 27 - Al-Waqiah, bukan Juz 29, abaikan)", "لَآكِلُونَ مِن شَجَرٍ مِّن زَقُّومٍ", "فَمَالِئُونَ مِنْهَا الْبُطُونَ", "فَشَارِبُونَ عَلَيْهِ مِنَ الْحَمِيمِ"], jawabanBenar: "لَآكِلُونَ مِن شَجَرٍ مِّن زَقُّومٍ" },
        { pertanyaan: "Lanjutkan ayat jebakan di surat ini: 'انطَلِقُوا إِلَىٰ مَا كُنتُم بِهِ تُكَذِّبُونَ'", opsi: ["انطَلِقُوا إِلَىٰ ظِلٍّ ذِي ثَلَاثِ شُعَبٍ", "لَّا ظَلِيلٍ وَلَا يُغْنِي مِنَ اللَّهَبِ", "إِنَّهَا تَرْمِي بِشَرَرٍ كَالْقَصْرِ", "كَأَنَّهُ جِمَالَتٌ صُفْرٌ"], jawabanBenar: "انطَلِقُوا إِلَىٰ ظِلٍّ ذِي ثَلَاثِ شُعَبٍ" },
        { pertanyaan: "Lanjutkan urutannya: 'انطَلِقُوا إِلَىٰ ظِلٍّ ذِي ثَلَاثِ شُعَبٍ'", opsi: ["لَّا ظَلِيلٍ وَلَا يُغْنِي مِنَ اللَّهَبِ", "إِنَّهَا تَرْمِي بِشَرَرٍ كَالْقَصْرِ", "كَأَنَّهُ جِمَالَتٌ صُفْرٌ", "وَيْلٌ يَوْمَئِذٍ لِّلْمُكَذِّبِينَ"], jawabanBenar: "لَّا ظَلِيلٍ وَلَا يُغْنِي مِنَ اللَّهَبِ" },
        { pertanyaan: "Hati-hati akhirannya: 'وَمَا هُوَ إِلَّا ذِكْرٌ لِّلْعَالَمِينَ'", opsi: ["(Ini adalah akhir surat Al-Qalam)", "إِنْ هُوَ إِلَّا ذِكْرٌ لِّلْعَالَمِينَ", "لِمَن شَاءَ مِنكُمْ أَن يَسْتَقِيمَ", "وَمَا تَشَاءُونَ إِلَّا أَن يَشَاءَ اللَّهُ"], jawabanBenar: "(Ini adalah akhir surat Al-Qalam)" },
        { pertanyaan: "Lanjutkan ayat ini: 'وَأَنَّهُ لَمَّا قَامَ عَبْدُ اللَّهِ يَدْعُوهُ كَادُوا يَكُونُونَ عَلَيْهِ لِبَدًا'", opsi: ["قُلْ إِنَّمَا أَدْعُو رَبِّي وَلَا أُشْرِكُ بِهِ أَحَدًا", "قُلْ إِنِّي لَا أَمْلِكُ لَكُمْ ضَرًّا وَلَا رَشَدًا", "قُلْ إِنِّي لَن يُجِيرَنِي مِنَ اللَّهِ أَحَدٌ", "وَلَنْ أَجِدَ مِن دُونِهِ مُلْتَحَدًا"], jawabanBenar: "قُلْ إِنَّمَا أَدْعُو رَبِّي وَلَا أُشْرِكُ بِهِ أَحَدًا" },
        { pertanyaan: "Lanjutkan ayat rima ini: 'فَإِذَا نُقِرَ فِي النَّاقُورِ'", opsi: ["فَذَٰلِكَ يَوْمَئِذٍ يَوْمٌ عَسِيرٌ", "عَلَى الْكَافِرِينَ غَيْرُ يَسِيرٍ", "ذَرْنِي وَمَنْ خَلَقْتُ وَحِيدًا", "وَجَعَلْتُ لَهُ مَالًا مَّمْدُودًا"], jawabanBenar: "فَذَٰلِكَ يَوْمَئِذٍ يَوْمٌ عَسِيرٌ" },
        { pertanyaan: "Lanjutkan urutannya: 'فَذَٰلِكَ يَوْمَئِذٍ يَوْمٌ عَسِيرٌ'", opsi: ["عَلَى الْكَافِرِينَ غَيْرُ يَسِيرٍ", "ذَرْنِي وَمَنْ خَلَقْتُ وَحِيدًا", "وَجَعَلْتُ لَهُ مَالًا مَّمْدُودًا", "وَبَنِينَ شُهُودًا"], jawabanBenar: "عَلَى الْكَافِرِينَ غَيْرُ يَسِيرٍ" },
        { pertanyaan: "Lanjutkan ayat yang diakhiri dengan pertanyaan ini: 'فَبِأَيِّ حَدِيثٍ بَعْدَهُ يُؤْمِنُونَ'", opsi: ["(Ini adalah akhir surat)", "وَيْلٌ يَوْمَئِذٍ لِّلْمُكَذِّبِينَ", "إِنَّمَا تُوعَدُونَ لَوَاقِعٌ", "وَإِذَا قِيلَ لَهُمُ ارْكَعُوا لَا يَرْكَعُونَ"], jawabanBenar: "(Ini adalah akhir surat)" }
    ]
};

// ==========================================
// BACKUP DATA KE GOOGLE SHEETS (VIA APPS SCRIPT)
// Dikirim paralel, tidak menunggu/menghalangi
// proses simpan ke Firestore.
// ==========================================
window.kirimBackupKeSheet = function(data) {
    try {
        // typeof aman dipakai walau variabelnya belum pernah dideklarasikan
        const url = (typeof URL_BACKUP_SHEET !== 'undefined') ? URL_BACKUP_SHEET : "";
        if (!url || url.indexOf("GANTI_DENGAN_URL") !== -1) return; // belum dikonfigurasi
        fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(data)
        }).catch((err) => {
            console.error("Gagal mengirim backup ke Google Sheets:", err);
        });
    } catch (err) {
        // Backup tidak boleh sampai menggagalkan penyimpanan utama
        console.error("Backup Google Sheets dilewati:", err);
    }
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

// Simpan satu hasil kuis: cache lokal dulu (level berikutnya langsung terbuka),
// lalu Firestore. Mengembalikan Promise.
function simpanHasilKuis(namaAnak, jenis, level) {
    const labelKuis = LABEL_JENIS[jenis] || "";
    const db = firebase.firestore();
    const ref = db.collection("latihan_santri").doc(); // id dibuat lebih dulu agar bisa dilacak

    const dataSimpan = {
        nama: namaAnak,
        jenisKuis: labelKuis,
        level: level,
        skor: skorKuis,
        benar: jawabanBenarTotal,
        salah: jawabanSalahTotal
    };

    const catatanLokal = Object.assign({}, dataSimpan, { waktu: null, _waktuLokal: Date.now(), _id: ref.id });
    rekamanTertunda.push(catatanLokal);
    if (namaCacheLatihan === namaAnak) {
        dataLatihanCache.push(catatanLokal);
        perbaruiProgressMenu();
    }

    // Backup ke Google Sheets (paralel, tidak boleh menghalangi simpan utama)
    window.kirimBackupKeSheet(Object.assign({}, dataSimpan, { level: formatLabelLevel(level) }));

    const hapusTertunda = () => {
        const i = rekamanTertunda.indexOf(catatanLokal);
        if (i !== -1) rekamanTertunda.splice(i, 1);
    };

    return ref.set(Object.assign({}, dataSimpan, {
        waktu: firebase.firestore.FieldValue.serverTimestamp()
    })).then(() => {
        hapusTertunda();
        // Pastikan catatan tetap ada di cache walau ada muat-ulang yang menimpanya
        if (namaCacheLatihan === namaAnak && !dataLatihanCache.some((r) => r._id === ref.id)) {
            dataLatihanCache.push(catatanLokal);
            perbaruiProgressMenu();
        }
    }).catch((error) => {
        console.error("Gagal menyimpan nilai kuis:", error);
        hapusTertunda();
        const idx = dataLatihanCache.indexOf(catatanLokal);
        if (idx !== -1) dataLatihanCache.splice(idx, 1);
        perbaruiProgressMenu();
        alert("Nilai gagal disimpan ke server. Periksa koneksi internet lalu coba lagi.\n\n(" + (error && error.code ? error.code : "error") + ")");
    });
}

window.akhiriKuis = function() {
    const namaAnak = ambilNamaSantriAktif();

    skorKuis = Math.round(skorKuis);
    if (skorKuis > 100) skorKuis = 100;

    const jenis = jenisKuisSaatIni;
    const level = levelKuisSaatIni;
    const maksLevel = getMaksLevel(jenis);
    const lulus = jawabanSalahTotal <= MAKS_SALAH_LULUS;

    // Status SEBELUM percobaan ini dicatat (untuk info "level terbuka" & "nilai terbaik baru")
    const petaSebelum = petaProgress(jenis);
    const terbaikSebelumnya = petaSebelum[level] ? petaSebelum[level].terbaik : null;
    const punyaBerikutnya = level < maksLevel;
    const berikutnyaSudahTerbuka = punyaBerikutnya ? levelTerbuka(petaSebelum, level + 1) : false;

    const infoHasil = {
        level: level,
        skor: skorKuis,
        benar: jawabanBenarTotal,
        salah: jawabanSalahTotal,
        lulus: lulus,
        punyaBerikutnya: punyaBerikutnya,
        barusajaTerbuka: lulus && punyaBerikutnya && !berikutnyaSudahTerbuka,
        terbaikSebelumnya: terbaikSebelumnya
    };

    // 1) SIMPAN DULU. Sebelumnya popup & backup dijalankan lebih dulu, sehingga
    //    error sekecil apa pun di sana membuat penyimpanan tidak pernah dijalankan.
    const namaValid = namaAnak && namaAnak !== "-";
    if (namaValid) {
        try {
            simpanHasilKuis(namaAnak, jenis, level);
        } catch (err) {
            console.error("Gagal memulai penyimpanan nilai:", err);
            alert("Nilai gagal disimpan: " + err.message);
        }
    }

    // 2) Tampilkan popup hasil
    try {
        window.tampilkanHasilKuis(infoHasil);
    } catch (err) {
        console.error("Gagal menampilkan hasil kuis:", err);
        alert("Kuis selesai! Skor: " + infoHasil.skor);
        window.kembaliKeMenuLatihan();
    }

    // 3) Beri tahu jika nilai tidak bisa disimpan karena santri tidak terbaca
    if (!namaValid) {
        setTimeout(() => alert("Nilai TIDAK tersimpan karena data santri tidak terbaca. Silakan pilih santri / login ulang, lalu ulangi kuis."), 300);
    }
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
        const namaAnak = ambilNamaSantriAktif();
        window.loadRiwayatLatihan(namaAnak);

        document.getElementById('subPageAreaKuis').classList.add('hidden');
        document.getElementById('subPageMenuLatihan').classList.remove('hidden');
    }
};
