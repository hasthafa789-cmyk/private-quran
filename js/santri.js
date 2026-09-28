// ==========================================
// 6. FUNGSI PENCARIAN GURU & ROLE BASED
// (butuh helper di ui.js: escapeHtml, showToast, tampilkanKonfirmasi)
// ==========================================

// Cache daftar murid yang boleh diakses (admin: semua murid, guru: murid bimbingan).
// Diambil sekali, dipakai ulang -> tidak query Firestore setiap ganti santri.
let _cacheMuridDiizinkan = null;
async function getMuridDiizinkan(paksaUlang = false) {
    if (_cacheMuridDiizinkan && !paksaUlang) return _cacheMuridDiizinkan;
    let q = db.collection("users").where("role", "==", "murid");
    if (role === "guru") q = q.where("guruPembimbing", "==", namaLogin);
    const snap = await q.get();
    const set = new Set();
    snap.forEach(doc => { const n = doc.data().nama; if (n) set.add(n.toLowerCase()); });
    _cacheMuridDiizinkan = set;
    return set;
}

function setLoadingCari(aktif) {
    const el = document.getElementById("namaInput");
    if (!el) return;
    el.classList.toggle("animate-pulse", aktif);
    el.classList.toggle("opacity-60", aktif);
    el.setAttribute("aria-busy", aktif ? "true" : "false");
}

async function updateDatalistSantri() {
    const datalist = document.getElementById("listSantriTerdaftar");
    if (!datalist) return;

    let daftar = [];
    if (role === "admin") {
        daftar = dataSantri.filter(s => s.nama && s.nama.length > 2);
    } else if (role === "guru") {
        try {
            const diizinkan = await getMuridDiizinkan();
            daftar = dataSantri.filter(s => s.nama && s.nama.length > 2 && diizinkan.has(s.nama.toLowerCase()));
        } catch (e) { console.error("Error Datalist", e); }
    }
    datalist.innerHTML = daftar.map(s => `<option value="${escapeHtml(s.nama)}"></option>`).join("");
}

async function setSantriAktif() {
    if (role === "murid") return;

    const namaInput = document.getElementById("namaInput");
    if (!namaInput) return;
    const nama = namaInput.value.trim();
    const txtNama = document.getElementById("namaSantri");

    if (!nama) {
        santriAktif = null;
        if (txtNama) txtNama.innerText = "-";
        updateLiveDashboardStats(); // sekarang me-reset angka ke 0
        return;
    }

    setLoadingCari(true);
    try {
        const diizinkan = await getMuridDiizinkan();
        let found = dataSantri.find(s => s.nama && s.nama.toLowerCase() === nama.toLowerCase());

        // Admin boleh membuka data yang sudah ada di lokal; selain itu harus ada di daftar izin
        const boleh = diizinkan.has(nama.toLowerCase()) || (role === "admin" && !!found);
        if (!boleh) {
            tampilkanPeringatan(role === "guru"
                ? `Akses ditolak! Santri "${nama}" tidak ditemukan atau bukan murid bimbingan Anda.`
                : `Santri bernama "${nama}" belum memiliki akun di sistem.`);
            return;
        }

        if (!found) {
            const lanjut = await tampilkanKonfirmasi(
                `Santri "${nama}" sudah terdaftar di sistem. Buat lembar progres baru sekarang?`,
                { ya: "Buat sekarang", tidak: "Batal" }
            );
            if (!lanjut) return;
            found = { id: String(Date.now()), nama: nama, progress: {}, huruf: {}, tajwid: {}, ummi: {} };
            santriAktif = found;
            save();
            showToast("Lembar progres baru dibuat", "sukses");
        } else {
            santriAktif = found;
        }

        if (txtNama) txtNama.innerText = found.nama;
        updateLiveDashboardStats();
        if (currentView === 'viewHafalan' && currentJuzAkses) renderSuratBerdasarkanJuz(currentJuzAkses);
        if (currentView === 'viewPenilaian') renderPenilaianModul();
        if (currentView === 'viewUmmi') renderDaftarUmmi();
    } catch (error) {
        console.error("Gagal mengecek data user:", error);
        tampilkanPeringatan("Terjadi kendala saat mengecek akun santri. Periksa koneksi internet Anda.");
    } finally {
        setLoadingCari(false);
    }
}

async function tampilkanDaftarSemuaSantri() {
    if (role === "murid") return;

    const container = document.getElementById("containerSemuaSantri");
    if (!container) return;
    container.innerHTML = `<div class="col-span-full p-4 text-center text-slate-400 font-semibold animate-pulse">Memuat data santri...</div>`;

    try {
        const diizinkan = await getMuridDiizinkan();

        let daftar = role === "admin"
            ? [...dataSantri]
            : dataSantri.filter(s => s.nama && diizinkan.has(s.nama.toLowerCase()));
        daftar = daftar.filter(s => s.nama).sort((a, b) => a.nama.localeCompare(b.nama));

        if (daftar.length === 0) {
            container.innerHTML = `<div class="col-span-full p-6 text-center text-slate-500 font-bold bg-slate-50 rounded-2xl border border-slate-100">Belum ada santri yang progresnya tersimpan.</div>`;
            return;
        }

        // Satu kali render (bukan innerHTML += di dalam loop) + data-nama (aman untuk nama ber-petik seperti Ma'ruf)
        container.innerHTML = daftar.map(santri => {
            const nama = escapeHtml(santri.nama);
            const inisial = escapeHtml(santri.nama.charAt(0).toUpperCase());
            return `
            <div role="button" tabindex="0" data-nama="${nama}" class="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200 cursor-pointer hover:shadow-md hover:border-blue-300 hover:-translate-y-1 transition-all duration-300 group">
                <div class="w-10 h-10 flex-shrink-0 rounded-full bg-blue-50 group-hover:bg-blue-100 text-blue-600 flex items-center justify-center font-extrabold text-lg transition-colors">${inisial}</div>
                <div class="overflow-hidden">
                    <h4 class="font-bold text-slate-800 text-sm truncate">${nama}</h4>
                    <span class="text-xs text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-md mt-1 inline-block">Buka progres</span>
                </div>
            </div>`;
        }).join("");

        // Event delegation: dipasang sekali saja
        if (!container.dataset.bound) {
            container.dataset.bound = "1";
            const buka = (e) => {
                const card = e.target.closest("[data-nama]");
                if (card) pilihSantriCepat(card.dataset.nama);
            };
            container.addEventListener("click", buka);
            container.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); buka(e); } });
        }
    } catch (error) {
        console.error("Gagal memuat daftar santri:", error);
        container.innerHTML = `<div class="col-span-full text-center text-red-500 font-semibold">Gagal memuat data. Periksa koneksi lalu coba lagi.</div>`;
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
