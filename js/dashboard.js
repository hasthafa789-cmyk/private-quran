// ==========================================
// 8. STATISTIK DASHBOARD
// ==========================================
function updateLiveDashboardStats() {
    if (!santriAktif) return;

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

    let hjLulus = 0;
    if (typeof daftarHijaiyah !== 'undefined') {
        daftarHijaiyah.forEach((h, idx) => {
            let kunciHuruf = `h_${idx}`; 
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

    const elHafalan = document.getElementById("statCircleHafalan");
    if (elHafalan) {
        let textHafalan = "Belum ada";
        if (santriAktif.terakhirHafalan && santriAktif.progress && santriAktif.progress[santriAktif.terakhirHafalan]) {
            let lastKey = santriAktif.terakhirHafalan;
            let match = lastKey.match(/juz(\d+)_surat(\d+)/);
            if (match && typeof databaseJuz !== 'undefined') {
                let j = parseInt(match[1]); let s = parseInt(match[2]);
                if (databaseJuz[j] && databaseJuz[j][s]) {
                    let namaSurat = databaseJuz[j][s].nama;
                    let arr = santriAktif.progress[lastKey];
                    let ayatTerakhir = 0;
                    for (let i = arr.length - 1; i >= 0; i--) {
                        if (arr[i] === true) { ayatTerakhir = i + 1; break; }
                    }
                    if (ayatTerakhir > 0) textHafalan = `${namaSurat} ayat ${ayatTerakhir}`;
                }
            }
        } 
        else if (santriAktif.progress) {
            let validKeys = Object.keys(santriAktif.progress).filter(key => {
                const arr = santriAktif.progress[key]; return Array.isArray(arr) && arr.some(val => val === true);
            });
            if (validKeys.length > 0) {
                let lastKey = validKeys[validKeys.length - 1];
                let match = lastKey.match(/juz(\d+)_surat(\d+)/);
                if (match && typeof databaseJuz !== 'undefined') {
                    let j = parseInt(match[1]); let s = parseInt(match[2]);
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
                    let idxA = daftarJilidUmmi.findIndex(j => j.id === a); let idxB = daftarJilidUmmi.findIndex(j => j.id === b);
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
                    textUmmi = `${found.nama} hal. ${halTerakhir}`;
                }
            }
        }
        elUmmi.innerText = textUmmi;
    }

    const elHijaiyah = document.getElementById("statCircleHijaiyah");
    if (elHijaiyah) {
        let textHijaiyah = "Belum ada";
        if (santriAktif.terakhirHijaiyah !== undefined && santriAktif.terakhirHijaiyah !== null) {
            let idx = santriAktif.terakhirHijaiyah;
            if (typeof daftarHijaiyah !== 'undefined' && daftarHijaiyah[idx]) {
                let namaHuruf = daftarHijaiyah[idx].split(" ")[0]; 
                textHijaiyah = `Huruf ${namaHuruf}`;
            }
        } 
        else if (santriAktif.huruf && typeof daftarHijaiyah !== 'undefined') {
            for (let i = daftarHijaiyah.length - 1; i >= 0; i--) {
                let kunciHuruf = `h_${i}`;
                if (santriAktif.huruf[kunciHuruf] && parseInt(santriAktif.huruf[kunciHuruf]) > 0) {
                    let namaHuruf = daftarHijaiyah[i].split(" ")[0]; textHijaiyah = `Huruf ${namaHuruf}`; break;
                }
            }
        }
        elHijaiyah.innerText = textHijaiyah;
    }

    const elTajwid = document.getElementById("statCircleTajwid");
    if (elTajwid) {
        let textTajwid = "Belum ada";
        if (santriAktif.terakhirTajwid && typeof klasifikasiTajwid !== 'undefined') {
            let lastId = santriAktif.terakhirTajwid; let foundItem = null;
            for (let k of klasifikasiTajwid) {
                foundItem = k.items.find(item => item.id === lastId); if (foundItem) break;
            }
            if (foundItem) textTajwid = foundItem.nama;
        }
        else if (santriAktif.tajwid && typeof klasifikasiTajwid !== 'undefined') {
            let flatTajwid = [];
            klasifikasiTajwid.forEach(k => k.items.forEach(item => flatTajwid.push(item)));
            for (let i = flatTajwid.length - 1; i >= 0; i--) {
                let tId = flatTajwid[i].id;
                if (santriAktif.tajwid[tId] && parseInt(santriAktif.tajwid[tId]) > 0) {
                    textTajwid = flatTajwid[i].nama; break;
                }
            }
        }
        elTajwid.innerText = textTajwid;
    }
}

