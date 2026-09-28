// ==========================================
// TOAST / NOTIFIKASI RINGAN
// Pemakaian:
//   showToast("Tersimpan");
//   showToast("Gagal menyimpan", { type: "error" });
//   showToast("Nilai diubah", { actionLabel: "Urungkan", onAction: () => {...} });
// ==========================================
(function () {
    const IKON = { success: "check_circle", error: "error", info: "info" };
    const WARNA = {
        success: "bg-emerald-500/20 text-emerald-300",
        error: "bg-rose-500/20 text-rose-300",
        info: "bg-blue-500/20 text-blue-300"
    };

    let wadah = null;
    let timerAktif = null;

    function pastikanWadah() {
        if (wadah && document.body.contains(wadah)) return wadah;
        wadah = document.createElement("div");
        wadah.id = "toastWadah";
        wadah.setAttribute("aria-live", "polite");
        wadah.setAttribute("role", "status");
        wadah.className = "fixed inset-x-0 bottom-0 z-[70] flex justify-center px-4 pointer-events-none";
        wadah.style.paddingBottom = "max(1rem, env(safe-area-inset-bottom))";
        document.body.appendChild(wadah);

        if (!document.getElementById("toastStyle")) {
            const st = document.createElement("style");
            st.id = "toastStyle";
            st.textContent = `
                @keyframes toastMasuk { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
                .toast-masuk { animation: toastMasuk .22s ease-out forwards; }
                .toast-keluar { opacity: 0; transform: translateY(8px); transition: opacity .18s ease, transform .18s ease; }
                @media (prefers-reduced-motion: reduce) { .toast-masuk { animation: none; } .toast-keluar { transition: none; } }
            `;
            document.head.appendChild(st);
        }
        return wadah;
    }

    function esc(teks) {
        const d = document.createElement("div");
        d.textContent = String(teks ?? "");
        return d.innerHTML;
    }

    // Hanya satu toast tampil pada satu waktu; yang baru menggantikan yang lama.
    window.showToast = function (pesan, opsi = {}) {
        const { type = "success", actionLabel = "", onAction = null } = opsi;
        const durasi = opsi.duration ?? (actionLabel ? 5000 : 2600);
        const w = pastikanWadah();

        clearTimeout(timerAktif);
        w.innerHTML = "";

        const el = document.createElement("div");
        el.className = "toast-masuk pointer-events-auto flex items-center gap-3 max-w-md w-full sm:w-auto bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-900/20 pl-3 pr-3 py-2.5";
        el.innerHTML = `
            <span class="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${WARNA[type] || WARNA.info}">
                <span class="material-symbols-outlined text-lg">${IKON[type] || IKON.info}</span>
            </span>
            <p class="text-sm font-semibold leading-snug flex-1 min-w-0 break-words">${esc(pesan)}</p>
            ${actionLabel ? `<button type="button" data-toast-aksi class="text-sm font-extrabold text-blue-300 hover:text-blue-200 px-3 py-1.5 rounded-lg hover:bg-white/10 active:scale-95 transition flex-shrink-0">${esc(actionLabel)}</button>` : ""}
        `;
        w.appendChild(el);

        function tutup() {
            clearTimeout(timerAktif);
            el.classList.add("toast-keluar");
            setTimeout(() => { if (el.parentNode) el.remove(); }, 200);
        }

        const btn = el.querySelector("[data-toast-aksi]");
        if (btn) {
            btn.addEventListener("click", () => {
                tutup();
                if (typeof onAction === "function") onAction();
            });
        }

        timerAktif = setTimeout(tutup, durasi);
        return tutup;
    };
})();
