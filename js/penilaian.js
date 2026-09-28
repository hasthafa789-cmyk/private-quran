// ==========================================
// 10. MODUL PENILAIAN HIJAIYAH & TAJWID
// Perubahan: nilai dipilih lewat bottom sheet (bukan tap berputar),
// ada tombol Urungkan, hanya kartu yang berubah yang dirender ulang,
// dan penyimpanan ditunda sebentar agar tidak menyimpan di setiap ketukan.
// Membutuhkan: toast.js (showToast), dan variabel global lama:
// role, santriAktif, save(), daftarHijaiyah, klasifikasiTajwid, circularProgress()
// ==========================================

const LEVEL_NILAI = [
    { teks: "Belum Dinilai",   warna: "#ef4444", bg: "bg-white",           badge: "bg-slate-100 text-slate-600",     border: "border-slate-200 hover:border-slate-300" },
    { teks: "Sangat Kurang",   warna: "#f43f5e", bg: "bg-rose-50/40",      badge: "bg-rose-100 text-rose-700",       border: "border-rose-200/80 shadow-sm shadow-rose-100/30" },
    { teks: "Kurang",          warna: "#f97316", bg: "bg-orange-50/40",    badge: "bg-orange-100 text-orange-700",   border: "border-orange-200/80 shadow-sm shadow-orange-100/30" },
    { teks: "Cukup",           warna: "#f59e0b", bg: "bg-amber-50/40",     badge: "bg-amber-100 text-amber-700",     border: "border-amber-200/80 shadow-sm shadow-amber-100/30" },
    { teks: "Baik",            warna: "#3b82f6", bg: "bg-blue-50/30",      badge: "bg-blue-100 text-blue-700",       border: "border-blue-200/80 shadow-sm shadow-blue-100/30" },
    { teks: "Lancar (Mumtaz)", warna: "#10b981", bg: "bg-emerald-50/50",   badge: "bg-emerald-100 text-emerald-700", border: "border-emerald-200/80 shadow-sm shadow-emerald-100/30" }
];

// ------------------------------------------
// Util kecil
// ------------------------------------------
function escAttr(teks) {
    return String(teks ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function idKartu(tipe, key) {
    return `kartu-${tipe}-${String(key).replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

function ambilNilai(tipe, key) {
    if (!santriAktif) return 0;
    const raw = tipe === "huruf" ? santriAktif.huruf?.[`h_${key}`] : santriAktif.tajwid?.[key];
    const n = parseInt(raw || "0");
    return (n >= 0 && n <= 5) ? n : 0;
}

function namaItem(tipe, key) {
    if (tipe === "huruf") return daftarHijaiyah[key];
    for (const k of klasifikasiTajwid) {
        const f = k.items.find(i => i.id === key);
        if (f) return f.nama;
    }
    return String(key);
}

// ------------------------------------------
// Penyimpanan tertunda (debounce)
// ------------------------------------------
let _timerSimpan = null;

function simpanTertunda() {
    clearTimeout(_timerSimpan);
    _timerSimpan = setTimeout(() => { _timerSimpan = null; save(); }, 600);
}

function simpanSekarangJikaAdaAntrean() {
    if (_timerSimpan) { clearTimeout(_timerSimpan); _timerSimpan = null; save(); }
}

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") simpanSekarangJikaAdaAntrean();
});
window.addEventListener("pagehide", simpanSekarangJikaAdaAntrean);

// ------------------------------------------
// HTML kartu
// ------------------------------------------
function htmlKartuHuruf(idx) {
    const isMurid = (role === "murid");
    const val = ambilNilai("huruf", idx);
    const info = LEVEL_NILAI[val];
    const persen = Math.round((val / 5) * 100);
    const isi = `
        <div class="flex-shrink-0">${circularProgress(persen, info.warna)}</div>
        <div class="flex-1 min-w-0">
            <h4 class="font-bold text-slate-800 text-sm tracking-tight truncate">${daftarHijaiyah[idx]}</h4>
            <span class="text-[11px] text-slate-500 font-semibold mt-0.5 inline-block truncate">${info.teks}</span>
        </div>`;
    const kelas = `flex items-center gap-4 p-4 w-full text-left bg-white rounded-2xl border border-slate-100 ${info.bg}`;

    if (isMurid) return `<div id="${idKartu("huruf", idx)}" class="${kelas}">${isi}</div>`;
    return `<button type="button" id="${idKartu("huruf", idx)}" data-tipe="huruf" data-key="${idx}"
        aria-label="${escAttr(daftarHijaiyah[idx])}, nilai ${info.teks}. Ketuk untuk mengubah nilai"
        class="${kelas} cursor-pointer active:scale-95 transition hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">${isi}</button>`;
}

function htmlKartuTajwid(item) {
    const isMurid = (role === "murid");
    const val = ambilNilai("tajwid", item.id);
    const info = LEVEL_NILAI[val];
    const persen = Math.round((val / 5) * 100);
    const isi = `
        <div class="flex-shrink-0 transition-transform duration-300 group-hover:scale-105">${circularProgress(persen, info.warna)}</div>
        <div class="flex-1 min-w-0 space-y-1.5">
            <h4 class="font-bold text-slate-800 text-sm tracking-tight leading-snug whitespace-normal break-words" title="${escAttr(item.nama)}">${item.nama}</h4>
            <span class="inline-flex items-center text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${info.badge}">${info.teks}</span>
        </div>`;
    const kelas = `flex items-center gap-4 p-4 w-full text-left bg-white rounded-2xl border ${info.border} ${info.bg}`;

    if (isMurid) return `<div id="${idKartu("tajwid", item.id)}" class="${kelas}">${isi}</div>`;
    return `<button type="button" id="${idKartu("tajwid", item.id)}" data-tipe="tajwid" data-key="${escAttr(item.id)}"
        aria-label="${escAttr(item.nama)}, nilai ${info.teks}. Ketuk untuk mengubah nilai"
        class="${kelas} cursor-pointer hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 hover:shadow-md hover:shadow-slate-100 group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">${isi}</button>`;
}

// ------------------------------------------
// Render penuh (dipanggil saat halaman dibuka / santri berganti)
// ------------------------------------------
function renderPenilaianModul() {
    const containerHuruf = document.getElementById("listHurufHijaiyah");
    const containerTajwid = document.getElementById("listHukumTajwidKlasifikasi");
    if (!containerHuruf || !containerTajwid) return;

    containerHuruf.innerHTML = daftarHijaiyah.map((_, idx) => htmlKartuHuruf(idx)).join("");

    containerTajwid.innerHTML = klasifikasiTajwid.map(klasor => `
        <div class="space-y-4 w-full">
            <h4 class="text-xs font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2 mt-2 mb-1">
                <span class="w-2 h-2 rounded-full bg-indigo-500 shadow-sm shadow-indigo-400"></span> ${klasor.kategori}
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                ${klasor.items.map(item => htmlKartuTajwid(item)).join("")}
            </div>
        </div>`).join("");

    pasangEventPenilaian(containerHuruf);
    pasangEventPenilaian(containerTajwid);
}

// Delegasi event: dipasang sekali per kontainer
function pasangEventPenilaian(container) {
    if (container.dataset.terpasang === "1") return;
    container.dataset.terpasang = "1";
    container.addEventListener("click", (e) => {
        const kartu = e.target.closest("[data-tipe]");
        if (!kartu || !container.contains(kartu)) return;
        bukaSheetNilai(kartu.dataset.tipe, kartu.dataset.tipe === "huruf" ? parseInt(kartu.dataset.key) : kartu.dataset.key);
    });
}

// Perbarui satu kartu saja (tanpa merender ulang seluruh daftar)
function perbaruiKartu(tipe, key, fokus = false) {
    const el = document.getElementById(idKartu(tipe, key));
    if (!el) return;
    let html;
    if (tipe === "huruf") {
        html = htmlKartuHuruf(key);
    } else {
        let item = null;
        for (const k of klasifikasiTajwid) { item = k.items.find(i => i.id === key); if (item) break; }
        if (!item) return;
        html = htmlKartuTajwid(item);
    }
    const tpl = document.createElement("template");
    tpl.innerHTML = html.trim();
    const baru = tpl.content.firstElementChild;
    el.replaceWith(baru);
    if (fokus) baru.focus({ preventScroll: true });
}

// ------------------------------------------
// Mengubah nilai
// ------------------------------------------
function setNilai(tipe, key, nilai) {
    if (tipe === "huruf") {
        if (!santriAktif.huruf) santriAktif.huruf = {};
        santriAktif.huruf[`h_${key}`] = String(nilai);
    } else {
        if (!santriAktif.tajwid) santriAktif.tajwid = {};
        santriAktif.tajwid[key] = String(nilai);
    }
}

function terapkanNilai(tipe, key, nilaiBaru) {
    if (!santriAktif || role === "murid") return;
    const nilaiLama = ambilNilai(tipe, key);
    if (nilaiBaru === nilaiLama) return;

    const terakhirLama = tipe === "huruf" ? santriAktif.terakhirHijaiyah : santriAktif.terakhirTajwid;

    setNilai(tipe, key, nilaiBaru);
    if (tipe === "huruf") santriAktif.terakhirHijaiyah = key; else santriAktif.terakhirTajwid = key;

    perbaruiKartu(tipe, key, true);
    simpanTertunda();

    const nama = String(namaItem(tipe, key));
    const namaPendek = nama.length > 28 ? nama.slice(0, 27) + "…" : nama;

    showToast(`${namaPendek}: ${LEVEL_NILAI[nilaiBaru].teks}`, {
        type: "success",
        actionLabel: "Urungkan",
        onAction: () => {
            if (!santriAktif) return;
            setNilai(tipe, key, nilaiLama);
            if (tipe === "huruf") santriAktif.terakhirHijaiyah = terakhirLama; else santriAktif.terakhirTajwid = terakhirLama;
            perbaruiKartu(tipe, key);
            simpanTertunda();
            showToast("Perubahan dibatalkan", { type: "info" });
        }
    });
}

// ------------------------------------------
// Bottom sheet pemilih nilai
// ------------------------------------------
let _sheetKonteks = null; // { tipe, key }

function pastikanSheet() {
    let sheet = document.getElementById("sheetNilai");
    if (sheet) return sheet;

    if (!document.getElementById("sheetNilaiStyle")) {
        const st = document.createElement("style");
        st.id = "sheetNilaiStyle";
        st.textContent = `
            @keyframes sheetNaik { from { transform: translateY(100%); } to { transform: translateY(0); } }
            @keyframes sheetMuncul { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
            @keyframes sheetLatar { from { opacity: 0; } to { opacity: 1; } }
            #sheetNilaiPanel { animation: sheetNaik .25s cubic-bezier(.2,.8,.2,1) both; }
            #sheetNilaiLatar { animation: sheetLatar .2s ease both; }
            @media (min-width: 640px) { #sheetNilaiPanel { animation-name: sheetMuncul; } }
            @media (prefers-reduced-motion: reduce) { #sheetNilaiPanel, #sheetNilaiLatar { animation: none; } }
        `;
        document.head.appendChild(st);
    }

    sheet = document.createElement("div");
    sheet.id = "sheetNilai";
    sheet.className = "fixed inset-0 z-[60] hidden flex items-end sm:items-center justify-center";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    sheet.setAttribute("aria-labelledby", "sheetNilaiJudul");
    sheet.innerHTML = `
        <div id="sheetNilaiLatar" data-sheet-tutup class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"></div>
        <div id="sheetNilaiPanel" class="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
             style="padding-bottom: max(1.25rem, env(safe-area-inset-bottom));">
            <div class="sm:hidden flex justify-center pt-3"><span class="w-10 h-1 rounded-full bg-slate-200"></span></div>
            <div class="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
                <div class="min-w-0">
                    <p class="text-xs font-semibold text-slate-400">Ubah nilai</p>
                    <h3 id="sheetNilaiJudul" class="text-base font-extrabold text-slate-800 tracking-tight break-words"></h3>
                </div>
                <button type="button" data-sheet-tutup aria-label="Tutup" class="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:scale-90 transition flex-shrink-0">
                    <span class="material-symbols-outlined text-xl">close</span>
                </button>
            </div>
            <div id="sheetNilaiDaftar" class="px-3 space-y-1"></div>
            <p class="px-5 pt-3 text-xs text-slate-400 font-medium">Nilai Baik ke atas dihitung fasih di dashboard.</p>
        </div>`;
    document.body.appendChild(sheet);

    sheet.addEventListener("click", (e) => {
        if (e.target.closest("[data-sheet-tutup]")) { tutupSheetNilai(); return; }
        const pilihan = e.target.closest("[data-nilai]");
        if (pilihan && _sheetKonteks) {
            const { tipe, key } = _sheetKonteks;
            const nilai = parseInt(pilihan.dataset.nilai);
            tutupSheetNilai(false);
            if (nilai === ambilNilai(tipe, key)) {
                const el = document.getElementById(idKartu(tipe, key));
                if (el) el.focus({ preventScroll: true });
            } else {
                terapkanNilai(tipe, key, nilai);
            }
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && _sheetKonteks) tutupSheetNilai();
    });

    // Tombol Back di HP menutup sheet, bukan meninggalkan halaman
    window.addEventListener("popstate", () => { if (_sheetKonteks) tutupSheetNilai(false); });

    return sheet;
}

function bukaSheetNilai(tipe, key) {
    if (role === "murid") return;

    if (!santriAktif) {
        showToast("Pilih santri dulu lewat kolom pencarian.", { type: "info" });
        const input = document.getElementById("namaInput");
        if (input) { input.scrollIntoView({ block: "center", behavior: "smooth" }); input.focus({ preventScroll: true }); }
        return;
    }

    const sheet = pastikanSheet();
    _sheetKonteks = { tipe, key };
    const nilaiSekarang = ambilNilai(tipe, key);

    document.getElementById("sheetNilaiJudul").textContent = namaItem(tipe, key);
    document.getElementById("sheetNilaiDaftar").innerHTML = LEVEL_NILAI.map((lv, n) => {
        const aktif = n === nilaiSekarang;
        return `
        <button type="button" data-nilai="${n}" aria-pressed="${aktif}"
            class="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                   ${aktif ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-slate-50"}">
            <span class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold text-white flex-shrink-0" style="background:${lv.warna}">${n}</span>
            <span class="flex-1 text-sm font-bold text-slate-700">${lv.teks}</span>
            ${aktif ? '<span class="material-symbols-outlined text-blue-600 text-xl">check_circle</span>' : ""}
        </button>`;
    }).join("");

    sheet.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");

    const target = sheet.querySelector(`[data-nilai="${nilaiSekarang}"]`) || sheet.querySelector("[data-nilai]");
    if (target) target.focus({ preventScroll: true });
}

function tutupSheetNilai(kembalikanFokus = true) {
    const sheet = document.getElementById("sheetNilai");
    if (!sheet) return;
    const konteks = _sheetKonteks;
    _sheetKonteks = null;
    sheet.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
    if (kembalikanFokus && konteks) {
        const el = document.getElementById(idKartu(konteks.tipe, konteks.key));
        if (el) el.focus({ preventScroll: true });
    }
}

// ==========================================
