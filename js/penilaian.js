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
                    <h4 class="font-bold text-slate-800 text-sm tracking-tight leading-snug whitespace-normal break-words" title="${item.nama}">${item.nama}</h4>
                    <span class="inline-flex items-center text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${badgeStyle}">${infoLevel.teks}</span>
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
    santriAktif.terakhirHijaiyah = idx;
    save(); renderPenilaianModul();
}

function siklusNilaiTajwid(id, currentVal) {
    if (!santriAktif || role === "murid") return;
    if (!santriAktif.tajwid) santriAktif.tajwid = {};
    santriAktif.tajwid[id] = String((parseInt(currentVal) + 1) % 6);
    santriAktif.terakhirTajwid = id;
    save(); renderPenilaianModul();
}

// ==========================================
