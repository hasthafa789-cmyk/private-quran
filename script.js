let dataSantri = JSON.parse(localStorage.getItem("dataSantri")) || [];
let santriAktif = null;

const role = localStorage.getItem("role");
const namaLogin = localStorage.getItem("nama");

// ======================
// LOGIN CHECK
// ======================
if (localStorage.getItem("login") !== "true") {
    window.location.href = "login.html";
}

// ======================
// DATA JUZ 30
// ======================
const juz30 = [
  { nama: "An-Naba", ayat: 40 },
  { nama: "An-Nazi'at", ayat: 46 },
  { nama: "Abasa", ayat: 42 },
  { nama: "At-Takwir", ayat: 29 },
  { nama: "Al-Infitar", ayat: 19 },
  { nama: "Al-Mutaffifin", ayat: 36 },
  { nama: "Al-Inshiqaq", ayat: 25 },
  { nama: "Al-Buruj", ayat: 22 },
  { nama: "At-Tariq", ayat: 17 },
  { nama: "Al-A'la", ayat: 19 },
  { nama: "Al-Ghashiyah", ayat: 26 },
  { nama: "Al-Fajr", ayat: 30 },
  { nama: "Al-Balad", ayat: 20 },
  { nama: "Ash-Shams", ayat: 15 },
  { nama: "Al-Lail", ayat: 21 },
  { nama: "Ad-Duha", ayat: 11 },
  { nama: "Al-Inshirah", ayat: 8 },
  { nama: "At-Tin", ayat: 8 },
  { nama: "Al-Alaq", ayat: 19 },
  { nama: "Al-Qadr", ayat: 5 },
  { nama: "Al-Bayyinah", ayat: 8 },
  { nama: "Az-Zalzalah", ayat: 8 },
  { nama: "Al-Adiyat", ayat: 11 },
  { nama: "Al-Qari'ah", ayat: 11 },
  { nama: "At-Takathur", ayat: 8 },
  { nama: "Al-Asr", ayat: 3 },
  { nama: "Al-Humazah", ayat: 9 },
  { nama: "Al-Fil", ayat: 5 },
  { nama: "Quraysh", ayat: 4 },
  { nama: "Al-Ma'un", ayat: 7 },
  { nama: "Al-Kawthar", ayat: 3 },
  { nama: "Al-Kafirun", ayat: 6 },
  { nama: "An-Nasr", ayat: 3 },
  { nama: "Al-Lahab", ayat: 5 },
  { nama: "Al-Ikhlas", ayat: 4 },
  { nama: "Al-Falaq", ayat: 5 },
  { nama: "An-Nas", ayat: 6 }
];

// ======================
// INIT
// ======================
document.addEventListener("DOMContentLoaded", () => {
    initUser();
    renderDashboard();
    updateStats();

    setInterval(() => {
        localStorage.setItem("dataSantri", JSON.stringify(dataSantri));
    }, 3000);
});

// ======================
// INIT USER
// ======================
function initUser() {
    if (role === "murid") {
        santriAktif = dataSantri.find(s => s.nama === namaLogin);

        if (!santriAktif) {
            santriAktif = {
                id: Date.now(),
                nama: namaLogin,
                progress: {}
            };
            dataSantri.push(santriAktif);
        }

        const input = document.getElementById("namaInput");
        if (input) {
            input.value = namaLogin;
            input.disabled = true;
        }

        const namaEl = document.getElementById("namaSantri");
        if (namaEl) namaEl.innerText = namaLogin;
    }
}

// ======================
// SET SANTRI
// ======================
function setSantriAktif() {
    if (role === "murid") return;

    const nama = document.getElementById("namaInput").value.trim();
    if (!nama) return;

    let found = dataSantri.find(s => s.nama === nama);

    if (!found) {
        found = {
            id: Date.now(),
            nama,
            progress: {}
        };
        dataSantri.push(found);
    }

    santriAktif = found;
    document.getElementById("namaSantri").innerText = nama;

    save();
    renderDashboard();
}

// ======================
// CIRCULAR PROGRESS UI
// ======================
function circularProgress(persen, color) {
    const size = 60;
    const stroke = 6;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (persen / 100) * circumference;

    return `
    <svg width="${size}" height="${size}">
        <circle
            cx="${size/2}" cy="${size/2}" r="${radius}"
            stroke="#e2e8f0" stroke-width="${stroke}"
            fill="none" />
        <circle
            cx="${size/2}" cy="${size/2}" r="${radius}"
            stroke="${color}" stroke-width="${stroke}"
            fill="none"
            stroke-linecap="round"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${offset}"
            transform="rotate(-90 ${size/2} ${size/2})"/>
        <text x="50%" y="50%" text-anchor="middle"
            dy=".3em" font-size="11" font-weight="bold" fill="#334155">
            ${persen}%
        </text>
    </svg>`;
}

// ======================
// DASHBOARD SURAT
// ======================
function renderDashboard() {
    const container = document.getElementById("dashboardSurat");
    if (!container) return;

    container.innerHTML = "";

    juz30.forEach((s, i) => {
        const total = s.ayat;
        const progress = santriAktif?.progress?.[i] || Array(total).fill(false);
        const done = progress.filter(Boolean).length;
        const persen = Math.round((done / total) * 100);

        // Perubahan Warna Indikator Progress Tema Biru
        let color = "#ef4444"; // 0-49% Merah
        let bgLight = "";
        if (persen >= 50) color = "#f59e0b"; // 50-79% Amber/Kuning
        if (persen >= 80) color = "#3b82f6"; // 80-99% Biru Utama
        if (persen === 100) bgLight = "bg-blue-50 border border-blue-200 shadow-sm shadow-blue-50"; // 100% Selesai (Biru Muda)

        container.innerHTML += `
        <div onclick="openSurat(${i})"
            class="transform transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md 
                   flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 cursor-pointer ${bgLight}">
            
            <div class="flex-shrink-0">
                ${circularProgress(persen, color)}
            </div>

            <div class="flex-grow">
                <h4 class="font-bold text-slate-800 text-sm mb-0.5">${s.nama}</h4>
                <div class="flex items-center gap-2">
                    <span class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        ${s.ayat} Ayat
                    </span>
                    ${persen === 100 ? '<span class="text-[9px] bg-blue-500 text-white font-bold px-1.5 py-0.5 rounded uppercase">Selesai</span>' : ''}
                </div>
            </div>

            <div class="text-slate-300">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
            </div>
        </div>`;
    });
}

// ======================
// OPEN SURAT
// ======================
function openSurat(index) {
    if (!santriAktif) return alert("Pilih atau isi nama santri terlebih dahulu di atas!");

    document.getElementById("sectionDashboard").classList.add("hidden");
    document.getElementById("suratDetail").classList.remove("hidden");

    document.getElementById("judulSurat").innerText =
        `${juz30[index].nama} (${juz30[index].ayat} Ayat)`;

    renderAyat(index);
}

// ======================
// RENDER AYAT
// ======================
function renderAyat(index) {
    const container = document.getElementById("ayatList");
    if (!container) return;
    
    container.innerHTML = "";

    const total = juz30[index].ayat;

    if (!santriAktif.progress[index]) {
        santriAktif.progress[index] = Array(total).fill(false);
    }

    for (let i = 0; i < total; i++) {
        const done = santriAktif.progress[index][i];

        // Mengubah warna tombol ayat aktif menjadi biru-gradient (bg-blue-500)
        container.innerHTML += `
        <button onclick="event.stopPropagation(); toggleAyat(${index}, ${i})"
            class="w-11 h-11 rounded-xl font-bold text-xs flex items-center justify-center 
                   transition-all duration-150 active:scale-90 shadow-sm focus:outline-none
                   ${done 
                     ? 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-md shadow-blue-100 ring-2 ring-blue-500 ring-offset-1' 
                     : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                   }">
            ${i + 1}
        </button>`;
    }
}

// ======================
// TOGGLE AYAT
// ======================
function toggleAyat(suratIndex, ayatIndex) {
    if (!santriAktif) return;

    const total = juz30[suratIndex].ayat;

    if (!santriAktif.progress[suratIndex]) {
        santriAktif.progress[suratIndex] = Array(total).fill(false);
    }

    santriAktif.progress[suratIndex][ayatIndex] = !santriAktif.progress[suratIndex][ayatIndex];

    save();
    renderAyat(suratIndex);
}

// ======================
// STATS
// ======================
function updateStats() {
    const el = document.getElementById("avgProgress");
    if (el) el.innerText = dataSantri.length;
}

// ======================
// CLOSE DETAIL
// ======================
function closeDetail() {
    document.getElementById("suratDetail").classList.add("hidden");
    document.getElementById("sectionDashboard").classList.remove("hidden");
    renderDashboard();
}

// ======================
// SAVE
// ======================
function save() {
    localStorage.setItem("dataSantri", JSON.stringify(dataSantri));
}

// ======================
// LOGOUT
// ======================
function logout() {
    localStorage.removeItem("login");
    window.location.href = "login.html";
}