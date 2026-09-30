// ==========================================================
// progres-parser.js
// Parser progres santri (dipakai daftar-santri & murid-bimbingan).
// WAJIB dimuat SETELAH js/data.js (butuh daftarHijaiyah,
// klasifikasiTajwid, databaseJuz, daftarJilidUmmi).
// ==========================================================

// Escape HTML agar data pengguna aman dimasukkan ke innerHTML
function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}

// ==================== PARSER HAFALAN (SUPER OPTIMIZED - ARRAY FIREBASE) ====================
function toTitleCase(str) {
    if (!str) return "";
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

function parseHafalan(textHafalan, dataSantri) {
    if (!textHafalan || textHafalan === "-") return "-";

    // 1. Ambil data progress (asumsi dataSantri adalah objek murid yang berisi progress)
    // Jika dataSantri ternyata adalah langsung objek 'progress', maka gunakan itu.
    let progress = dataSantri.progress || dataSantri; 

    let match = textHafalan.match(/juz(\d+)_surat(\d+)/);
    let keteranganAyat = "";

    // 2. Logika pencarian ayat (mengikuti kode Anda yang sudah berhasil)
    if (progress && progress[textHafalan]) {
        let dataAyat = progress[textHafalan];
        let ayatTerakhir = 0;
        if (Array.isArray(dataAyat)) {
            for (let i = dataAyat.length - 1; i >= 0; i--) {
                if (dataAyat[i] === true) { 
                    ayatTerakhir = i + 1; 
                    break; 
                }
            }
        } else {
            ayatTerakhir = parseInt(dataAyat) || 0;
        }
        if (ayatTerakhir > 0) keteranganAyat = " Ayat " + ayatTerakhir; 
    }

    // 3. Logika nama surat
    if (match && typeof databaseJuz !== 'undefined') {
        let j = parseInt(match[1]); 
        let s = parseInt(match[2]);
        if (databaseJuz[j] && databaseJuz[j][s]) {
            return "Surat " + databaseJuz[j][s].nama + keteranganAyat;
        }
    }

    return textHafalan + keteranganAyat;
}

// 2. Parser Hijaiyah: Otomatis mendeteksi nomor urut huruf (cth: "2" -> Ba (ب))
function parseHijaiyah(text) {
    if (!text || text === "-") return "-";
    
    let txt = text;
    if (typeof text === 'object' && text !== null) {
        txt = text.nama || text.id || Object.values(text)[0] || "-";
    }
    
    let cleanText = String(txt).toLowerCase().trim().replace(/_/g, ' ');
    
    // Fitur Baru: Deteksi jika input berupa angka urutan murni (contoh: 2 atau hijaiyah_2)
    let angkaUrutan = cleanText.replace(/[^0-9]/g, '');
    if (angkaUrutan !== "") {
        let indexHuruf = parseInt(angkaUrutan);
        if (indexHuruf >= 1 && indexHuruf <= daftarHijaiyah.length) {
            return daftarHijaiyah[indexHuruf - 1]; // Konversi ke 0-indexed array
        }
    }
    
    // Jika input berupa teks nama huruf (contoh: "alif" atau "ba")
    let found = daftarHijaiyah.find(h => h.toLowerCase().startsWith(cleanText) || h.toLowerCase().includes(cleanText));
    return found ? found : toTitleCase(txt);
}

// 3. Parser Tajwid
function parseTajwid(text) {
    if (!text || text === "-") return "-";
    let txt = text;
    if (typeof text === 'object' && text !== null) {
        txt = text.id || text.nama || Object.values(text)[0] || "-";
    }
    txt = String(txt);
    for (const kat of klasifikasiTajwid) {
        let found = kat.items.find(item => item.id === txt);
        if (found) return found.nama;
    }
    return toTitleCase(txt);
}
        // 4. Parser Ummi mencocokkan ID Jilid & menghitung Halaman aktif secara dinamis
        function ringkasDataUmmi(dataUmmi) {
            if (!dataUmmi || dataUmmi === "-") return "-";
            
            let obj;
            try {
                obj = typeof dataUmmi === 'string' ? JSON.parse(dataUmmi) : dataUmmi;
            } catch (e) {
                let found = daftarJilidUmmi.find(j => j.id === dataUmmi);
                return found ? found.nama : toTitleCase(dataUmmi);
            }
            
            if (typeof obj !== 'object' || obj === null) {
                let found = daftarJilidUmmi.find(j => j.id === dataUmmi);
                return found ? found.nama : toTitleCase(dataUmmi);
            }

            let jilidAktifObj = null;
            let maxIndex = -1;
            let halamanText = "";

            Object.keys(obj).forEach(key => {
                let index = daftarJilidUmmi.findIndex(j => j.id === key);
                if (index > -1) {
                    let adaData = false;
                    let nomorHal = "";
                    
                    if (Array.isArray(obj[key])) {
                        // Jika struktur data Ummi berupa Array halaman [true, true, null...]
                        adaData = obj[key].some(item => item !== null && item !== "" && item !== false);
                        if (adaData) {
                            let lastIndex = obj[key].map(x => x !== null && x !== "" && x !== false).lastIndexOf(true);
                            nomorHal = lastIndex + 1;
                        }
                    } else if (obj[key] !== null && obj[key] !== "" && obj[key] !== false) {
                        // Jika langsung menyimpan nomor halaman angka/string
                        adaData = true;
                        nomorHal = obj[key];
                    }

                    if (adaData && index > maxIndex) {
                        maxIndex = index;
                        jilidAktifObj = daftarJilidUmmi[index];
                        halamanText = (nomorHal && typeof nomorHal !== 'boolean') ? ` Hal ${nomorHal}` : "";
                    }
                }
            });

            return jilidAktifObj ? `${jilidAktifObj.nama}${halamanText}` : "Aktif";
        }
