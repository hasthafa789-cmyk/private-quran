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
            
            // Update teks dan angka di dashboard
            updateLiveDashboardStats();
            
            // ==========================================================
            // TAMBAHAN BARU: RENDER GRAFIK SECARA REAL-TIME
            // ==========================================================
            if (typeof renderProgressChart === 'function') {
                renderProgressChart();
            }
            
            // Update halaman lain jika sedang terbuka
            if (currentView === 'viewHafalan' && currentJuzAkses) renderSuratBerdasarkanJuz(currentJuzAkses);
            if (currentView === 'viewPenilaian') renderPenilaianModul();
            if (currentView === 'viewUmmi') {
                renderDaftarUmmi();
                if(currentJilidAkses) renderHalamanUmmi(currentJilidAkses);
            }
        }
    });
}

let timerSinkronisasiSpreadsheet = null;

function save() {
    const user = firebase.auth().currentUser;
    if (!user) {
        console.error("Upaya penyimpanan ditolak: Pengguna tidak terautentikasi.");
        tampilkanPeringatan("Sesi Anda telah habis. Silakan login kembali untuk menyimpan data.");
        return; 
    }
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
        
        let formatHafalan = "-";
        let formatHijaiyah = "-";
        let formatTajwid = "-";
        let formatUmmi = "-";

        // Mencegah error format agar tidak membatalkan penyimpanan grafik
        try {
            if (santriAktif.terakhirHafalan) {
                let textHafalan = String(santriAktif.terakhirHafalan);
                let match = textHafalan.match(/juz(\d+)_surat(\d+)/);
                let keteranganAyat = "";
                if (santriAktif.progress && santriAktif.progress[textHafalan]) {
                    let dataAyat = santriAktif.progress[textHafalan];
                    let ayatTerakhir = 0;
                    if (Array.isArray(dataAyat)) {
                        for (let i = dataAyat.length - 1; i >= 0; i--) {
                            if (dataAyat[i] === true) { ayatTerakhir = i + 1; break; }
                        }
                    } else { ayatTerakhir = parseInt(dataAyat) || 0; }
                    if (ayatTerakhir > 0) keteranganAyat = " Ayat " + ayatTerakhir; 
                }

                if (match && typeof databaseJuz !== 'undefined') {
                    let j = parseInt(match[1]); let s = parseInt(match[2]);
                    if (databaseJuz[j] && databaseJuz[j][s]) formatHafalan = "Surat " + databaseJuz[j][s].nama + keteranganAyat;
                    else formatHafalan = textHafalan + keteranganAyat;
                } else formatHafalan = textHafalan + keteranganAyat;
            }

            if (santriAktif.terakhirHijaiyah !== undefined && santriAktif.terakhirHijaiyah !== null) {
                let idx = parseInt(santriAktif.terakhirHijaiyah);
                if (typeof daftarHijaiyah !== 'undefined' && daftarHijaiyah[idx]) {
                    formatHijaiyah = "Huruf " + String(daftarHijaiyah[idx]).split(" ")[0]; 
                }
            }

            if (santriAktif.terakhirTajwid && typeof klasifikasiTajwid !== 'undefined') {
                let idTajwid = String(santriAktif.terakhirTajwid);
                let foundItem = null;
                for (let k of klasifikasiTajwid) {
                    foundItem = k.items.find(item => item.id === idTajwid);
                    if (foundItem) break;
                }
                if (foundItem) formatTajwid = foundItem.nama; 
                else formatTajwid = idTajwid.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            }

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
                                halTerakhir = i + 1; break;
                            }
                        }
                        formatUmmi = found.nama + " Halaman " + halTerakhir;
                    }
                }
            }
        } catch(e) { console.error("Kendala pemformatan teks:", e); }

        // ==========================================================
        // KODE BARU: MENGHITUNG SKOR & MEREKAM RIWAYAT (BULLETPROOF)
        // ==========================================================
        try {
            let waktuSekarang = new Date().toLocaleString("id-ID"); 
            
            let totalAyatHafal = 0;
            if (santriAktif.progress) {
                for (let key in santriAktif.progress) {
                    let dataAyat = santriAktif.progress[key];
                    if (Array.isArray(dataAyat)) totalAyatHafal += dataAyat.filter(v => v === true).length;
                    else totalAyatHafal += parseInt(dataAyat) || 0;
                }
            }

            let totalHalamanUmmi = 0;
            if (santriAktif.ummi) {
                for (let jilid in santriAktif.ummi) {
                    let arr = santriAktif.ummi[jilid];
                    if (Array.isArray(arr)) {
                        totalHalamanUmmi += arr.filter(v => v !== null && v !== undefined && v.nilai > 0).length;
                    }
                }
            }

            let totalHijaiyah = 0;
            if (santriAktif.huruf) {
                totalHijaiyah = Object.values(santriAktif.huruf).filter(v => {
                    if (v === true || v === 5 || v === "5" || v === 100 || v === "100") return true;
                    if (v && typeof v === 'object') {
                        let angkaSkor = v.nilai || v.score || v.value;
                        if (angkaSkor === 5 || angkaSkor === "5" || angkaSkor === 100 || angkaSkor === "100") return true;
                    }
                    return false;
                }).length;
            }

            let totalTajwid = 0;
            if (santriAktif.tajwid) {
                totalTajwid = Object.values(santriAktif.tajwid).filter(v => {
                    if (v === true || v === 5 || v === "5" || v === 100 || v === "100") return true;
                    if (v && typeof v === 'object') {
                        let angkaSkor = v.nilai || v.score || v.value;
                        if (angkaSkor === 5 || angkaSkor === "5" || angkaSkor === 100 || angkaSkor === "100") return true;
                    }
                    return false;
                }).length;
            }

            // KUNCI PERBAIKAN: Bypass arrayUnion agar tidak ditolak Firebase
            let riwayatBaru = [];
            if (Array.isArray(santriAktif.riwayatHafalan)) {
                riwayatBaru = [...santriAktif.riwayatHafalan];
            }
            
            riwayatBaru.push({
                waktu: waktuSekarang,
                capaian: formatHafalan || "-",
                skor: totalAyatHafal || 0,
                capaianUmmi: formatUmmi || "-",
                skorUmmi: totalHalamanUmmi || 0,
                capaianHijaiyah: formatHijaiyah || "-",
                skorHijaiyah: totalHijaiyah || 0,
                capaianTajwid: formatTajwid || "-",
                skorTajwid: totalTajwid || 0
            });

            db.collection("database_hafalan").doc(santriAktif.nama).update({
                riwayatHafalan: riwayatBaru
            }).catch(e => console.error("Gagal update riwayat ke Firebase:", e));

        } catch(errRiwayat) { console.error("Crash saat menghitung riwayat:", errRiwayat); }
        // ==========================================================

        if (timerSinkronisasiSpreadsheet) clearTimeout(timerSinkronisasiSpreadsheet);
        timerSinkronisasiSpreadsheet = setTimeout(() => {
            const scriptURL = 'https://script.google.com/macros/s/AKfycbzfG3lx60LBCCOHGXs4T8gEQmBTjhZO89qY3HpLF_9Z9P-o8w7XLmJBSI-5VX-5IITfGQ/exec'; 
            fetch(scriptURL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    nama: santriAktif.nama,
                    terakhirHafalan: formatHafalan,
                    terakhirHijaiyah: formatHijaiyah,
                    terakhirTajwid: formatTajwid,
                    terakhirUmmi: formatUmmi 
                })
            }).catch(error => console.error('Gagal fetch:', error));
        }, 2000); 
        
    })
    .catch((error) => console.error("Gagal menyimpan progres utama:", error));
}