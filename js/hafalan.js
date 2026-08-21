// ==========================================
// 9. MODUL HAFALAN BACAAN (AL-QURAN)
// ==========================================
function renderSuratBerdasarkanJuz(num) {
    currentJuzAkses = num;
    const grid = document.getElementById("containerListSuratJuz");
    if (!grid) return; grid.innerHTML = "";
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
        <button onclick="event.stopPropagation(); ${isMurid ? "tampilkanPeringatan ('Penandaan ayat hanya boleh dilakukan oleh Guru/Admin!')" : `toggleAyat(${juzNum}, ${suratIndex}, ${i})`}" 
                class="w-10 h-10 rounded-xl font-bold text-xs flex items-center justify-center transition focus:outline-none ${done ? 'bg-blue-600 text-white shadow-md shadow-blue-500/40 ring-2 ring-blue-500 ring-offset-2' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">
            ${i + 1}
        </button>`;
    }
}

function toggleAyat(juzNum, suratIndex, ayatIndex) {
    if (!santriAktif || role === "murid") return; 
    const keyProgres = `juz${juzNum}_surat${suratIndex}`;
    santriAktif.progress[keyProgres][ayatIndex] = !santriAktif.progress[keyProgres][ayatIndex];
    santriAktif.terakhirHafalan = keyProgres; 

    save(); renderAyat(juzNum, suratIndex);
    if (currentJuzAkses) renderSuratBerdasarkanJuz(currentJuzAkses); 
}

function closeDetail() {
    document.body.style.overflow = 'auto'; 
    const suratDetail = document.getElementById("suratDetail");
    const backdropDetail = document.getElementById("backdropDetail");
    if(suratDetail) suratDetail.classList.add("hidden");
    const ummiDetail = document.getElementById("ummiDetail");
    if (backdropDetail && (!ummiDetail || ummiDetail.classList.contains("hidden"))) backdropDetail.classList.add("hidden");
    if (currentJuzAkses) renderSuratBerdasarkanJuz(currentJuzAkses);
    updateLiveDashboardStats();
}

