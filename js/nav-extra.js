// ==========================================
// NAV-EXTRA: Bottom navigation (mobile) + progres per Juz
// Muat PALING AKHIR (setelah index-logic.js & latihan.js).
// ==========================================
(function () {
    // ---------- CSS ----------
    const st = document.createElement("style");
    st.textContent = `
      @media (max-width: 767px) { body.has-bottom-nav { padding-bottom: calc(4.75rem + env(safe-area-inset-bottom)); } }
      #bottomNav button { min-height: 56px; }
      @media (prefers-reduced-motion: reduce) { * { animation-duration: .01ms !important; transition-duration: .01ms !important; } }`;
    document.head.appendChild(st);

    // ---------- BOTTOM NAV ----------
    const items = [
        { view: "viewDashboard", icon: "home",        label: "Beranda", go: () => navigateTo("viewDashboard") },
        { view: "viewHafalan",   icon: "menu_book",   label: "Hafalan", go: () => navigateTo("viewHafalan") },
        { view: "viewUmmi",      icon: "auto_stories",label: "Ummi",    go: () => navigateTo("viewUmmi") },
        { view: "viewPenilaian", icon: "grading",     label: "Nilai",   go: () => navigateTo("viewPenilaian") },
        { view: "viewAbsensi",   icon: "qr_code_scanner", label: "Absen", go: () => bukaMenuAbsensi() }
    ];

    function buatNav() {
        if (document.getElementById("bottomNav")) return;
        const nav = document.createElement("nav");
        nav.id = "bottomNav";
        nav.setAttribute("aria-label", "Navigasi utama");
        nav.className = "md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-xl border-t border-slate-200 grid grid-cols-5";
        nav.style.paddingBottom = "env(safe-area-inset-bottom)";
        nav.innerHTML = items.map(i => `
          <button type="button" data-view="${i.view}" aria-label="${i.label}"
            class="flex flex-col items-center justify-center gap-0.5 text-slate-400 active:scale-90 transition">
            <span class="material-symbols-outlined text-2xl">${i.icon}</span>
            <span class="text-[11px] font-bold">${i.label}</span>
          </button>`).join("");
        nav.addEventListener("click", e => {
            const b = e.target.closest("button[data-view]");
            if (!b) return;
            const it = items.find(x => x.view === b.dataset.view);
            if (it) { it.go(); setTimeout(syncNav, 60); }
        });
        document.body.appendChild(nav);
        document.body.classList.add("has-bottom-nav");
    }

    function syncNav() {
        const nav = document.getElementById("bottomNav");
        if (!nav) return;
        // Tampil hanya jika sudah login
        nav.style.display = localStorage.getItem("role") ? "" : "none";
        const aktif = [...document.querySelectorAll(".page-view")].find(el => !el.classList.contains("hidden"));
        const id = aktif ? aktif.id : "viewDashboard";
        nav.querySelectorAll("button[data-view]").forEach(b => {
            const on = b.dataset.view === id;
            b.classList.toggle("text-blue-600", on);
            b.classList.toggle("text-slate-400", !on);
            on ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current");
        });
    }

    // ---------- PROGRES PER JUZ ----------
    function persenJuz(j) {
        const surat = (typeof databaseJuz !== "undefined") ? databaseJuz[j] : null;
        if (!surat || !window.santriAktif && typeof santriAktif === "undefined") return 0;
        const sa = (typeof santriAktif !== "undefined") ? santriAktif : window.santriAktif;
        if (!sa || !sa.progress) return 0;
        let total = 0, selesai = 0;
        surat.forEach((s, idx) => {
            total += s.ayat;
            const p = sa.progress[`juz${j}_surat${idx}`];
            if (Array.isArray(p)) selesai += p.filter(v => v === true).length;
        });
        return total ? Math.round((selesai / total) * 100) : 0;
    }

    function updateJuzProgress() {
        const grid = document.getElementById("gridContainerJuz");
        if (!grid) return;
        const sa = (typeof santriAktif !== "undefined") ? santriAktif : null;
        let juzTerakhir = null;
        const m = sa && sa.terakhirHafalan ? String(sa.terakhirHafalan).match(/juz(\d+)_/) : null;
        if (m) juzTerakhir = parseInt(m[1]);

        grid.querySelectorAll("button").forEach(btn => {
            const mm = (btn.getAttribute("onclick") || "").match(/bukaHalamanJuz\((\d+)\)/);
            if (!mm) return;
            const j = parseInt(mm[1]);
            const persen = sa ? persenJuz(j) : 0;
            btn.querySelector(".juz-extra")?.remove();
            const extra = document.createElement("div");
            extra.className = "juz-extra w-full";
            extra.innerHTML = `
              <div class="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden" role="progressbar" aria-valuenow="${persen}" aria-valuemin="0" aria-valuemax="100">
                <div class="h-full rounded-full ${persen === 100 ? "bg-emerald-500" : "bg-blue-500"} transition-all duration-500" style="width:${persen}%"></div>
              </div>
              <p class="text-[11px] font-bold mt-1 ${persen === 100 ? "text-emerald-600" : "text-slate-500"}">${sa ? (persen === 100 ? "Selesai ✓" : persen + "%") : "&nbsp;"}</p>`;
            btn.appendChild(extra);
            const terakhir = juzTerakhir === j;
            btn.classList.toggle("ring-2", terakhir);
            btn.classList.toggle("ring-blue-400", terakhir);
            btn.querySelector(".juz-badge")?.remove();
            if (terakhir) {
                const b = document.createElement("span");
                b.className = "juz-badge text-[10px] font-extrabold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full";
                b.textContent = "Terakhir";
                btn.insertBefore(b, btn.firstChild);
            }
        });
    }

    // ---------- PASANG HOOK ----------
    function hook(nama, after) {
        const asli = window[nama];
        if (typeof asli !== "function") return;
        window[nama] = function () {
            const r = asli.apply(this, arguments);
            try { after(); } catch (e) { console.error(e); }
            return r;
        };
    }

    function init() {
        buatNav();
        hook("navigateTo", () => { setTimeout(syncNav, 60); setTimeout(updateJuzProgress, 60); });
        hook("bukaMenuAbsensi", () => setTimeout(syncNav, 60));
        hook("updateLiveDashboardStats", updateJuzProgress);
        window.addEventListener("popstate", () => setTimeout(syncNav, 120));
        syncNav();
        updateJuzProgress();
        // Login terjadi tanpa reload? cek berkala ringan sampai role tersedia
        let n = 0; const t = setInterval(() => { syncNav(); if (localStorage.getItem("role") || ++n > 20) clearInterval(t); }, 500);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(init, 0));
    else init();
})();
