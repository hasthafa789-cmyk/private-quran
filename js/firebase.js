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
        console.log(`Progres hafalan ${santriAktif.nama} berhasil diamankan ke Cloud!`);
        
        try {
            let formatHafalan = "-";
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
                if (foundItem) formatTajwid = foundItem.nama; 
                else formatTajwid = idTajwid.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            }

            let formatUmmi = "-";
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

            // ==========================================================
            // KODE BARU: MENGHITUNG 4 SKOR NYATA & MEREKAM RIWAYAT
            // ==========================================================
            let waktuSekarang = new Date().toLocaleString("id-ID"); 
            
            // 1. Skor Hafalan (Total Ayat Aktif)
            let totalAyatHafal = 0;
            if (santriAktif.progress) {
                for (let key in santriAktif.progress) {
                    let dataAyat = santriAktif.progress[key];
                    if (Array.isArray(dataAyat)) totalAyatHafal += dataAyat.filter(v => v === true).length;
                    else totalAyatHafal += parseInt(dataAyat) || 0;
                }
            }

            // 2. Skor Ummi (Total Halaman Bernilai > 0)
            let totalHalamanUmmi = 0;
            if (santriAktif.ummi) {
                for (let jilid in santriAktif.ummi) {
                    let arr = santriAktif.ummi[jilid];
                    if (Array.isArray(arr)) {
                        totalHalamanUmmi += arr.filter(v => v !== null && v !== undefined && v.nilai > 0).length;
                    }
                }
            }

            // 3. Skor Hijaiyah (Sapu Jagat: Deteksi Angka 5 atau 100, baik berupa teks, angka, maupun objek)
            let totalHijaiyah = 0;
            if (santriAktif.huruf) {
                totalHijaiyah = Object.values(santriAktif.huruf).filter(v => {
                    // Jika data langsung berupa angka/teks 5 atau 100
                    if (v === true || v === 5 || v === "5" || v === 100 || v === "100") return true;
                    
                    // Jika data dibungkus dalam objek (contoh: { nilai: 5 })
                    if (v && typeof v === 'object') {
                        let angkaSkor = v.nilai || v.score || v.value; // Mencari nama properti yang mungkin dipakai
                        if (angkaSkor === 5 || angkaSkor === "5" || angkaSkor === 100 || angkaSkor === "100") return true;
                    }
                    return false;
                }).length;
            }

            // 4. Skor Tajwid (Sapu Jagat: Deteksi Angka 5 atau 100, baik berupa teks, angka, maupun objek)
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

            // Simpan Semua Skor ke dalam 1 Titik Riwayat di Firebase
            db.collection("database_hafalan").doc(santriAktif.nama).update({
                riwayatHafalan: firebase.firestore.FieldValue.arrayUnion({
                    waktu: waktuSekarang,
                    // Data Hafalan
                    capaian: formatHafalan,
                    skor: totalAyatHafal,
                    // Data Ummi
                    capaianUmmi: formatUmmi,
                    skorUmmi: totalHalamanUmmi,
                    // Data Hijaiyah
                    capaianHijaiyah: formatHijaiyah,
                    skorHijaiyah: totalHijaiyah,
                    // Data Tajwid
                    capaianTajwid: formatTajwid,
                    skorTajwid: totalTajwid
                })
            }).catch(e => console.error("Gagal merekam riwayat grafik:", e));
            // ==========================================================

            if (timerSinkronisasiSpreadsheet) clearTimeout(timerSinkronisasiSpreadsheet);
            timerSinkronisasiSpreadsheet = setTimeout(() => {
                const scriptURL = 'https://script.google.com/macros/s/AKfycbzfG3lx60LBCCOHGXs4T8gEQmBTjhZO89qY3HpLF_9Z9P-o8w7XLmJBSI-5VX-5IITfGQ/exec'; // Pastikan URL ini milikmu
                if(scriptURL === 'URL_APLIKASI_WEB_ANDA_DI_SINI') return;

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
                }).then(() => console.log('Final data terkirim ke Spreadsheet!')).catch(error => console.error('Gagal fetch:', error));
            }, 2000); 
            
        } catch(e) { console.error("Kendala format:", e); }
    })
    .catch((error) => console.error("Gagal menyimpan progres:", error));
}