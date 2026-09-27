// ==========================================
// LOGIKA FITUR LATIHAN & KUIS (latihan.js)
// 50 Level, soal diambil dinamis dari bank
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
    dasar: [
        { pertanyaan: "Lanjutkan ayat: 'قُلْ هُوَ اللَّهُ ...'", opsi: ["أَحَدٌ", "الصَّمَدُ", "كُفُوًا", "يَلِدْ"], jawabanBenar: "أَحَدٌ" },
        { pertanyaan: "Surat Al-Falaq terdiri dari berapa ayat?", opsi: ["4 ayat", "5 ayat", "6 ayat", "3 ayat"], jawabanBenar: "5 ayat" },
        { pertanyaan: "Surat terakhir dalam Al-Qur'an adalah...", opsi: ["An-Nas", "Al-Falaq", "Al-Ikhlas", "Al-Kautsar"], jawabanBenar: "An-Nas" },
        { pertanyaan: "Surat pertama dalam Juz 30 adalah...", opsi: ["An-Naba", "An-Nazi'at", "Abasa", "At-Takwir"], jawabanBenar: "An-Naba" },
        { pertanyaan: "Surat Al-Ikhlas artinya...", opsi: ["Memurnikan (keesaan Allah)", "Cahaya", "Permulaan", "Pertolongan"], jawabanBenar: "Memurnikan (keesaan Allah)" },
        { pertanyaan: "Surat An-Nas terdiri dari berapa ayat?", opsi: ["6 ayat", "4 ayat", "8 ayat", "5 ayat"], jawabanBenar: "6 ayat" },
        { pertanyaan: "Surat Al-Kautsar terdiri dari berapa ayat?", opsi: ["3 ayat", "5 ayat", "7 ayat", "2 ayat"], jawabanBenar: "3 ayat" },
        { pertanyaan: "Lanjutkan ayat: 'إِنَّا أَعْطَيْنَاكَ الْـ...'", opsi: ["كَوْثَرَ", "كَهْفَ", "فَجْرَ", "فَلَقَ"], jawabanBenar: "كَوْثَرَ" },
        { pertanyaan: "Surat Al-'Asr artinya...", opsi: ["Masa/waktu", "Cahaya", "Bintang", "Fajar"], jawabanBenar: "Masa/waktu" },
        { pertanyaan: "Surat An-Nashr berkaitan dengan peristiwa...", opsi: ["Kemenangan/pertolongan Allah (Fathu Makkah)", "Hijrah ke Madinah", "Perang Badar", "Turunnya wahyu pertama"], jawabanBenar: "Kemenangan/pertolongan Allah (Fathu Makkah)" },
        { pertanyaan: "Surat Al-Lahab menceritakan tentang...", opsi: ["Abu Lahab dan istrinya yang menentang dakwah Nabi", "Kisah Nabi Musa", "Kaum 'Ad yang durhaka", "Perang Uhud"], jawabanBenar: "Abu Lahab dan istrinya yang menentang dakwah Nabi" },
        { pertanyaan: "Surat An-Nashr terdiri dari berapa ayat?", opsi: ["3 ayat", "5 ayat", "6 ayat", "4 ayat"], jawabanBenar: "3 ayat" },
        { pertanyaan: "Surat Al-Kafirun artinya...", opsi: ["Orang-orang kafir", "Orang-orang beriman", "Orang-orang munafik", "Orang-orang yang bersyukur"], jawabanBenar: "Orang-orang kafir" },
        { pertanyaan: "Surat Quraisy menceritakan tentang...", opsi: ["Nikmat Allah berupa keamanan & kelancaran dagang bagi kaum Quraisy", "Peperangan kaum Quraisy", "Hijrahnya kaum Quraisy", "Kisah Ka'bah dibangun"], jawabanBenar: "Nikmat Allah berupa keamanan & kelancaran dagang bagi kaum Quraisy" },
        { pertanyaan: "Surat Al-Fatihah (pembuka Al-Qur'an) terletak di...", opsi: ["Juz 1, bukan Juz 30", "Juz 30", "Juz 29", "Juz 15"], jawabanBenar: "Juz 1, bukan Juz 30" }
    ],
    menengah: [
        { pertanyaan: "Lanjutkan ayat: 'وَالضُّحَىٰ ۝ وَاللَّيْلِ إِذَا ...'", opsi: ["سَجَىٰ", "قَالَ", "تَرْضَىٰ", "فَهَدَىٰ"], jawabanBenar: "سَجَىٰ" },
        { pertanyaan: "Surat apakah yang memiliki arti 'Waktu Subuh'?", opsi: ["Al-Falaq", "An-Nas", "Al-'Asr", "Al-Fajr"], jawabanBenar: "Al-Falaq" },
        { pertanyaan: "Lanjutkan ayat: 'وَالتِّينِ وَالزَّ...'", opsi: ["يْتُونِ", "لْزَلَةِ", "مَرِ", "خْرُفِ"], jawabanBenar: "يْتُونِ" },
        { pertanyaan: "Surat Al-Ma'un menjelaskan tentang...", opsi: ["Orang yang mendustakan agama, enggan membantu anak yatim", "Kisah Nabi Musa", "Keindahan surga", "Peristiwa hari kiamat secara rinci"], jawabanBenar: "Orang yang mendustakan agama, enggan membantu anak yatim" },
        { pertanyaan: "Lanjutkan ayat: 'إِنَّا أَنزَلْنَاهُ فِي لَيْلَةِ الْـ...'", opsi: ["قَدْرِ", "بَرَكَةِ", "نُّورِ", "مُبَارَك"], jawabanBenar: "قَدْرِ" },
        { pertanyaan: "Surat Al-Fil menceritakan tentang...", opsi: ["Pasukan bergajah yang hendak menghancurkan Ka'bah", "Kisah Nabi Sulaiman", "Perjanjian Hudaibiyah", "Kisah kaum 'Ad"], jawabanBenar: "Pasukan bergajah yang hendak menghancurkan Ka'bah" },
        { pertanyaan: "Lanjutkan ayat: 'وَيْلٌ لِّكُلِّ هُمَزَةٍ ...'", opsi: ["لُّمَزَةٍ", "حُطَمَةٌ", "صَّاعِقَةٌ", "قَارِعَةٌ"], jawabanBenar: "لُّمَزَةٍ" },
        { pertanyaan: "Surat At-Takatsur mengingatkan manusia tentang...", opsi: ["Sikap bermegah-megahan yang melalaikan", "Pentingnya sedekah", "Kisah para nabi", "Keutamaan puasa"], jawabanBenar: "Sikap bermegah-megahan yang melalaikan" },
        { pertanyaan: "Lanjutkan ayat: 'إِذَا زُلْزِلَتِ الْأَرْضُ ...'", opsi: ["زِلْزَالَهَا", "أَثْقَالَهَا", "يَوْمَئِذٍ", "مِثْقَالَ ذَرَّةٍ"], jawabanBenar: "زِلْزَالَهَا" },
        { pertanyaan: "Surat Al-Qari'ah artinya...", opsi: ["Hari kiamat yang menggetarkan", "Hari kemenangan", "Waktu dhuha", "Cahaya di malam hari"], jawabanBenar: "Hari kiamat yang menggetarkan" },
        { pertanyaan: "Lanjutkan ayat: 'أَلَمْ نَشْرَحْ لَكَ ...'", opsi: ["صَدْرَكَ", "قَلْبَكَ", "أَمْرَكَ", "ذِكْرَكَ"], jawabanBenar: "صَدْرَكَ" },
        { pertanyaan: "Surat Al-Insyirah menjelaskan tentang...", opsi: ["Kemudahan yang datang setelah kesulitan", "Kisah kaum Nabi Nuh", "Larangan bermegah-megahan", "Kisah pasukan bergajah"], jawabanBenar: "Kemudahan yang datang setelah kesulitan" },
        { pertanyaan: "Lanjutkan ayat: 'وَالْعَصْرِ ۝ إِنَّ الْإِنسَانَ لَفِي ...'", opsi: ["خُسْرٍ", "قَدْرٍ", "أَجْرٍ", "نُورٍ"], jawabanBenar: "خُسْرٍ" },
        { pertanyaan: "Surat At-Tin bersumpah dengan...", opsi: ["Buah Tin, Zaitun, dan Gunung Sinai", "Matahari dan bulan", "Bintang-bintang", "Malam dan siang"], jawabanBenar: "Buah Tin, Zaitun, dan Gunung Sinai" },
        { pertanyaan: "Lanjutkan ayat: 'اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي ...'", opsi: ["خَلَقَ", "رَزَقَ", "هَدَىٰ", "أَنزَلَ"], jawabanBenar: "خَلَقَ" }
    ],
    lanjut: [
        { pertanyaan: "Lanjutkan ayat: 'كَلَّا سَيَعْلَمُونَ ۝ ثُمَّ ...'", opsi: ["كَلَّا سَيَعْلَمُونَ", "أَلَمْ نَجْعَلِ الْأَرْضَ مِهَادًا", "وَالْجِبَالَ أَوْتَادًا", "وَخَلَقْنَاكُمْ أَزْوَاجًا"], jawabanBenar: "كَلَّا سَيَعْلَمُونَ" },
        { pertanyaan: "Surat An-Naba' membahas tentang...", opsi: ["Berita besar tentang hari kebangkitan", "Kisah Nabi Yusuf", "Peperangan Badar", "Adab bertetangga"], jawabanBenar: "Berita besar tentang hari kebangkitan" },
        { pertanyaan: "Lanjutkan ayat: 'وَالنَّازِعَاتِ ...'", opsi: ["غَرْقًا", "نَشْطًا", "سَبْحًا", "سَبْقًا"], jawabanBenar: "غَرْقًا" },
        { pertanyaan: "Lanjutkan ayat: 'عَبَسَ وَ...'", opsi: ["تَوَلَّىٰ", "نَظَرَ", "قَالَ", "سَمِعَ"], jawabanBenar: "تَوَلَّىٰ" },
        { pertanyaan: "Lanjutkan ayat: 'إِذَا الشَّمْسُ ...'", opsi: ["كُوِّرَتْ", "انفَطَرَتْ", "انشَقَّتْ", "انتَثَرَتْ"], jawabanBenar: "كُوِّرَتْ" },
        { pertanyaan: "Lanjutkan ayat: 'إِذَا السَّمَاءُ انفَطَرَتْ' adalah awal dari surat...", opsi: ["Al-Infithar", "At-Takwir", "Al-Insyiqaq", "Al-Buruj"], jawabanBenar: "Al-Infithar" },
        { pertanyaan: "Lanjutkan ayat: 'وَيْلٌ لِّلْـ...'", opsi: ["مُطَفِّفِينَ", "مُكَذِّبِينَ", "هُمَزَةِ", "قَارِعَةِ"], jawabanBenar: "مُطَفِّفِينَ" },
        { pertanyaan: "Lanjutkan ayat: 'إِذَا السَّمَاءُ انشَقَّتْ' adalah awal dari surat...", opsi: ["Al-Insyiqaq", "Al-Infithar", "At-Takwir", "Al-Buruj"], jawabanBenar: "Al-Insyiqaq" },
        { pertanyaan: "Lanjutkan ayat: 'وَالسَّمَاءِ ذَاتِ الْـ...'", opsi: ["بُرُوجِ", "طَارِقِ", "فَجْرِ", "قَدْرِ"], jawabanBenar: "بُرُوجِ" },
        { pertanyaan: "Lanjutkan ayat: 'وَالسَّمَاءِ وَ...'", opsi: ["الطَّارِقِ", "الْبُرُوجِ", "الْفَجْرِ", "اللَّيْلِ"], jawabanBenar: "الطَّارِقِ" },
        { pertanyaan: "Lanjutkan ayat: 'وَالشَّمْسِ وَ...'", opsi: ["ضُحَاهَا", "لَيْلِهَا", "نُورِهَا", "طُلُوعِهَا"], jawabanBenar: "ضُحَاهَا" },
        { pertanyaan: "Lanjutkan ayat: 'وَالْفَجْرِ ۝ وَلَيَالٍ ...'", opsi: ["عَشْرٍ", "طَوِيلَةٍ", "مُبَارَكَةٍ", "كَثِيرَةٍ"], jawabanBenar: "عَشْرٍ" },
        { pertanyaan: "Ayat 'وَهَٰذَا الْبَلَدِ الْأَمِينِ' (negeri yang aman ini) terdapat dalam surat...", opsi: ["At-Tin", "Al-Balad", "Al-Fajr", "Al-Lail"], jawabanBenar: "At-Tin" },
        { pertanyaan: "Lanjutkan ayat: 'وَاللَّيْلِ إِذَا ...'", opsi: ["يَغْشَىٰ", "سَجَىٰ", "تَجَلَّىٰ", "أَقْبَلَ"], jawabanBenar: "يَغْشَىٰ" },
        { pertanyaan: "Surat Al-Ghasyiyah membahas tentang...", opsi: ["Hari kiamat yang menyelubungi (dahsyat)", "Kisah Nabi Ibrahim", "Keindahan alam semesta", "Adab berdagang"], jawabanBenar: "Hari kiamat yang menyelubungi (dahsyat)" }
    ]
};

const bankSoalJuz29 = {
    dasar: [
        { pertanyaan: "Surat pertama dalam Juz 29 adalah surat?", opsi: ["Al-Mulk", "Al-Qalam", "Al-Haqqah", "Nuh"], jawabanBenar: "Al-Mulk" },
        { pertanyaan: "Lanjutkan ayat: 'تَبَارَكَ الَّذِي بِيَدِهِ الْـ...'", opsi: ["مُلْكُ", "خَيْرُ", "أَرْضُ", "مَوْتُ"], jawabanBenar: "مُلْكُ" },
        { pertanyaan: "Surat Al-Mulk sering disebut sebagai surat...", opsi: ["Al-Munjiyah (penyelamat dari siksa kubur)", "Al-Fatihah kedua", "Penutup Al-Qur'an", "Surat terpanjang"], jawabanBenar: "Al-Munjiyah (penyelamat dari siksa kubur)" },
        { pertanyaan: "Surat Nuh menceritakan kisah tentang...", opsi: ["Nabi Nuh AS dan kaumnya", "Nabi Musa dan Fir'aun", "Nabi Yusuf dan saudaranya", "Nabi Ibrahim dan berhala"], jawabanBenar: "Nabi Nuh AS dan kaumnya" },
        { pertanyaan: "Surat Al-Jin membahas tentang...", opsi: ["Golongan jin yang mendengarkan Al-Qur'an", "Kisah Nabi Sulaiman menaklukkan jin", "Peperangan melawan jin", "Sihir dan perdukunan"], jawabanBenar: "Golongan jin yang mendengarkan Al-Qur'an" },
        { pertanyaan: "Surat Al-Muzzammil artinya...", opsi: ["Orang yang berselimut", "Orang yang berpuasa", "Orang yang bersyukur", "Orang yang berhijrah"], jawabanBenar: "Orang yang berselimut" },
        { pertanyaan: "Surat Al-Muddatstsir artinya...", opsi: ["Orang yang berkemul/berselimut", "Orang yang bepergian", "Orang yang berdoa", "Orang yang bersedekah"], jawabanBenar: "Orang yang berkemul/berselimut" },
        { pertanyaan: "Surat Al-Qiyamah membahas tentang...", opsi: ["Peristiwa hari kiamat", "Kisah para nabi", "Adab makan dan minum", "Peperangan Uhud"], jawabanBenar: "Peristiwa hari kiamat" },
        { pertanyaan: "Surat Al-Insan disebut juga surat...", opsi: ["Ad-Dahr", "Al-Balad", "Al-Fajr", "Al-Lail"], jawabanBenar: "Ad-Dahr" },
        { pertanyaan: "Surat Al-Mursalat artinya...", opsi: ["Malaikat-malaikat yang diutus / angin yang dikirim", "Bintang-bintang", "Cahaya matahari", "Awan mendung"], jawabanBenar: "Malaikat-malaikat yang diutus / angin yang dikirim" },
        { pertanyaan: "Surat Al-Qalam disebut juga dengan surat...", opsi: ["Nun", "Ya Sin", "Ar-Rahman", "Al-Fath"], jawabanBenar: "Nun" },
        { pertanyaan: "Surat Al-Mulk terdiri dari berapa ayat?", opsi: ["30 ayat", "20 ayat", "40 ayat", "52 ayat"], jawabanBenar: "30 ayat" },
        { pertanyaan: "Surat Nuh terdiri dari berapa ayat?", opsi: ["28 ayat", "18 ayat", "38 ayat", "44 ayat"], jawabanBenar: "28 ayat" },
        { pertanyaan: "Surat Al-Jin terdiri dari berapa ayat?", opsi: ["28 ayat", "18 ayat", "38 ayat", "20 ayat"], jawabanBenar: "28 ayat" },
        { pertanyaan: "Surat terakhir dalam Juz 29 adalah...", opsi: ["Al-Mursalat", "An-Naba", "Al-Insan", "Al-Muzzammil"], jawabanBenar: "Al-Mursalat" }
    ],
    menengah: [
        { pertanyaan: "Lanjutkan ayat: 'نٓ ۚ وَالْقَلَمِ وَمَا ...'", opsi: ["يَسْطُرُونَ", "يَعْلَمُونَ", "يُبْصِرُونَ", "يَكْسِبُونَ"], jawabanBenar: "يَسْطُرُونَ" },
        { pertanyaan: "Surat Al-Qalam menceritakan tentang...", opsi: ["Pemilik kebun yang sombong (Ashabul Jannah)", "Kisah Nabi Yunus", "Perang Khandaq", "Kisah Ashabul Kahfi"], jawabanBenar: "Pemilik kebun yang sombong (Ashabul Jannah)" },
        { pertanyaan: "Lanjutkan ayat: 'الْحَاقَّةُ ۝ مَا الْحَاقَّةُ ۝ وَمَا ...'", opsi: ["أَدْرَاكَ مَا الْحَاقَّةُ", "يَوْمَ يَدْعُونَ", "يَوْمَئِذٍ", "فِي جَنَّةٍ عَالِيَةٍ"], jawabanBenar: "أَدْرَاكَ مَا الْحَاقَّةُ" },
        { pertanyaan: "Surat Al-Ma'arij artinya...", opsi: ["Tempat-tempat naik / tingkatan", "Jalan yang lurus", "Rezeki yang luas", "Kebun yang subur"], jawabanBenar: "Tempat-tempat naik / tingkatan" },
        { pertanyaan: "Lanjutkan ayat: 'إِنَّا أَرْسَلْنَا نُوحًا إِلَىٰ ...'", opsi: ["قَوْمِهِ", "أَهْلِهِ", "فِرْقَتِهِ", "أُمَّتِهِ"], jawabanBenar: "قَوْمِهِ" },
        { pertanyaan: "Pada awal surat Al-Jin, jin berkata bahwa Al-Qur'an itu...", opsi: ["Menakjubkan (Qur'anan 'Ajaba)", "Sulit dipahami", "Bertentangan dengan kitab sebelumnya", "Hanya untuk manusia"], jawabanBenar: "Menakjubkan (Qur'anan 'Ajaba)" },
        { pertanyaan: "Lanjutkan ayat: 'يَا أَيُّهَا الْمُزَّمِّلُ ۝ قُمِ اللَّيْلَ إِلَّا ...'", opsi: ["قَلِيلًا", "كَثِيرًا", "طَوِيلًا", "يَسِيرًا"], jawabanBenar: "قَلِيلًا" },
        { pertanyaan: "Lanjutkan ayat: 'يَا أَيُّهَا الْمُدَّثِّرُ ۝ قُمْ فَـ...'", opsi: ["أَنذِرْ", "صَلِّ", "اصْبِرْ", "اسْجُدْ"], jawabanBenar: "أَنذِرْ" },
        { pertanyaan: "Surat Al-Qiyamah bersumpah dengan...", opsi: ["Hari kiamat dan jiwa yang mencela diri sendiri", "Matahari dan bulan", "Langit dan bumi", "Malam dan siang"], jawabanBenar: "Hari kiamat dan jiwa yang mencela diri sendiri" },
        { pertanyaan: "Surat Al-Insan menjelaskan tentang...", opsi: ["Penciptaan manusia dan balasan bagi orang yang bersabar", "Kisah kaum Tsamud", "Adab berdagang", "Kisah Nabi Zakariya"], jawabanBenar: "Penciptaan manusia dan balasan bagi orang yang bersabar" },
        { pertanyaan: "Surat Al-Insan (Ad-Dahr) turun berkaitan dengan kisah kedermawanan...", opsi: ["Ali bin Abi Thalib dan keluarganya", "Abu Bakar Ash-Shiddiq", "Utsman bin Affan", "Umar bin Khattab"], jawabanBenar: "Ali bin Abi Thalib dan keluarganya" },
        { pertanyaan: "Lanjutkan ayat Al-Mulk: 'الَّذِي خَلَقَ الْمَوْتَ وَالْحَيَاةَ لِيَبْلُوَكُمْ أَيُّكُمْ ...'", opsi: ["أَحْسَنُ عَمَلًا", "أَكْثَرُ مَالًا", "أَقْوَىٰ جِسْمًا", "أَطْوَلُ عُمْرًا"], jawabanBenar: "أَحْسَنُ عَمَلًا" },
        { pertanyaan: "Surat Al-Ma'arij menyebutkan satu hari di akhirat yang kadarnya seperti...", opsi: ["50.000 tahun", "1.000 tahun", "100 tahun", "7.000 tahun"], jawabanBenar: "50.000 tahun" },
        { pertanyaan: "Lanjutkan ayat Al-Qalam: 'إِنَّ لَكَ لَأَجْرًا غَيْرَ ...'", opsi: ["مَمْنُونٍ", "مَحْدُودٍ", "مَعْدُودٍ", "مَنْقُوصٍ"], jawabanBenar: "مَمْنُونٍ" },
        { pertanyaan: "Surat Al-Muzzammil berisi perintah utama untuk...", opsi: ["Qiyamul lail (shalat malam)", "Berpuasa penuh setahun", "Berhaji setiap tahun", "Berdakwah ke luar negeri"], jawabanBenar: "Qiyamul lail (shalat malam)" }
    ],
    lanjut: [
        { pertanyaan: "Lanjutkan ayat: 'الْحَاقَّةُ ۝ مَا الْـ...'", opsi: ["حَاقَّةُ", "قَارِعَةُ", "وَاقِعَةُ", "سَاعَةُ"], jawabanBenar: "حَاقَّةُ" },
        { pertanyaan: "Surat Al-Ma'arij menjelaskan tentang...", opsi: ["Pertanyaan orang kafir tentang azab dan sifat manusia yang berkeluh kesah", "Kisah Nabi Adam", "Peperangan Tabuk", "Hukum waris"], jawabanBenar: "Pertanyaan orang kafir tentang azab dan sifat manusia yang berkeluh kesah" },
        { pertanyaan: "Lanjutkan ayat: 'وَالْمُرْسَلَاتِ ...'", opsi: ["عُرْفًا", "نَشْرًا", "ذِكْرًا", "عُذْرًا"], jawabanBenar: "عُرْفًا" },
        { pertanyaan: "Lanjutkan ayat: 'إِنَّا سَنُلْقِي عَلَيْكَ قَوْلًا ...'", opsi: ["ثَقِيلًا", "كَرِيمًا", "عَظِيمًا", "مُبِينًا"], jawabanBenar: "ثَقِيلًا" },
        { pertanyaan: "Dalam surat Al-Muddatstsir, Allah bersumpah dengan...", opsi: ["Bulan (وَالْقَمَرِ)", "Matahari", "Bintang", "Awan"], jawabanBenar: "Bulan (وَالْقَمَرِ)" },
        { pertanyaan: "Surat Al-Qiyamah menjelaskan secara rinci tentang...", opsi: ["Tanda-tanda dan proses terjadinya hari kiamat", "Adab berpakaian", "Kisah Nabi Ayyub", "Aturan zakat"], jawabanBenar: "Tanda-tanda dan proses terjadinya hari kiamat" },
        { pertanyaan: "Lanjutkan ayat: 'هَلْ أَتَىٰ عَلَى الْإِنسَانِ حِينٌ مِّنَ ...'", opsi: ["الدَّهْرِ لَمْ يَكُن شَيْئًا مَّذْكُورًا", "الدُّنْيَا وَمَا فِيهَا", "الذِّكْرِ وَالْقُرْآنِ", "الدَّعْوَةِ وَالْخَيْرِ"], jawabanBenar: "الدَّهْرِ لَمْ يَكُن شَيْئًا مَّذْكُورًا" },
        { pertanyaan: "Surat Al-Mursalat berulang kali menyebutkan ayat peringatan 'وَيْلٌ يَوْمَئِذٍ لِّلْمُكَذِّبِينَ' yang ditujukan bagi...", opsi: ["Orang-orang yang mendustakan (kebenaran)", "Orang yang bersedekah", "Orang yang berpuasa", "Orang yang berhaji"], jawabanBenar: "Orang-orang yang mendustakan (kebenaran)" },
        { pertanyaan: "Ayat 'وَيْلٌ يَوْمَئِذٍ لِّلْمُكَذِّبِينَ' dalam surat Al-Mursalat diulang sebanyak...", opsi: ["10 kali", "5 kali", "7 kali", "3 kali"], jawabanBenar: "10 kali" },
        { pertanyaan: "Di akhir surat Nuh, Nabi Nuh AS berdoa memohon ampunan untuk...", opsi: ["Dirinya, kedua orang tuanya, dan orang-orang beriman", "Seluruh kaumnya tanpa terkecuali", "Anaknya yang durhaka", "Para pembesar kaumnya"], jawabanBenar: "Dirinya, kedua orang tuanya, dan orang-orang beriman" },
        { pertanyaan: "Pertanyaan orang kafir 'يَسْأَلُ أَيَّانَ يَوْمُ الْقِيَامَةِ' (kapan hari kiamat) terdapat dalam surat...", opsi: ["Al-Qiyamah", "Al-Ma'arij", "Al-Haqqah", "Al-Mulk"], jawabanBenar: "Al-Qiyamah" },
        { pertanyaan: "Lanjutkan ayat Al-Ma'arij: 'سَأَلَ سَائِلٌ بِعَذَابٍ ...'", opsi: ["وَاقِعٍ", "أَلِيمٍ", "شَدِيدٍ", "عَظِيمٍ"], jawabanBenar: "وَاقِعٍ" },
        { pertanyaan: "Lanjutkan ayat Nuh: 'إِنَّا أَرْسَلْنَا نُوحًا إِلَىٰ قَوْمِهِ أَنْ ...'", opsi: ["أَنذِرْ قَوْمَكَ", "بَشِّرْ قَوْمَكَ", "عَلِّمْ قَوْمَكَ", "قُدْ قَوْمَكَ"], jawabanBenar: "أَنذِرْ قَوْمَكَ" },
        { pertanyaan: "Lanjutkan ayat Al-Jin: 'قُلْ أُوحِيَ إِلَيَّ أَنَّهُ اسْتَمَعَ نَفَرٌ مِّنَ ...'", opsi: ["الْجِنِّ", "الْمَلَائِكَةِ", "الْإِنسِ", "الشَّيَاطِينِ"], jawabanBenar: "الْجِنِّ" },
        { pertanyaan: "Lanjutkan ayat Al-Insan: 'إِنَّا نَحْنُ نَزَّلْنَا عَلَيْكَ ...'", opsi: ["الْقُرْآنَ تَنزِيلًا", "الْكِتَابَ تَفْصِيلًا", "الْفُرْقَانَ تَبْيَانًا", "الذِّكْرَ تَذْكِيرًا"], jawabanBenar: "الْقُرْآنَ تَنزِيلًا" }
    ]
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

function bobotTingkatUntukLevel(level) {
    const t = Math.max(0, Math.min(1, (level - 1) / 49)); // 0 di level 1, 1 di level 50
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

window.generateSoalUntukLevel = function(bank, level) {
    const bobot = bobotTingkatUntukLevel(level);
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

    let namaKuis = "";
    if(jenis === 'tajwid') namaKuis = "Kuis Hukum Tajwid";
    if(jenis === 'makharijul') namaKuis = "Kuis Makharijul Huruf";
    if(jenis === 'juz30') namaKuis = "Hafalan Juz 30";
    if(jenis === 'juz29') namaKuis = "Hafalan Juz 29";

    document.getElementById('judulModalLevel').innerText = "Pilih Level (1-50)\n" + namaKuis;

    window.renderGridLevel();
};

window.renderGridLevel = function() {
    const grid = document.getElementById('gridLevelKuis');
    if (!grid) return;
    grid.innerHTML = '';
    for (let i = 1; i <= 50; i++) {
        const btn = document.createElement('button');
        let warna = "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200";
        if (i > 33) warna = "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200";
        else if (i > 16) warna = "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200";
        btn.type = "button";
        btn.className = "aspect-square flex items-center justify-center text-xs sm:text-sm font-bold rounded-lg border transition-all active:scale-95 " + warna;
        btn.innerText = i;
        btn.onclick = () => window.mulaiKuisDariLevel(i);
        grid.appendChild(btn);
    }
};

window.tutupModalLevel = function() {
    document.getElementById('modalPilihLevel').classList.add('hidden');
};

window.mulaiKuisDariLevel = function(level) {
    window.tutupModalLevel();
    jenisKuisSaatIni = tempKuisPilihan;
    levelKuisSaatIni = level;

    let sumberBankSoal;
    if(jenisKuisSaatIni === 'tajwid') sumberBankSoal = bankSoalTajwid;
    if(jenisKuisSaatIni === 'makharijul') sumberBankSoal = bankSoalMakharijul;
    if(jenisKuisSaatIni === 'juz30') sumberBankSoal = bankSoalJuz30;
    if(jenisKuisSaatIni === 'juz29') sumberBankSoal = bankSoalJuz29;

    kuisAktif = window.generateSoalUntukLevel(sumberBankSoal, level);

    if (!kuisAktif || kuisAktif.length === 0) {
        alert("Mohon maaf, soal untuk level ini belum tersedia.");
        return;
    }

    indexSoalSaatIni = 0;
    skorKuis = 0;
    jawabanBenarTotal = 0;
    jawabanSalahTotal = 0;

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
};

window.cekJawaban = function(jawabanDipilih, jawabanBenar, elemenTombol) {
    const semuaTombol = document.getElementById('opsiJawaban').querySelectorAll('button');
    semuaTombol.forEach(btn => btn.disabled = true); // Kunci agar tak diklik ganda

    const bobotPerSoal = 100 / kuisAktif.length;

    if (jawabanDipilih === jawabanBenar) {
        skorKuis += bobotPerSoal;
        jawabanBenarTotal++;
        elemenTombol.classList.remove('bg-slate-50', 'text-slate-700', 'border-slate-200');
        elemenTombol.classList.add('bg-emerald-100', 'border-emerald-500', 'text-emerald-700');
    } else {
        jawabanSalahTotal++;
        elemenTombol.classList.remove('bg-slate-50', 'text-slate-700', 'border-slate-200');
        elemenTombol.classList.add('bg-rose-100', 'border-rose-500', 'text-rose-700');

        semuaTombol.forEach(btn => {
            if (btn.innerText === jawabanBenar) {
                btn.classList.remove('bg-slate-50', 'text-slate-700', 'border-slate-200');
                btn.classList.add('bg-emerald-100', 'border-emerald-500', 'text-emerald-700');
            }
        });
    }

    setTimeout(() => {
        indexSoalSaatIni++;
        if (indexSoalSaatIni < kuisAktif.length) {
            window.renderSoal();
        } else {
            window.akhiriKuis();
        }
    }, 1500);
};

window.akhiriKuis = function() {
    const namaAnak = document.getElementById('namaSantri').innerText;

    skorKuis = Math.round(skorKuis);
    if(skorKuis > 100) skorKuis = 100;

    // Tampilkan popup hasil kuis bertema (menggantikan alert bawaan browser)
    window.tampilkanHasilKuis({
        level: levelKuisSaatIni,
        skor: skorKuis,
        benar: jawabanBenarTotal,
        salah: jawabanSalahTotal
    });

    if (!namaAnak || namaAnak === "-" || namaAnak === "") {
        return;
    }

    let labelKuis = "";
    if(jenisKuisSaatIni === 'tajwid') labelKuis = "Hukum Tajwid";
    if(jenisKuisSaatIni === 'makharijul') labelKuis = "Makharijul Huruf";
    if(jenisKuisSaatIni === 'juz30') labelKuis = "Juz 30";
    if(jenisKuisSaatIni === 'juz29') labelKuis = "Juz 29";

    const db = firebase.firestore();

    // Simpan ke database berjalan secara Background
    db.collection("latihan_santri").add({
        nama: namaAnak,
        jenisKuis: labelKuis,
        level: levelKuisSaatIni,
        skor: skorKuis,
        benar: jawabanBenarTotal,
        salah: jawabanSalahTotal,
        waktu: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        // Refresh tabel riwayat
        window.loadRiwayatLatihan(namaAnak);
    }).catch((error) => {
        console.error("Gagal menyimpan nilai kuis:", error);
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
    } else if (hasil.skor < 70) {
        warnaIkon = "bg-amber-50 text-amber-500";
        iconName = "sentiment_neutral";
        pesanMotivasi = "Sudah bagus, terus semangat berlatih!";
    }

    const ikonEl = document.getElementById('ikonHasilKuis');
    ikonEl.className = `w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-inner ${warnaIkon}`;
    document.getElementById('simbolHasilKuis').innerText = iconName;

    document.getElementById('pesanMotivasiHasilKuis').innerText = pesanMotivasi;
    document.getElementById('levelHasilKuis').innerText = formatLabelLevel(hasil.level);
    document.getElementById('skorHasilKuis').innerText = hasil.skor;
    document.getElementById('benarHasilKuis').innerText = hasil.benar;
    document.getElementById('salahHasilKuis').innerText = hasil.salah;

    modal.classList.remove('hidden');
};

window.tutupHasilKuis = function() {
    const modal = document.getElementById('modalHasilKuis');
    if (modal) modal.classList.add('hidden');
    window.kembaliKeMenuLatihan();
};

window.kembaliKeMenuLatihan = function() {
    history.back();
};

window.loadRiwayatLatihan = function(namaAnak) {
    document.getElementById('namaSantriLatihan').innerText = namaAnak;
    const containerRiwayat = document.getElementById('containerRiwayatLatihan');

    if (!namaAnak || namaAnak === "-") {
        containerRiwayat.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">Silakan pilih santri terlebih dahulu.</p>';
        return;
    }

    containerRiwayat.innerHTML = '<p class="text-xs text-blue-500 font-bold text-center py-4 animate-pulse">Memuat data dari server...</p>';

    const db = firebase.firestore();

    db.collection("latihan_santri")
      .where("nama", "==", namaAnak)
      .orderBy("waktu", "desc")
      .limit(10)
      .get()
      .then((querySnapshot) => {
          containerRiwayat.innerHTML = '';

          if (querySnapshot.empty) {
              containerRiwayat.innerHTML = '<p class="text-xs text-slate-400 font-medium text-center py-4">Belum ada riwayat kuis.</p>';
              return;
          }

          querySnapshot.forEach((doc) => {
              const data = doc.data();
              const tanggalText = data.waktu ? data.waktu.toDate().toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'}) : "Baru saja";

              let warnaSkor = "text-emerald-600 bg-emerald-50 border-emerald-100";
              if (data.skor < 70) warnaSkor = "text-amber-600 bg-amber-50 border-amber-100";
              if (data.skor < 50) warnaSkor = "text-rose-600 bg-rose-50 border-rose-100";

              let infoTambahan = "";
              if(data.benar !== undefined && data.salah !== undefined) {
                  infoTambahan = `<span class="text-[9px] text-slate-400 ml-2">✓ ${data.benar}  ✗ ${data.salah}</span>`;
              }

              let labelLevel = data.level ? `<span class="text-[10px] font-bold text-slate-400 ml-1">(${formatLabelLevel(data.level)})</span>` : "";

              const itemRiwayat = `
                  <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div class="flex flex-col">
                          <span class="text-sm font-bold text-slate-700">${data.jenisKuis} ${labelLevel}</span>
                          <span class="text-[10px] font-semibold text-slate-400 mt-0.5">${tanggalText} ${infoTambahan}</span>
                      </div>
                      <div class="px-3 py-1.5 rounded-lg border font-extrabold text-sm ${warnaSkor}">
                          ${data.skor}
                      </div>
                  </div>
              `;
              containerRiwayat.innerHTML += itemRiwayat;
          });
      })
      .catch((error) => {
          containerRiwayat.innerHTML = '<p class="text-xs text-rose-500 font-medium text-center py-4">Gagal memuat riwayat. Pastikan Index Firestore sudah dibuat.</p>';
      });
};

const oldNavigateTo = window.navigateTo;
window.navigateTo = function(viewId) {
    if (typeof oldNavigateTo === 'function') {
        oldNavigateTo(viewId);
    }

    if (viewId === 'viewLatihan') {
        const namaAnak = document.getElementById('namaSantri').innerText;
        window.loadRiwayatLatihan(namaAnak);

        document.getElementById('subPageAreaKuis').classList.add('hidden');
        document.getElementById('subPageMenuLatihan').classList.remove('hidden');
    }
};
