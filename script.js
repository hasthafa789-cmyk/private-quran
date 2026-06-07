let dataSantri = JSON.parse(localStorage.getItem("dataSantri")) || [];
let santriAktif = null;

// ======================
// LOGIN CHECK
// ======================
if (localStorage.getItem("login") !== "true") {
    window.location.href = "login.html";
}

// ======================
// JUZ 30 DATA
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
window.onload = function () {
    renderDashboard();
    updateStats();
};

// ======================
// SET SANTRI AKTIF
// ======================
function setSantriAktif() {
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

    document.getElementById("namaSantri").innerText = santriAktif.nama;

    save();
    renderDashboard();
}

// ======================
// DASHBOARD SURAT (CARD STYLE)
// ======================
function renderDashboard() {

    const container = document.getElementById("dashboardSurat");
    container.innerHTML = "";

    juz30.forEach((s, i) => {

        const total = s.ayat;
        const progress = santriAktif?.progress?.[i] || Array(total).fill(false);

        const done = progress.filter(v => v).length;
        const persen = Math.round((done / total) * 100);

        let color = "#ef4444";
        if (persen >= 50) color = "#f59e0b";
        if (persen >= 80) color = "#22c55e";

        container.innerHTML += `
        <div class="card-surat" onclick="openSurat(${i})"
            style="padding:12px;border-radius:12px;background:#fff;
            box-shadow:0 2px 8px rgba(0,0,0,0.08);cursor:pointer">

            <h4>${s.nama}</h4>
            <small>${s.ayat} ayat</small>

            <div style="height:6px;background:#eee;border-radius:6px;margin-top:8px">
                <div style="width:${persen}%;height:6px;background:${color};border-radius:6px"></div>
            </div>

            <small>${persen}%</small>
        </div>`;
    });
}

// ======================
// OPEN SURAT
// ======================
function openSurat(index) {
    if (!santriAktif) return alert("Isi nama santri dulu!");

    document.getElementById("dashboardSurat").style.display = "none";
    document.getElementById("suratDetail").style.display = "block";

    document.getElementById("judulSurat").innerText =
        `${juz30[index].nama} (${juz30[index].ayat} ayat)`;

    renderAyat(index);
}

// ======================
// RENDER AYAT (DUOLINGO STYLE)
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
            style="
            display:inline-block;
            width:40px;
            height:40px;
            margin:4px;
            border-radius:8px;
            text-align:center;
            line-height:40px;
            cursor:pointer;
            background:${done ? '#22c55e' : '#e5e7eb'};
            color:${done ? 'white' : 'black'};
            font-size:12px;">
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
// SAVE
// ======================
function save() {
    localStorage.setItem("dataSantri", JSON.stringify(dataSantri));
}

// ======================
// STATS
// ======================
function updateStats() {
    document.getElementById("avgProgress").innerText = dataSantri.length;
}

// ======================
// CLOSE DETAIL
// ======================
function closeDetail() {
    document.getElementById("suratDetail").style.display = "none";
    document.getElementById("dashboardSurat").style.display = "grid";
}