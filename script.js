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
            stroke="#e5e7eb" stroke-width="${stroke}"
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
            dy=".3em" font-size="12" font-weight="bold">
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

        let color = "#ef4444";
        if (persen >= 50) color = "#f59e0b";
        if (persen >= 80) color = "#22c55e";

        container.innerHTML += `
        <div onclick="openSurat(${i})"
            style="padding:14px;border-radius:14px;background:#fff;
            box-shadow:0 2px 10px rgba(0,0,0,0.08);
            cursor:pointer;display:flex;align-items:center;gap:12px">

            <div>${circularProgress(persen, color)}</div>

            <div>
                <h4 style="margin:0">${s.nama}</h4>
                <small>${s.ayat} ayat</small>
            </div>

        </div>`;
    });
}

// ======================
// OPEN SURAT
// ======================
function openSurat(index) {

    if (!santriAktif) return alert("Isi santri dulu!");

    document.getElementById("dashboardSurat").style.display = "none";
    document.getElementById("suratDetail").style.display = "block";

    document.getElementById("judulSurat").innerText =
        `${juz30[index].nama} (${juz30[index].ayat} ayat)`;

    renderAyat(index);
}

// ======================
// RENDER AYAT
// ======================
function renderAyat(index) {

    const container = document.getElementById("ayatList");
    container.innerHTML = "";

    const total = juz30[index].ayat;

    if (!santriAktif.progress[index]) {
        santriAktif.progress[index] = Array(total).fill(false);
    }

    for (let i = 0; i < total; i++) {

        const done = santriAktif.progress[index][i];

        container.innerHTML += `
        <div onclick="toggleAyat(${index}, ${i})"
            style="display:inline-flex;
            width:45px;height:45px;margin:5px;
            border-radius:10px;
            align-items:center;justify-content:center;
            background:${done ? '#22c55e' : '#e5e7eb'};
            color:${done ? 'white' : 'black'};
            font-weight:bold;cursor:pointer;">
            ${i + 1}
        </div>`;
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

    santriAktif.progress[suratIndex][ayatIndex] =
        !santriAktif.progress[suratIndex][ayatIndex];

    save();
    renderAyat(suratIndex);
    renderDashboard();
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
    document.getElementById("suratDetail").style.display = "none";
    document.getElementById("dashboardSurat").style.display = "grid";
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