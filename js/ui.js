// ==========================================
// 12. VISUAL UTILITIES & LAINNYA
// ==========================================
function circularProgress(persen, color) {
    const size = 48; const stroke = 4; const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius; const offset = circumference - (persen / 100) * circumference;
    return `
    <svg width="${size}" height="${size}" class="-rotate-90">
        <circle cx="${size/2}" cy="${size/2}" r="${radius}" stroke="#f1f5f9" stroke-width="${stroke}" fill="none" />
        <circle cx="${size/2}" cy="${size/2}" r="${radius}" stroke="${color}" stroke-width="${stroke}" fill="none" stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" class="transition-all duration-500 ease-out"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="10" font-weight="800" fill="#334155" transform="rotate(90 ${size/2} ${size/2})">${persen}%</text>
    </svg>`;
}
// ==========================================
// 12. VISUAL UTILITIES & LAINNYA
// ==========================================
function circularProgress(persen, color) {
    const size = 48; const stroke = 4; const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius; const offset = circumference - (persen / 100) * circumference;
    return `
    <svg width="${size}" height="${size}" class="-rotate-90">
        <circle cx="${size/2}" cy="${size/2}" r="${radius}" stroke="#f1f5f9" stroke-width="${stroke}" fill="none" />
        <circle cx="${size/2}" cy="${size/2}" r="${radius}" stroke="${color}" stroke-width="${stroke}" fill="none" stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" class="transition-all duration-500 ease-out"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="10" font-weight="800" fill="#334155" transform="rotate(90 ${size/2} ${size/2})">${persen}%</text>
    </svg>`;
}



// ==========================================
// HELPER UX: ESCAPE, TOAST, KONFIRMASI
// ==========================================
function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function showToast(pesan, tipe = "info") {
    let wrap = document.getElementById("toastWrap");
    if (!wrap) {
        wrap = document.createElement("div");
        wrap.id = "toastWrap";
        wrap.setAttribute("aria-live", "polite");
        wrap.className = "fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-[10000] flex flex-col gap-2 items-center pointer-events-none";
        document.body.appendChild(wrap);
    }
    const warna = { info: "bg-slate-800", sukses: "bg-emerald-600", error: "bg-rose-600" }[tipe] || "bg-slate-800";
    const el = document.createElement("div");
    el.className = `${warna} text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg animate-modal`;
    el.textContent = pesan;
    wrap.appendChild(el);
    setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .3s"; setTimeout(() => el.remove(), 300); }, 2500);
}

// Pengganti confirm(): return Promise<boolean>
function tampilkanKonfirmasi(pesan, { ya = "Ya", tidak = "Batal", bahaya = false } = {}) {
    return new Promise(resolve => {
        const overlay = document.createElement("div");
        overlay.className = "fixed inset-0 z-[10001] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-modal", "true");
        overlay.innerHTML = `
            <div class="animate-modal bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm">
                <p class="text-sm font-semibold text-slate-700 leading-relaxed mb-5"></p>
                <div class="flex gap-3">
                    <button data-r="0" class="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 active:scale-95 transition">${escapeHtml(tidak)}</button>
                    <button data-r="1" class="flex-1 py-3 rounded-xl ${bahaya ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-600 hover:bg-blue-700"} text-white font-bold text-sm active:scale-95 transition">${escapeHtml(ya)}</button>
                </div>
            </div>`;
        overlay.querySelector("p").textContent = pesan;
        const tutup = (hasil) => { document.removeEventListener("keydown", onKey); overlay.remove(); resolve(hasil); };
        const onKey = (e) => { if (e.key === "Escape") tutup(false); };
        overlay.addEventListener("click", e => {
            if (e.target === overlay) return tutup(false);
            const b = e.target.closest("button[data-r]");
            if (b) tutup(b.dataset.r === "1");
        });
        document.addEventListener("keydown", onKey);
        document.body.appendChild(overlay);
        overlay.querySelector('button[data-r="1"]').focus();
    });
}
