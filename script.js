// ==========================================
// 1. INISIALISASI FIREBASE (VERSI 8 / COMPAT)
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyCIBGqJVfrRZikYeQDtQynWDxybsFFtY-0",
    authDomain: "hasnanprivate.firebaseapp.com",
    projectId: "hasnanprivate",
    storageBucket: "hasnanprivate.firebasestorage.app",
    messagingSenderId: "737022132780",
    appId: "1:737022132780:web:8ab47b587f13ee53900789"
};

// Nyalakan Mesin Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ==========================================
// 2. VARIABEL GLOBAL APLIKASI
// ==========================================
let dataSantri = JSON.parse(localStorage.getItem("dataSantri")) || [];
let santriAktif = null;
let currentView = 'viewDashboard'; 
let currentJuzAkses = null;
let currentJilidAkses = null; 
let currentEditUmmi = { jilidId: null, index: null }; // Variabel penampung form nilai

const role = localStorage.getItem("role");
const namaLogin = localStorage.getItem("nama");

// Proteksi Halaman Sementara (Menyesuaikan sistem lama)
if (localStorage.getItem("login") !== "true") {
    window.location.replace("login.html");
}


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

// ==========================================
// 4. FIREBASE LOGIC (SINKRONISASI & SIMPAN)
// ==========================================
function mulaiSinkronisasiOtomatis() {
    db.collection("database_hafalan").onSnapshot((snapshot) => {
        dataSantri = []; 
        snapshot.forEach((doc) => {
            const docData = doc.data();
            if (docData && docData.nama) {
                dataSantri.push({ id: doc.id, ...docData });
            }
        });

        localStorage.setItem("dataSantri", JSON.stringify(dataSantri));
        console.log("Database hafalan berhasil sinkron secara Real-Time!");
        
        updateDatalistSantri();
        initUser(); 
        
        if (santriAktif && santriAktif.nama) {
            const found = dataSantri.find(s => s.nama && s.nama.toLowerCase() === santriAktif.nama.toLowerCase());
            if (found) santriAktif = found;
            
            updateLiveDashboardStats();
            if (currentView === 'viewHafalan' && currentJuzAkses) renderSuratBerdasarkanJuz(currentJuzAkses);
            if (currentView === 'viewPenilaian') renderPenilaianModul();
            if (currentView === 'viewUmmi') {
                renderDaftarUmmi();
                if(currentJilidAkses) renderHalamanUmmi(currentJilidAkses); // Update Live jika modal terbuka
            }
        }
    });
}

function save() {
    if (!santriAktif || !santriAktif.nama) return;

    db.collection("database_hafalan").doc(santriAktif.nama).set({
        nama: santriAktif.nama,
        progress: santriAktif.progress || {},
        huruf: santriAktif.huruf || {},
        tajwid: santriAktif.tajwid || {},
        ummi: santriAktif.ummi || {},
        terakhirHafalan: santriAktif.terakhirHafalan || null,
        terakhirHijaiyah: santriAktif.terakhirHijaiyah ?? null,
        terakhirTajwid: santriAktif.terakhirTajwid || null
    }, { merge: true })
    .then(() => {
        console.log(`Progres hafalan ${santriAktif.nama} berhasil diamankan ke Cloud!`);
        
        try {
            // ==========================================================
            // 1. TERJEMAHKAN FORMAT NAMA (HAFALAN, HIJAIYAH, TAJWID)
            // ==========================================================
            let formatHafalan = "-";
            if (santriAktif.terakhirHafalan) {
                let textHafalan = String(santriAktif.terakhirHafalan);
                let match = textHafalan.match(/juz(\d+)_surat(\d+)/);
                
                let keteranganAyat = "";
                if (santriAktif.progress && santriAktif.progress[textHafalan]) {
                    let dataAyat = santriAktif.progress[textHafalan];
                    if (Array.isArray(dataAyat)) {
                        keteranganAyat = " Ayat " + Math.max(...dataAyat); 
                    } else {
                        keteranganAyat = " Ayat " + dataAyat; 
                    }
                }

                if (match && typeof databaseJuz !== 'undefined') {
                    let j = parseInt(match[1]);
                    let s = parseInt(match[2]);
                    if (databaseJuz[j] && databaseJuz[j][s]) {
                        formatHafalan = "Surat " + databaseJuz[j][s].nama + keteranganAyat;
                    } else {
                        formatHafalan = textHafalan + keteranganAyat;
                    }
                } else {
                    formatHafalan = textHafalan + keteranganAyat;
                }
            }

            let formatHijaiyah = "-";
            if (santriAktif.terakhirHijaiyah !== undefined && santriAktif.terakhirHijaiyah !== null) {
                let idx = parseInt(santriAktif.terakhirHijaiyah);
                if (typeof daftarHijaiyah !== 'undefined' && daftarHijaiyah[idx]) {
                    formatHijaiyah = "Huruf " + daftarHijaiyah[idx].split(" ")[0]; 
                }
            }

            let formatTajwid = "-";
            if (santriAktif.terakhirTajwid && typeof klasifikasiTajwid !== 'undefined') {
                let idTajwid = String(santriAktif.terakhirTajwid);
                let foundItem = null;
                for (let k of klasifikasiTajwid) {
                    foundItem = k.items.find(item => item.id === idTajwid);
                    if (foundItem) break;
                }
                if (foundItem) {
                    formatTajwid = foundItem.nama; 
                } else {
                    formatTajwid = idTajwid.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                }
            }

            // ==========================================================
            // LOGIK BARU: MENGAMBIL DATA METODE UMMI TERTINGGI SECARA OTOMATIS
            // ==========================================================
            let formatUmmi = "-";
            if (santriAktif.ummi && typeof daftarJilidUmmi !== 'undefined') {
                // Saring jilid yang memiliki nilai (ada yang dikerjakan)
                let validKeys = Object.keys(santriAktif.ummi).filter(key => {
                    const arr = santriAktif.ummi[key];
                    return Array.isArray(arr) && arr.some(v => v !== null && v !== undefined && v.nilai > 0);
                });

                if (validKeys.length > 0) {
                    // Urutkan untuk mencari jilid tertinggi
                    validKeys.sort((a, b) => {
                        let idxA = daftarJilidUmmi.findIndex(j => j.id === a);
                        let idxB = daftarJilidUmmi.findIndex(j => j.id === b);
                        return idxA - idxB;
                    });
                    
                    let lastKey = validKeys[validKeys.length - 1]; // Jilid paling tinggi
                    let found = daftarJilidUmmi.find(j => j.id === lastKey);
                    
                    if (found) {
                        let arr = santriAktif.ummi[lastKey];
                        let halTerakhir = 0;
                        // Cari halaman terakhir yang ada nilainya
                        for (let i = arr.length - 1; i >= 0; i--) {
                            if (arr[i] !== null && arr[i] !== undefined && arr[i].nilai > 0) {
                                halTerakhir = i + 1;
                                break;
                            }
                        }
                        formatUmmi = found.nama + " Halaman " + halTerakhir;
                    }
                }
            }

            // ==========================================================
            // 2. KIRIM KE SPREADSHEET
            // ==========================================================
            const scriptURL = 'https://script.google.com/macros/s/AKfycbzMWyxk3LGgIURE2wIqaYnvUQIHiDSiN86HVZG1GtcHxAWy1150kKCJcadrFaJyZ3EI1w/exec'; // <--- MASUKKAN URL WEB APP SCRIPT ANDA DI SINI
            
            if(scriptURL === 'URL_APLIKASI_WEB_ANDA_DI_SINI') {
                console.warn("Gagal: Anda belum memasukkan URL Google Apps Script Anda!");
                return;
            }

            fetch(scriptURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8' 
                },
                body: JSON.stringify({
                    nama: santriAktif.nama,
                    terakhirHafalan: formatHafalan,
                    terakhirHijaiyah: formatHijaiyah,
                    terakhirTajwid: formatTajwid,
                    terakhirUmmi: formatUmmi // <--- Data Ummi sekarang sudah terbaca!
                })
            })
            .then(response => console.log('Sukses sinkron seluruh data termasuk metode Ummi!'))
            .catch(error => console.error('Gagal fetch ke Spreadsheet:', error));
            
        } catch(e) {
            console.error("Terjadi kendala saat merapikan format data:", e);
        }
    })
    .catch((error) => console.error("Gagal menyimpan progres:", error));
}

// ==========================================
// 5. INISIALISASI HALAMAN
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    mulaiSinkronisasiOtomatis(); 
    initGreeting();
    tampilkanHaditsAcak();

    // JINAKKAN INPUT NAMA
    const namaInput = document.getElementById("namaInput");
    if (namaInput) {
        namaInput.removeAttribute("oninput");
        namaInput.removeAttribute("onkeyup");
        namaInput.removeAttribute("onchange");
        
        namaInput.addEventListener("keydown", function(event) {
            if (event.key === "Enter") {
                event.preventDefault(); 
                setSantriAktif(); 
            }
        });
    }
});

function initGreeting() {
    const jam = new Date().getHours();
    let ucapan = "Selamat Malam"; let iconName = "nights_stay";
    if (jam >= 4 && jam < 10) { ucapan = "Selamat Pagi"; iconName = "sunny"; } 
    else if (jam >= 10 && jam < 15) { ucapan = "Selamat Siang"; iconName = "wb_sunny"; } 
    else if (jam >= 15 && jam < 18) { ucapan = "Selamat Sore"; iconName = "partly_cloudy_day"; }

    const el = document.getElementById("txtGreeting");
    if (el) el.innerHTML = `<span class="flex items-center justify-center gap-1.5"><span class="material-symbols-outlined text-sm leading-none">${iconName}</span>${ucapan}</span>`;
}

function initUser() {
    if (dataSantri.length === 0 || !namaLogin) return;
    
    if (role === "murid") {
       santriAktif = dataSantri.find(s => s.nama && s.nama.toLowerCase() === namaLogin.toLowerCase());
       
       if (!santriAktif) {
           santriAktif = { id: String(Date.now()), nama: namaLogin, progress: {}, huruf: {}, tajwid: {}, ummi: {} };
           save(); 
       }
       
       const input = document.getElementById("namaInput");
       if (input) { input.value = namaLogin; input.disabled = true; }
       
       const namaEl = document.getElementById("namaSantri");
       if (namaEl) namaEl.innerText = namaLogin;
       
       updateLiveDashboardStats();
    }
}

function tampilkanHaditsAcak() {
    const teksEl = document.querySelector("blockquote");
    if (!teksEl) return;

    let riwayatEl = teksEl.nextElementSibling;
    if (riwayatEl && riwayatEl.tagName === 'DIV') { riwayatEl = riwayatEl.nextElementSibling; }
    
    if (teksEl && riwayatEl && riwayatEl.tagName === 'P') {
        const indexAcak = Math.floor(Math.random() * kumpulanHadits.length);
        const haditsTerpilih = kumpulanHadits[indexAcak];
        teksEl.innerText = `"${haditsTerpilih.teks}"`;
        riwayatEl.innerText = haditsTerpilih.riwayat;
    }
}

// ==========================================
// 6. FUNGSI PENCARIAN GURU
// ==========================================
function updateDatalistSantri() {
    const datalist = document.getElementById("listSantriTerdaftar");
    if (!datalist) return;
    datalist.innerHTML = "";
    dataSantri.forEach(s => {
        if (s.nama && s.nama.length > 2) { datalist.innerHTML += `<option value="${s.nama}"></option>`; }
    });
}

function setSantriAktif() {
    if (role === "murid") return;
    
    const namaInput = document.getElementById("namaInput");
    if (!namaInput) return;
    const nama = namaInput.value.trim();
    
    if (!nama) {
        santriAktif = null;
        const txtNama = document.getElementById("namaSantri");
        if (txtNama) txtNama.innerText = "-";
        updateLiveDashboardStats();
        return;
    }

    let found = dataSantri.find(s => s.nama && s.nama.toLowerCase() === nama.toLowerCase());
    
    if (!found) {
        const konfirmasi = confirm(`Santri bernama "${nama}" belum memiliki data. Buat lembar progress baru?`);
        if (konfirmasi) {
            found = { id: String(Date.now()), nama: nama, progress: {}, huruf: {}, tajwid: {}, ummi: {} };
            santriAktif = found;
            save(); 
        } else {
            return;
        }
    } else {
        santriAktif = found;
    }

    const txtNama = document.getElementById("namaSantri");
    if (txtNama) txtNama.innerText = found.nama;
    
    updateLiveDashboardStats();
    if (currentView === 'viewHafalan' && currentJuzAkses) renderSuratBerdasarkanJuz(currentJuzAkses);
    if (currentView === 'viewPenilaian') renderPenilaianModul();
    if (currentView === 'viewUmmi') renderDaftarUmmi();
}

// ==========================================
// 7. NAVIGASI UTAMA
// ==========================================
function navigateTo(viewId) {
    currentView = viewId;
    const views = ["viewDashboard", "viewHafalan", "viewPenilaian", "viewUmmi"];

    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.classList.add("hidden"); el.classList.remove("animate-entry"); }
    });

    if(viewId === 'viewHafalan') {
        const sub1 = document.getElementById('subPageDaftarJuz');
        const sub2 = document.getElementById('subPageDetailSuratJuz');
        if(sub1) sub1.classList.remove('hidden');
        if(sub2) sub2.classList.add('hidden');
    }

    if(viewId === 'viewPenilaian') {
        const sub1 = document.getElementById('subPageMenuPenilaian');
        const sub2 = document.getElementById('subPageDetailHijaiyah');
        const sub3 = document.getElementById('subPageDetailTajwid');
        if(sub1) sub1.classList.remove('hidden');
        if(sub2) sub2.classList.add('hidden');
        if(sub3) sub3.classList.add('hidden');
        renderPenilaianModul();
    }
    
    if(viewId === 'viewUmmi') {
        const sub1 = document.getElementById('subPageDaftarUmmi');
        const sub2 = document.getElementById('subPageDetailUmmi');
        if(sub1) sub1.classList.remove('hidden');
        if(sub2) sub2.classList.add('hidden');
        renderDaftarUmmi();
    }

    if(viewId === 'viewDashboard') {
        tampilkanHaditsAcak();
        updateLiveDashboardStats();
    }

    const target = document.getElementById(viewId);
    if (target) {
        target.classList.remove("hidden");
        setTimeout(() => target.classList.add("animate-entry"), 10); 
    }
}

// ==========================================
// 8. STATISTIK DASHBOARD
// ==========================================
function updateLiveDashboardStats() {
    if (!santriAktif) return;

    // --- 1. HITUNG TOTAL ITEM SELESAI ---
    let hSelesai = 0;
    if (typeof databaseJuz !== 'undefined') {
        Object.keys(databaseJuz).forEach(jNum => {
            databaseJuz[jNum].forEach((s, idx) => {
                const key = `juz${jNum}_surat${idx}`;
                const p = santriAktif.progress?.[key];
                if (p && p.length === s.ayat && p.every(v => v === true)) hSelesai++;
            });
        });
    }
    const tHafalan = document.getElementById("totalSelesaiAyat");
    if (tHafalan) tHafalan.innerText = hSelesai;

    let uLulus = 0;
    if (typeof daftarJilidUmmi !== 'undefined') {
        daftarJilidUmmi.forEach(j => {
            const u = santriAktif.ummi?.[j.id];
            if (u && Array.isArray(u) && u.length === j.halaman && u.every(v => typeof v === "object" && v !== null && v.nilai >= 70)) {
                uLulus++;
            }
        });
        const tUmmi = document.getElementById("totalSelesaiUmmi");
        if (tUmmi) tUmmi.innerText = `${uLulus} / ${daftarJilidUmmi.length}`;
    }

// --- SEBELUMNYA ---
    // daftarHijaiyah.forEach(h => {
    //     if (santriAktif.huruf?.[h] && parseInt(santriAktif.huruf[h]) >= 4) hjLulus++;
    // });

    // --- PERBAIKAN ---
    let hjLulus = 0;
    if (typeof daftarHijaiyah !== 'undefined') {
        daftarHijaiyah.forEach((h, idx) => {
            let kunciHuruf = `h_${idx}`; // Sesuaikan dengan format penyimpanan h_0, h_1, dst.
            if (santriAktif.huruf?.[kunciHuruf] && parseInt(santriAktif.huruf[kunciHuruf]) >= 4) hjLulus++;
        });
        const tHijaiyah = document.getElementById("totalLulusHijaiyah");
        if (tHijaiyah) tHijaiyah.innerText = `${hjLulus} / 28`;
    }

    let tajLulus = 0;
    let totalTajwid = 0;
    if (typeof klasifikasiTajwid !== 'undefined') {
        klasifikasiTajwid.forEach(k => {
            k.items.forEach(i => {
                totalTajwid++;
                if (santriAktif.tajwid?.[i.id] && parseInt(santriAktif.tajwid[i.id]) >= 4) tajLulus++;
            });
        });
        const tTajwid = document.getElementById("totalFasihTajwid");
        if (tTajwid) tTajwid.innerText = `${tajLulus} / ${totalTajwid}`;
    }


    // --- 2. FITUR PENCAPAIAN TERAKHIR (DENGAN KETERANGAN DETAIL) ---
    
    // A. HAFALAN (Berdasarkan Surat yang Terakhir Di-input Secara Akurat)
    const elHafalan = document.getElementById("statCircleHafalan");
    if (elHafalan) {
        let textHafalan = "Belum ada";
        
        // 1. Cek apakah ada rekam jejak surat terakhir dari fungsi toggleAyat
        if (santriAktif.terakhirHafalan && santriAktif.progress && santriAktif.progress[santriAktif.terakhirHafalan]) {
            let lastKey = santriAktif.terakhirHafalan;
            let match = lastKey.match(/juz(\d+)_surat(\d+)/);
            
            if (match && typeof databaseJuz !== 'undefined') {
                let j = parseInt(match[1]);
                let s = parseInt(match[2]);
                if (databaseJuz[j] && databaseJuz[j][s]) {
                    let namaSurat = databaseJuz[j][s].nama;
                    
                    let arr = santriAktif.progress[lastKey];
                    let ayatTerakhir = 0;
                    for (let i = arr.length - 1; i >= 0; i--) {
                        if (arr[i] === true) { ayatTerakhir = i + 1; break; }
                    }
                    if (ayatTerakhir > 0) {
                        textHafalan = `${namaSurat} ayat ${ayatTerakhir}`;
                    }
                }
            }
        } 
        // 2. Fallback (Data Lama): Jika belum ada histori input terbaru
        else if (santriAktif.progress) {
            let validKeys = Object.keys(santriAktif.progress).filter(key => {
                const arr = santriAktif.progress[key];
                return Array.isArray(arr) && arr.some(val => val === true);
            });

            if (validKeys.length > 0) {
                let lastKey = validKeys[validKeys.length - 1];
                let match = lastKey.match(/juz(\d+)_surat(\d+)/);
                if (match && typeof databaseJuz !== 'undefined') {
                    let j = parseInt(match[1]);
                    let s = parseInt(match[2]);
                    if (databaseJuz[j] && databaseJuz[j][s]) {
                        let namaSurat = databaseJuz[j][s].nama;
                        
                        let arr = santriAktif.progress[lastKey];
                        let ayatTerakhir = 0;
                        for (let i = arr.length - 1; i >= 0; i--) {
                            if (arr[i] === true) { ayatTerakhir = i + 1; break; }
                        }
                        textHafalan = `${namaSurat} ayat ${ayatTerakhir}`;
                    }
                }
            }
        }
        elHafalan.innerText = textHafalan;
    }

    // B. UMMI (Diurutkan otomatis untuk mencari jilid tertinggi)
    const elUmmi = document.getElementById("statCircleUmmi");
    if (elUmmi) {
        let textUmmi = "Belum ada";
        if (santriAktif.ummi && typeof daftarJilidUmmi !== 'undefined') {
            let validKeys = Object.keys(santriAktif.ummi).filter(key => {
                const arr = santriAktif.ummi[key];
                return Array.isArray(arr) && arr.some(v => v !== null && v !== undefined && v.nilai > 0);
            });

            if (validKeys.length > 0) {
                validKeys.sort((a, b) => {
                    let idxA = daftarJilidUmmi.findIndex(j => j.id === a);
                    let idxB = daftarJilidUmmi.findIndex(j => j.id === b);
                    return idxA - idxB;
                });
                
                let lastKey = validKeys[validKeys.length - 1];
                let found = daftarJilidUmmi.find(j => j.id === lastKey);
                
                if (found) {
                    let arr = santriAktif.ummi[lastKey];
                    let halTerakhir = 0;
                    for (let i = arr.length - 1; i >= 0; i--) {
                        if (arr[i] !== null && arr[i] !== undefined && arr[i].nilai > 0) {
                            halTerakhir = i + 1;
                            break;
                        }
                    }
                    textUmmi = `${found.nama} hal. ${halTerakhir}`;
                }
            }
        }
        elUmmi.innerText = textUmmi;
    }

// C. HIJAIYAH (Berdasarkan Huruf Terakhir Di-input Secara Akurat)
    const elHijaiyah = document.getElementById("statCircleHijaiyah");
    if (elHijaiyah) {
        let textHijaiyah = "Belum ada";
        
        // 1. Cek apakah ada rekam jejak huruf terakhir dari siklusNilaiHuruf
        if (santriAktif.terakhirHijaiyah !== undefined && santriAktif.terakhirHijaiyah !== null) {
            let idx = santriAktif.terakhirHijaiyah;
            if (typeof daftarHijaiyah !== 'undefined' && daftarHijaiyah[idx]) {
                let namaHuruf = daftarHijaiyah[idx].split(" ")[0]; 
                textHijaiyah = `Huruf ${namaHuruf}`;
            }
        } 
        // 2. Fallback (Data Lama): Jika belum ada histori input terbaru, cari yang terjauh
        else if (santriAktif.huruf && typeof daftarHijaiyah !== 'undefined') {
            for (let i = daftarHijaiyah.length - 1; i >= 0; i--) {
                let kunciHuruf = `h_${i}`;
                if (santriAktif.huruf[kunciHuruf] && parseInt(santriAktif.huruf[kunciHuruf]) > 0) {
                    let namaHuruf = daftarHijaiyah[i].split(" ")[0];
                    textHijaiyah = `Huruf ${namaHuruf}`;
                    break;
                }
            }
        }
        elHijaiyah.innerText = textHijaiyah;
    }

// D. TAJWID (Berdasarkan Tajwid Terakhir Di-input Secara Akurat)
    const elTajwid = document.getElementById("statCircleTajwid");
    if (elTajwid) {
        let textTajwid = "Belum ada";
        
        // 1. Cek apakah ada rekam jejak tajwid terakhir dari siklusNilaiTajwid
        if (santriAktif.terakhirTajwid && typeof klasifikasiTajwid !== 'undefined') {
            let lastId = santriAktif.terakhirTajwid;
            let foundItem = null;
            
            // Cari nama tajwid berdasarkan ID-nya di klasifikasiTajwid
            for (let k of klasifikasiTajwid) {
                foundItem = k.items.find(item => item.id === lastId);
                if (foundItem) break;
            }
            
            if (foundItem) {
                textTajwid = foundItem.nama;
            }
        }
        // 2. Fallback (Data Lama): Jika belum ada histori input terbaru, cari yang terjauh
        else if (santriAktif.tajwid && typeof klasifikasiTajwid !== 'undefined') {
            let flatTajwid = [];
            klasifikasiTajwid.forEach(k => k.items.forEach(item => flatTajwid.push(item)));
            
            for (let i = flatTajwid.length - 1; i >= 0; i--) {
                let tId = flatTajwid[i].id;
                if (santriAktif.tajwid[tId] && parseInt(santriAktif.tajwid[tId]) > 0) {
                    textTajwid = flatTajwid[i].nama;
                    break;
                }
            }
        }
        elTajwid.innerText = textTajwid;
    }
}
// ==========================================
// 9. MODUL HAFALAN BACAAN (AL-QURAN)
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
    if (!santriAktif) return tampilkanPeringatan ("Pilih atau masukkan nama santri terlebih dahulu di kolom pencarian atas!");
    
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
        <button onclick="event.stopPropagation(); ${isMurid ? "tampilkanPeringatan ('Penandaan ayat hanya boleh dilakukan oleh Guru!')" : `toggleAyat(${juzNum}, ${suratIndex}, ${i})`}" 
                class="w-10 h-10 rounded-xl font-bold text-xs flex items-center justify-center transition focus:outline-none ${done ? 'bg-blue-600 text-white shadow-md shadow-blue-500/40 ring-2 ring-blue-500 ring-offset-2' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">
            ${i + 1}
        </button>`;
    }
}

function toggleAyat(juzNum, suratIndex, ayatIndex) {
    if (!santriAktif || role === "murid") return; 
    const keyProgres = `juz${juzNum}_surat${suratIndex}`;
    santriAktif.progress[keyProgres][ayatIndex] = !santriAktif.progress[keyProgres][ayatIndex];
    
    // --- TAMBAHAN BARU: Catat surat terakhir yang baru saja di-input ---
    santriAktif.terakhirHafalan = keyProgres; 

    save(); 
    renderAyat(juzNum, suratIndex);
    if (currentJuzAkses) renderSuratBerdasarkanJuz(currentJuzAkses); 
}

function closeDetail() {
    document.body.style.overflow = 'auto'; 
    const suratDetail = document.getElementById("suratDetail");
    const backdropDetail = document.getElementById("backdropDetail");
    
    if(suratDetail) suratDetail.classList.add("hidden");
    
    const ummiDetail = document.getElementById("ummiDetail");
    if (backdropDetail && (!ummiDetail || ummiDetail.classList.contains("hidden"))) {
        backdropDetail.classList.add("hidden");
    }
    
    if (currentJuzAkses) renderSuratBerdasarkanJuz(currentJuzAkses);
    updateLiveDashboardStats();
}

// ==========================================
// 10. MODUL PENILAIAN HIJAIYAH & TAJWID
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
        let itemsHtml = `<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">`;
        klasor.items.forEach((item) => {
            const currentVal = parseInt(santriAktif?.tajwid?.[item.id] || "0");
            const persenCard = Math.round((currentVal / 5) * 100); 
            const infoLevel = levelHijaiyah[currentVal] || levelHijaiyah[0];

            const borderColors = [
                "border-slate-200 hover:border-slate-300", "border-rose-200/80 shadow-sm shadow-rose-100/30", 
                "border-orange-200/80 shadow-sm shadow-orange-100/30", "border-amber-200/80 shadow-sm shadow-amber-100/30", 
                "border-blue-200/80 shadow-sm shadow-blue-100/30", "border-emerald-200/80 shadow-sm shadow-emerald-100/30"
            ];
            const bColor = borderColors[currentVal] || borderColors[0];
            const badgeStyles = [
                "bg-slate-100 text-slate-600", "bg-rose-100 text-rose-700", "bg-orange-100 text-orange-700",
                "bg-amber-100 text-amber-700", "bg-blue-100 text-blue-700", "bg-emerald-100 text-emerald-700"
            ];
            const badgeStyle = badgeStyles[currentVal] || badgeStyles[0];

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
        containerTajwid.innerHTML += `
        <div class="space-y-4 w-full">
            <h4 class="text-xs font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2 mt-2 mb-1">
                <span class="w-2 h-2 rounded-full bg-indigo-500 shadow-sm shadow-indigo-400"></span> ${klasor.kategori}
            </h4>
            ${itemsHtml}
        </div>`;
    });
}

function siklusNilaiHuruf(idx, currentVal) {
    if (!santriAktif || role === "murid") return;
    if (!santriAktif.huruf) santriAktif.huruf = {};
    santriAktif.huruf[`h_${idx}`] = String((parseInt(currentVal) + 1) % 6);
    
    // --- TAMBAHAN BARU: Catat huruf terakhir yang baru saja di-input ---
    santriAktif.terakhirHijaiyah = idx;

    save(); renderPenilaianModul();
}

function siklusNilaiTajwid(id, currentVal) {
    if (!santriAktif || role === "murid") return;
    if (!santriAktif.tajwid) santriAktif.tajwid = {};
    santriAktif.tajwid[id] = String((parseInt(currentVal) + 1) % 6);
    
    // --- TAMBAHAN BARU: Catat tajwid terakhir yang baru saja di-input ---
    santriAktif.terakhirTajwid = id;

    save(); renderPenilaianModul();
}

// ==========================================
// 11. MODUL METODE UMMI (REVISI NILAI 1-100) - FIXED FOR MURID ROLE
// ==========================================
function renderDaftarUmmi() {
    const grid = document.getElementById("containerListUmmi");
    if (!grid) return; 
    grid.innerHTML = "";

    daftarJilidUmmi.forEach((jilid) => {
        const total = jilid.halaman;
        const progress = santriAktif?.ummi?.[jilid.id] || [];
        
        let done = 0;
        for(let i=0; i<total; i++) {
            let dataP = progress[i];
            if(dataP === true) done++; 
            else if(dataP && dataP.nilai !== undefined && dataP.nilai > 0) done++;
        }
        
        const persen = Math.round((done / total) * 100);

        let color = "#ef4444"; let bgLight = "bg-white";
        if (persen >= 50) color = "#f59e0b";
        if (persen >= 80) color = "#8b5cf6"; 
        if (persen === 100) bgLight = "bg-purple-50/50 border-purple-200";

        grid.innerHTML += `
        <div onclick="openJilidUmmi('${jilid.id}')" class="flex items-center gap-3 p-4 rounded-2xl border border-slate-100 cursor-pointer ${bgLight} hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
            <div class="flex-shrink-0 group-hover:scale-105 transition-transform">${circularProgress(persen, color)}</div>
            <div>
                <h4 class="font-extrabold text-slate-800 text-sm tracking-tight group-hover:text-purple-700 transition-colors">${jilid.nama}</h4>
                <span class="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md mt-1 inline-block">${jilid.halaman} Halaman</span>
            </div>
        </div>`;
    });
}

function openJilidUmmi(jilidId) {
    if (!santriAktif) return tampilkanPeringatan ("Pilih atau masukkan nama santri terlebih dahulu di kolom pencarian atas!");
    
    currentJilidAkses = jilidId;
    document.body.style.overflow = 'hidden'; 
    
    const backdrop = document.getElementById("backdropDetail");
    const modal = document.getElementById("ummiDetail");
    
    if(backdrop) backdrop.classList.remove("hidden");
    if(modal) modal.classList.remove("hidden");
    
    const jilid = daftarJilidUmmi.find(j => j.id === jilidId);
    const textJudul = document.getElementById("judulUmmi");
    if(textJudul) textJudul.innerText = `${jilid.nama} (${jilid.halaman} Halaman)`;
    
    renderHalamanUmmi(jilidId);
}

function renderHalamanUmmi(jilidId) {
    const container = document.getElementById("halamanUmmiList");
    if (!container) return; 
    container.innerHTML = "";
    
    const jilid = daftarJilidUmmi.find(j => j.id === jilidId);
    const total = jilid.halaman;
    const isMurid = (role === "murid");

    if (!santriAktif.ummi) santriAktif.ummi = {};
    if (!santriAktif.ummi[jilidId]) santriAktif.ummi[jilidId] = Array(total).fill(null);

    for (let i = 0; i < total; i++) {
        let dataHalaman = santriAktif.ummi[jilidId][i];
        
        // Kompatibilitas data lama
        if(dataHalaman === true) dataHalaman = { nilai: 100, catatan: "Telah Diselesaikan (Data Lama)" };
        
        const isDone = dataHalaman && dataHalaman.nilai !== undefined && dataHalaman.nilai !== null;
        const teksNilai = isDone ? dataHalaman.nilai : "";
        const adaCatatan = isDone && dataHalaman.catatan && dataHalaman.catatan.trim() !== "";
        
        // --- LOGIKA WARNA DINAMIS BERDASARKAN NILAI ---
        let bgStyle = 'bg-slate-100 text-slate-700 hover:bg-slate-200'; // Default belum dinilai
        if (isDone) {
            if (dataHalaman.nilai < 75) {
                // Jika nilai di bawah 75: Berwarna merah (Merah Tailwind)
                bgStyle = 'bg-rose-600 text-white shadow-md shadow-rose-500/40 ring-2 ring-rose-500 ring-offset-2';
            } else {
                // Jika nilai 70 ke atas: Berwarna ungu (Bawaan sistem sebelumnya)
                bgStyle = 'bg-purple-600 text-white shadow-md shadow-purple-500/40 ring-2 ring-purple-500 ring-offset-2';
            }
        }

        // Teks indikator warna kecil di bawah angka halaman jika sudah dinilai
        let teksIndikatorWarna = isDone ? (dataHalaman.nilai < 75 ? 'text-rose-200' : 'text-purple-200') : '';
        
        const aksi = isMurid 
            ? `bukaLihatNilaiUmmi('${jilidId}', ${i})` 
            : `bukaFormNilaiUmmi('${jilidId}', ${i})`;

        container.innerHTML += `
        <button onclick="event.stopPropagation(); ${aksi}" 
                title="${isDone ? 'Nilai: ' + dataHalaman.nilai : 'Belum dinilai'}"
                class="relative w-12 h-12 rounded-xl font-bold text-xs flex flex-col items-center justify-center transition focus:outline-none ${bgStyle}">
            
            <span class="text-sm">${i + 1}</span>
            ${isDone ? `<span class="text-[9px] font-bold ${teksIndikatorWarna} leading-none mt-0.5">${teksNilai}</span>` : ''}
            
            ${adaCatatan ? `<span class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full flex items-center justify-center border-2 border-white"><span class="material-symbols-outlined text-[8px] text-white">edit_note</span></span>` : ''}
        </button>`;
    }
}

// FUNGSI UTK MURID MELIHAT POPUP NILAI & CATATAN (FIXED)
window.bukaLihatNilaiUmmi = function(jilidId, index) {
    console.log("Mencoba membuka nilai untuk murid:", jilidId, index);
    if (!santriAktif) return alert("Data santri aktif tidak ditemukan.");

    let data = santriAktif.ummi?.[jilidId]?.[index];
    
    // Normalisasi jika masih berupa format data lama (boolean)
    if (data === true) data = { nilai: 100, catatan: "Telah Diselesaikan (Data Lama)" };
    
    if (!data || data.nilai === undefined || data.nilai === null) {
        tampilkanPeringatan ("Halaman ini belum memiliki penilaian dari Guru.");
        return;
    }

    const modalLihat = document.getElementById('modalLihatUmmi');
    const displayNilai = document.getElementById('displayNilaiUmmi');
    const displayCatatan = document.getElementById('displayCatatanUmmi');

    // Opsi A: Jika elemen modalLihatUmmi ada di HTML, gunakan itu
    if (modalLihat && displayNilai && displayCatatan) {
        displayNilai.innerText = data.nilai;
        displayCatatan.innerText = data.catatan || "- Tidak ada catatan -";
        modalLihat.classList.remove('hidden');
    } else {
        // Opsi B (Fallback cerdas): Jika modal khusus murid belum dibuat di HTML, 
        // kita gunakan modal penilaian guru saja tapi di-set READ-ONLY dan sembunyikan tombol aksi.
        const modalForm = document.getElementById('modalPenilaianUmmi');
        const inputNilai = document.getElementById('inputNilaiUmmi');
        const inputCatatan = document.getElementById('inputCatatanUmmi');
        const judulForm = document.getElementById('judulFormUmmi');

        if (modalForm && inputNilai && inputCatatan) {
            if (judulForm) judulForm.innerText = `Detail Nilai Halaman ${index + 1} (Hanya Baca)`;
            
            inputNilai.value = data.nilai;
            inputNilai.disabled = true; // Kunci input nilai
            
            inputCatatan.value = data.catatan || '';
            inputCatatan.disabled = true; // Kunci input catatan
            
            // Sembunyikan tombol Simpan & Hapus agar murid tidak bisa utak-atik
            const btnSimpan = modalForm.querySelector('button[onclick*="simpanNilaiUmmi"]');
            const btnHapus = modalForm.querySelector('button[onclick*="hapusNilaiUmmi"]');
            if (btnSimpan) btnSimpan.classList.add('hidden');
            if (btnHapus) btnHapus.classList.add('hidden');
            
            modalForm.classList.remove('hidden');
        } else {
            // Jalur terakhir jika seluruh elemen modal tidak ditemukan sama sekali
            alert(`[Detail Nilai Halaman ${index + 1}]\n\nNilai: ${data.nilai}\nCatatan: ${data.catatan || '- Tidak ada catatan -'}`);
        }
    }
}

window.tutupLihatNilaiUmmi = function() {
    const modal = document.getElementById('modalLihatUmmi');
    if(modal) modal.classList.add('hidden');
}

// ------------------------------------------
// Fungsi Formulir Input Nilai Ummi (UNTUK GURU)
// ------------------------------------------
function bukaFormNilaiUmmi(jilidId, index) {
    if (role === "murid") return;
    currentEditUmmi = { jilidId, index };
    
    let data = santriAktif.ummi?.[jilidId]?.[index] || { nilai: '', catatan: '' };
    if(typeof data === 'boolean') data = { nilai: data ? 100 : '', catatan: '' }; 

    const inputNilai = document.getElementById('inputNilaiUmmi');
    const inputCatatan = document.getElementById('inputCatatanUmmi');
    const judulForm = document.getElementById('judulFormUmmi');
    const modalForm = document.getElementById('modalPenilaianUmmi');

    if (inputNilai) { inputNilai.value = data.nilai || ''; inputNilai.disabled = false; }
    if (inputCatatan) { inputCatatan.value = data.catatan || ''; inputCatatan.disabled = false; }
    if (judulForm) judulForm.innerText = `Input Halaman ${index + 1}`;
    
    if (modalForm) {
        // Kembalikan tombol simpan & hapus yang mungkin sempat tersembunyi karena role murid
        const btnSimpan = modalForm.querySelector('button[onclick*="simpanNilaiUmmi"]');
        const btnHapus = modalForm.querySelector('button[onclick*="hapusNilaiUmmi"]');
        if (btnSimpan) btnSimpan.classList.remove('hidden');
        if (btnHapus) btnHapus.classList.remove('hidden');
        
        modalForm.classList.remove('hidden');
    }
}

function tutupFormNilaiUmmi() {
    document.getElementById('modalPenilaianUmmi').classList.add('hidden');
}

function simpanNilaiUmmi() {
    const nilaiInput = document.getElementById('inputNilaiUmmi').value;
    const nilai = parseInt(nilaiInput);
    const catatan = document.getElementById('inputCatatanUmmi').value;
    const { jilidId, index } = currentEditUmmi;

    if (!nilaiInput || isNaN(nilai) || nilai < 1 || nilai > 100) {
        tampilkanPeringatan ("Mohon masukkan nilai berupa angka antara 1 sampai 100.");
        return;
    }

    if (!santriAktif.ummi[jilidId]) santriAktif.ummi[jilidId] = [];
    santriAktif.ummi[jilidId][index] = { nilai: nilai, catatan: catatan };
    
    save();
    renderHalamanUmmi(jilidId);
    tutupFormNilaiUmmi();
    
    if (currentView === 'viewUmmi') renderDaftarUmmi();
    updateLiveDashboardStats();
}

function hapusNilaiUmmi() {
    const { jilidId, index } = currentEditUmmi;
    if (!santriAktif.ummi[jilidId]) return;
    
    santriAktif.ummi[jilidId][index] = null; 
    save();
    renderHalamanUmmi(jilidId);
    tutupFormNilaiUmmi();
    
    if (currentView === 'viewUmmi') renderDaftarUmmi();
    updateLiveDashboardStats();
}

function closeUmmiDetail() {
    currentJilidAkses = null; 
    document.body.style.overflow = 'auto'; 
    
    const modal = document.getElementById("ummiDetail");
    const backdrop = document.getElementById("backdropDetail");
    
    if(modal) modal.classList.add("hidden");
    
    const suratDetail = document.getElementById("suratDetail");
    if(backdrop && (!suratDetail || suratDetail.classList.contains("hidden"))) {
         backdrop.classList.add("hidden");
    }
    
    if (currentView === 'viewUmmi') renderDaftarUmmi();
    updateLiveDashboardStats();
}

// ==========================================
// 12. VISUAL UTILITIES & LAINNYA
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

function logout() { 
    localStorage.removeItem("login"); 
    window.location.href = "login.html"; 
}

window.addEventListener("load", () => {
    const splash = document.getElementById("splashScreen");
    if(splash) {
        setTimeout(() => {
            splash.style.opacity = '0'; 
            setTimeout(() => { splash.style.display = 'none'; }, 1000); 
        }, 1200); 
    }
});

window.addEventListener('pageshow', function(event) {
   if (event.persisted || localStorage.getItem("login") !== "true") {
      if (localStorage.getItem("login") !== "true") {
//             window.location.replace("login.html");
       }
    }
 });

async function daftarkanUserBaru(email, password, namaLengkap, role) {
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        await db.collection("users").doc(user.uid).set({ nama: namaLengkap, role: role });
        console.log(`Akun ${namaLengkap} berhasil dibuat!`);
    } catch (error) {
        console.error("Gagal mendaftarkan user:", error.message);
    }
}

// ==========================================
// FUNGSI POPUP PERINGATAN KUSTOM
// ==========================================
function tampilkanPeringatan(pesan) {
    const modal = document.getElementById("modalPeringatan");
    const teksEl = document.getElementById("teksPeringatan");
    
    if (teksEl) teksEl.innerText = pesan;
    if (modal) modal.classList.remove("hidden");
}

function tutupPeringatan() {
    const modal = document.getElementById("modalPeringatan");
    if (modal) modal.classList.add("hidden");
}