// ==========================================
// 6. FUNGSI PENCARIAN GURU & ROLE BASED
// ==========================================
async function updateDatalistSantri() {
    const datalist = document.getElementById("listSantriTerdaftar");
    if (!datalist) return;
    datalist.innerHTML = "";

    // Berikan saran pencarian berdasarkan role
    if (role === "admin") {
        dataSantri.forEach(s => {
            if (s.nama && s.nama.length > 2) { datalist.innerHTML += `<option value="${s.nama}"></option>`; }
        });
    } else if (role === "guru") {
        try {
            const snapshot = await db.collection("users").where("role", "==", "murid").where("guruPembimbing", "==", namaLogin).get();
            let muridDiizinkan = [];
            snapshot.forEach(doc => muridDiizinkan.push(doc.data().nama.toLowerCase()));
            
            dataSantri.forEach(s => {
                if (s.nama && s.nama.length > 2 && muridDiizinkan.includes(s.nama.toLowerCase())) { 
                    datalist.innerHTML += `<option value="${s.nama}"></option>`; 
                }
            });
        } catch(e) { console.error("Error Datalist", e); }
    }
}

async function setSantriAktif() {
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
    
    // VALIDASI KE FIREBASE (ROLE BASED)
    if (!found) {
        try {
            let usersQuery = db.collection("users").where("role", "==", "murid");
            if (role === "guru") {
                usersQuery = usersQuery.where("guruPembimbing", "==", namaLogin);
            }

            const usersSnapshot = await usersQuery.get();
            let isRegisteredAndAllowed = false;
            
            usersSnapshot.forEach((doc) => {
                const userData = doc.data();
                if (userData.nama && userData.nama.toLowerCase() === nama.toLowerCase()) {
                    isRegisteredAndAllowed = true;
                }
            });

            if (!isRegisteredAndAllowed) {
                if (role === "guru") tampilkanPeringatan(`Akses ditolak! Santri bernama "${nama}" tidak ditemukan atau bukan merupakan murid bimbingan Anda.`);
                else tampilkanPeringatan(`Santri bernama "${nama}" belum memiliki akun di sistem.`);
                return; 
            } else {
                const konfirmasi = confirm(`Santri bernama "${nama}" sudah terdaftar di sistem. Buat lembar progress baru sekarang?`);
                if (konfirmasi) {
                    found = { id: String(Date.now()), nama: nama, progress: {}, huruf: {}, tajwid: {}, ummi: {} };
                    santriAktif = found;
                    save(); 
                } else {
                    return; 
                }
            }
        } catch (error) {
            console.error("Gagal mengecek data user:", error);
            tampilkanPeringatan("Terjadi kendala saat mengecek akun santri.");
            return;
        }
    } else {
        // Jika data sudah ada di local, tetap verifikasi khusus Guru
        if (role === "guru") {
            try {
                const checkAkses = await db.collection("users").where("role", "==", "murid").where("guruPembimbing", "==", namaLogin).get();
                let diizinkan = false;
                checkAkses.forEach(doc => { if (doc.data().nama && doc.data().nama.toLowerCase() === nama.toLowerCase()) diizinkan = true; });

                if (!diizinkan) {
                    tampilkanPeringatan(`Akses ditolak! Santri "${nama}" bukan murid bimbingan Anda.`);
                    return;
                }
            } catch(e) {
                tampilkanPeringatan("Gagal memverifikasi hak akses."); return;
            }
        }
        santriAktif = found;
    }

    const txtNama = document.getElementById("namaSantri");
    if (txtNama) txtNama.innerText = found.nama;
    
    updateLiveDashboardStats();
    if (currentView === 'viewHafalan' && currentJuzAkses) renderSuratBerdasarkanJuz(currentJuzAkses);
    if (currentView === 'viewPenilaian') renderPenilaianModul();
    if (currentView === 'viewUmmi') renderDaftarUmmi();
}

async function tampilkanDaftarSemuaSantri() {
    if (role === "murid") return; 

    const container = document.getElementById("containerSemuaSantri");
    if (!container) return;
    container.innerHTML = `<div class="col-span-full p-4 text-center">Memuat data santri...</div>`;

    try {
        let usersQuery = db.collection("users").where("role", "==", "murid");
        if (role === "guru") {
            usersQuery = usersQuery.where("guruPembimbing", "==", namaLogin);
        }
        
        const snapshot = await usersQuery.get();
        let namaMuridDiizinkan = [];
        snapshot.forEach(doc => {
            if (doc.data().nama) {
                namaMuridDiizinkan.push(doc.data().nama.toLowerCase());
            }
        });

        let santriDitampilkan = [];
        if (role === "admin") {
            santriDitampilkan = [...dataSantri].sort((a, b) => a.nama.localeCompare(b.nama));
        } else if (role === "guru") {
            santriDitampilkan = dataSantri.filter(s => 
                s.nama && namaMuridDiizinkan.includes(s.nama.toLowerCase())
            ).sort((a, b) => a.nama.localeCompare(b.nama));
        }

        container.innerHTML = ""; 
        if (santriDitampilkan.length === 0) {
            container.innerHTML = `<div class="col-span-full p-6 text-center text-slate-500 font-bold bg-slate-50 rounded-2xl border border-slate-100">Belum ada data progres murid Anda yang tersimpan.</div>`;
            return;
        }

        santriDitampilkan.forEach((santri) => {
            const inisial = santri.nama.charAt(0).toUpperCase();
            container.innerHTML += `
            <div onclick="pilihSantriCepat('${santri.nama}')" class="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200 cursor-pointer hover:shadow-md hover:border-blue-300 hover:-translate-y-1 transition-all duration-300 group">
                <div class="w-10 h-10 flex-shrink-0 rounded-full bg-blue-50 group-hover:bg-blue-100 text-blue-600 flex items-center justify-center font-extrabold text-lg transition-colors">
                    ${inisial}
                </div>
                <div class="overflow-hidden">
                    <h4 class="font-bold text-slate-800 text-sm truncate">${santri.nama}</h4>
                    <span class="text-[10px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-md mt-1 inline-block">Klik untuk buka progres</span>
                </div>
            </div>`;
        });

    } catch (error) {
        console.error("Gagal memuat daftar santri:", error);
        container.innerHTML = `<div class="col-span-full text-center text-red-500">Gagal memuat data.</div>`;
    }
}

function pilihSantriCepat(nama) {
    const namaInput = document.getElementById("namaInput");
    if (namaInput) {
        namaInput.value = nama;
        setSantriAktif(); 
        const container = document.getElementById("containerSemuaSantri");
        if (container) container.innerHTML = ""; 
    }
}

// ==========================================
