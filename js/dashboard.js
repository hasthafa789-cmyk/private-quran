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

// ==========================================================
// 4 GRAFIK PERKEMBANGAN (HAFALAN, UMMI, HIJAIYAH, TAJWID)
// ==========================================================
let myProgressChart = null, myUmmiChart = null, myHijaiyahChart = null, myTajwidChart = null; 

function renderProgressChart() {
    let labelsTanggal = [];
    let dHafalan = [], cHafalan = [];
    let dUmmi = [], cUmmi = [];
    let dHijaiyah = [], cHijaiyah = [];
    let dTajwid = [], cTajwid = [];
    
    if (typeof santriAktif !== 'undefined' && santriAktif && santriAktif.riwayatHafalan && santriAktif.riwayatHafalan.length > 0) {
        let riwayatAsli = [...santriAktif.riwayatHafalan];
        let riwayatHarian = [];
        let tanggalTerakhir = "";

// 1. Ambil nilai final per hari (Dengan perbaikan pemisah tanggal Universal)
        riwayatAsli.forEach((item) => {
            // Memastikan aman mau pakai koma ataupun spasi di device manapun
            let tglOnly = item.waktu ? item.waktu.split(',')[0].split(' ')[0].trim() : "";
            if (tglOnly === tanggalTerakhir) riwayatHarian[riwayatHarian.length - 1] = item;
            else { riwayatHarian.push(item); tanggalTerakhir = tglOnly; }
        });

        // 2. Pecah datanya ke masing-masing array
        riwayatHarian.forEach((item) => {
            let tglOnly = item.waktu ? item.waktu.split(',')[0].split(' ')[0].trim() : "";
            labelsTanggal.push(tglOnly);
            
            dHafalan.push(item.skor || 0);        cHafalan.push(item.capaian || '-');
            dUmmi.push(item.skorUmmi || 0);       cUmmi.push(item.capaianUmmi || '-');
            dHijaiyah.push(item.skorHijaiyah || 0); cHijaiyah.push(item.capaianHijaiyah || '-');
            dTajwid.push(item.skorTajwid || 0);   cTajwid.push(item.capaianTajwid || '-');
        });
    } else {
        labelsTanggal = ['Belum ada'];
        dHafalan = [0]; cHafalan = ['-'];
        dUmmi = [0]; cUmmi = ['-'];
        dHijaiyah = [0]; cHijaiyah = ['-'];
        dTajwid = [0]; cTajwid = ['-'];
    }

   // FUNGSI PABRIK: Membuat chart dengan desain Premium & Profesional
    function buatGrafik(instanceLama, canvasId, labelX, dataY, capaianTeks, warnaHex, warnaRGB, unitGaris) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return instanceLama;
        if (instanceLama) instanceLama.destroy();
        
        const ctx = canvas.getContext('2d');
        
        // 1. Gradasi Warna Super Halus (Stripe/Apple Style)
        let gradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 200);
        gradient.addColorStop(0, warnaRGB + '0.25)'); // Sedikit transparan di atas
        gradient.addColorStop(0.8, warnaRGB + '0.02)'); // Memudar perlahan
        gradient.addColorStop(1, warnaRGB + '0.0)'); // Menghilang sempurna di bawah

        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: labelX,
                datasets: [{
                    data: dataY,
                    capaianKustom: capaianTeks, 
                    borderColor: warnaHex, 
                    borderWidth: 3, // Sedikit lebih tebal agar tegas dan solid
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.4, // Kurva lebih natural dan mengalir
                    
                    // 2. Titik disembunyikan, hanya muncul saat di-hover (Pro Look)
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: warnaHex,
                    pointBorderWidth: 2,
                    pointRadius: 0, // Sembunyikan titik saat diam
                    pointHoverRadius: 6, // Munculkan saat disentuh
                    pointHitRadius: 30 // Area sentuh diperluas agar mudah diklik
                }]
            },
            options: {
                responsive: true, 
                maintainAspectRatio: false,
                
                // 3. Interaksi Pintar (Otomatis deteksi kursor terdekat secara vertikal)
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)', // Warna Slate-900 elegan
                        titleFont: { family: 'Plus Jakarta Sans', size: 12, weight: '800' },
                        bodyFont: { family: 'Plus Jakarta Sans', size: 12, weight: '500' },
                        padding: 12, 
                        cornerRadius: 12, 
                        displayColors: false,
                        borderColor: 'rgba(255,255,255,0.1)', // Border tipis ala Glassmorphism
                        borderWidth: 1,
                        caretSize: 6,
                        callbacks: {
                            // Menambahkan Ikon pada Tooltip
                            title: function(context) {
                                return '📅 ' + context[0].label;
                            },
                            label: function(context) {
                                let index = context.dataIndex;
                                return [
                                    '📈 Total: ' + context.raw + ' ' + unitGaris,
                                    '🎯 Detail: ' + context.dataset.capaianKustom[index]
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: { 
                        grid: { display: false }, 
                        border: { display: false }, // Hilangkan garis tepi X yang kaku
                        ticks: { 
                            font: { family: 'Plus Jakarta Sans', size: 10, weight: '600' }, 
                            color: '#94a3b8',
                            maxRotation: 0, // Jangan biarkan teks miring
                            autoSkip: true,
                            maxTicksLimit: 5 // Batasi maksimal 5 tanggal saja agar tidak berdesakan
                        } 
                    },
                    y: { 
                        display: true, 
                        beginAtZero: true, 
                        border: { display: false }, // Hilangkan garis tepi Y yang kaku
                        grid: { 
                            color: '#f1f5f9', // Garis pembantu sangat tipis
                            drawTicks: false 
                        },
                        ticks: { 
                            precision: 0, 
                            font: { family: 'Plus Jakarta Sans', size: 10, weight: '600' }, 
                            color: '#94a3b8',
                            padding: 8 // Beri jarak antara angka dan grafik
                        }
                    }
                }
            }
        });
    }

    // ==========================================================
    // 3. RENDER 4 GRAFIK (BARIS INI YANG SEBELUMNYA TERHAPUS)
    // ==========================================================
    myProgressChart = buatGrafik(myProgressChart, 'progressChart', labelsTanggal, dHafalan, cHafalan, '#9333ea', 'rgba(147, 51, 234, ', 'Ayat'); 
    myUmmiChart     = buatGrafik(myUmmiChart, 'ummiChart', labelsTanggal, dUmmi, cUmmi, '#2563eb', 'rgba(37, 99, 235, ', 'Hal'); 
    myHijaiyahChart = buatGrafik(myHijaiyahChart, 'hijaiyahChart', labelsTanggal, dHijaiyah, cHijaiyah, '#16a34a', 'rgba(22, 163, 74, ', 'Huruf'); 
    myTajwidChart   = buatGrafik(myTajwidChart, 'tajwidChart', labelsTanggal, dTajwid, cTajwid, '#d97706', 'rgba(217, 119, 6, ', 'Hukum'); 
}