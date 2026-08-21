// ==========================================
// 3. DATA REFERENSI
// ==========================================
const daftarHijaiyah = ["Alif (ا)", "Ba (ب)", "Ta (ت)", "Tsa (ث)", "Jim (ج)", "Ha (ح)", "Kho (خ)", "Dal (د)", "Dzal (ذ)", "Ro (ر)", "Zai (ز)", "Sin (س)", "Syin (ش)", "Shod (ص)", "Dhod (ض)", "Tho (ط)", "Zho (ظ)", "Ain (ع)", "Gho (غ)", "Fa (ف)", "Qof (ق)", "Kaf (ك)", "Lam (ل)", "Mim (م)", "Nun (ن)", "Wawu (و)", "Ha' (هـ)", "Ya (ي)"];

const klasifikasiTajwid = [
    { kategori: "1. Hukum Nun Sukun & Tanwin", items: [{ id: "ns_izhar", nama: "Idzhar Halqi" }, { id: "ns_idg_bi", nama: "Idgham Bighunnah" }, { id: "ns_idg_bila", nama: "Idgham Bilaghunnah" }, { id: "ns_iqlab", nama: "Iqlab" }, { id: "ns_ikhfa", nama: "Ikhfa Haqiqi" }] },
    { kategori: "2. Hukum Mim Sukun", items: [{ id: "ms_ikhfa", nama: "Ikhfa Syafawi" }, { id: "ms_idgham", nama: "Idgham Mimi" }, { id: "ms_izhar", nama: "Idzhar Syafawi" }] },
    { kategori: "3. Hukum Mad (Panjang Bacaan)", items: [{ id: "mad_thabii", nama: "Mad Thabi'i" }, { id: "mad_wajib", nama: "Mad Wajib Muttasil" }, { id: "mad_jaiz", nama: "Mad Jaiz Munfasil" }, { id: "mad_arid", nama: "Mad 'Arid Lissukun" }, { id: "mad_iwadl", nama: "Mad Iwadl" }, { id: "mad_shilah_qashirah", nama: "Mad Shilah Qashirah" }, { id: "mad_shilah_thawilah", nama: "Mad Shilah Thawilah" }, { id: "mad_badal", nama: "Mad Badal" }, { id: "mad_tamkin", nama: "Mad Tamkin" }, { id: "mad_lin", nama: "Mad Lin" }, { id: "mad_lazim_mutsaqal_kalimi", nama: "Mad Lazim Mutsaqal Kalimi" }, { id: "mad_lazim_mukhoffaf_kalimi", nama: "Mad Lazim Mukhoffaf Kalimi" }, { id: "mad_lazim_mutsaqol_harfi", nama: "Mad Lazim Mukhoffaf Harfi" }, { id: "mad_farq", nama: "Mad Farq" }] },
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

const daftarJilidUmmi = [
    { id: "jilid_1", nama: "Jilid 1", halaman: 40 },
    { id: "jilid_2", nama: "Jilid 2", halaman: 40 },
    { id: "jilid_3", nama: "Jilid 3", halaman: 40 },
    { id: "jilid_4", nama: "Jilid 4", halaman: 40 },
    { id: "jilid_5", nama: "Jilid 5", halaman: 40 },
    { id: "jilid_6", nama: "Jilid 6", halaman: 40 },
    { id: "tadarus", nama: "Jilid Tadarus", halaman: 50 },
    { id: "gharib", nama: "Jilid Gharib", halaman: 28 },
    { id: "tajwid", nama: "Jilid Tajwid", halaman: 20 },
    { id: "turjuman_1", nama: "Jilid Turjuman 1", halaman: 20 },
    { id: "turjuman_2", nama: "Jilid Turjuman 2", halaman: 20 },
    { id: "turjuman_3", nama: "Jilid Turjuman 3", halaman: 20 }
];

const kumpulanHadits = [
    { teks: "Sebaik-baik kalian adalah orang yang mempelajari Al-Qur'an dan mengajarkannya.", riwayat: "HR. Bukhari" },
    { teks: "Bacalah Al-Qur'an, karena sesungguhnya ia akan datang pada hari kiamat memberikan syafaat bagi pembacanya.", riwayat: "HR. Muslim" },
    { teks: "Barangsiapa membaca satu huruf dari Kitabullah, maka baginya satu kebaikan. Dan satu kebaikan itu dilipatgandakan menjadi sepuluh kebaikan.", riwayat: "HR. Tirmidzi" },
    { teks: "Orang yang mahir membaca Al-Qur'an kelak akan bersama para malaikat yang mulia lagi taat.", riwayat: "HR. Bukhari & Muslim" },
    { teks: "Tidaklah berkumpul suatu kaum di salah satu rumah Allah (masjid) membaca Kitabullah dan saling mempelajarinya, melainkan akan turun kepada mereka ketenangan.", riwayat: "HR. Muslim" }
];