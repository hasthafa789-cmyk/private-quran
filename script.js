if (localStorage.getItem("login") !== "true") {
    window.location.href = "login.html";

}
let dataSantri =
JSON.parse(localStorage.getItem("dataSantri"))
|| [];

tampilkanData();

function tambahSantri() {

    const nama =
    document.getElementById("nama").value;

    const hafalan =
    document.getElementById("hafalan").value;

    const kehadiran =
    document.getElementById("kehadiran").value;

    if (nama === "" || hafalan === "") {
        alert("Lengkapi data");
        return;
    }

    dataSantri.push({
        nama,
        hafalan,
        kehadiran
    });

    simpanData();

    tampilkanData();

    document.getElementById("nama").value = "";
    document.getElementById("hafalan").value = "";
}

function tampilkanData() {

    const tabel =
    document.getElementById("tabelSantri");

    tabel.innerHTML = "";

    dataSantri.forEach((santri, index) => {

        tabel.innerHTML += `
        <tr>
            <td>${santri.nama}</td>
            <td>${santri.hafalan}</td>
            <td>${santri.kehadiran}</td>

            <td>
                <button onclick="editSantri(${index})">
                    Edit
                </button>

                <button onclick="hapusSantri(${index})">
                    Hapus
                </button>
            </td>
        </tr>
        `;

        });

    updateStatistik();
}

function editSantri(index){

    const namaBaru =
    prompt("Nama Baru", dataSantri[index].nama);

    const hafalanBaru =
    prompt("Hafalan Baru", dataSantri[index].hafalan);

    if(!namaBaru || !hafalanBaru){
        return;
    }

    dataSantri[index].nama = namaBaru;
    dataSantri[index].hafalan = hafalanBaru;

    simpanData();
    tampilkanData();
}

function hapusSantri(index) {

    dataSantri.splice(index, 1);

    simpanData();

    tampilkanData();
}

function simpanData() {

    localStorage.setItem(
        "dataSantri",
        JSON.stringify(dataSantri)
    );
}
function exportCSV() {

    let csv =
    "Nama,Hafalan,Kehadiran\n";

    dataSantri.forEach((santri) => {

        csv +=
        `${santri.nama},${santri.hafalan},${santri.kehadiran}\n`;

    });

    const blob =
    new Blob([csv], { type: "text/csv" });

    const url =
    window.URL.createObjectURL(blob);

    const a =
    document.createElement("a");

    a.href = url;

    a.download = "laporan-santri.csv";

    a.click();
}

function cariSantri(){

    const keyword =
    document.getElementById("cari")
    .value
    .toLowerCase();

    const rows =
    document.querySelectorAll("#tabelSantri tr");

    rows.forEach(row => {

        row.style.display =
        row.innerText.toLowerCase()
        .includes(keyword)
        ? ""
        : "none";

    });
}

function updateStatistik(){

    document.getElementById("totalSantri")
    .textContent = dataSantri.length;

    const hadir =
    dataSantri.filter(
        s => s.kehadiran === "Hadir"
    ).length;

    const izin =
    dataSantri.filter(
        s => s.kehadiran === "Izin"
    ).length;

    const sakit =
    dataSantri.filter(
        s => s.kehadiran === "Sakit"
    ).length;

    const alpa =
    dataSantri.filter(
        s => s.kehadiran === "Alpa"
    ).length;

    document.getElementById("totalHadir")
    .textContent = hadir;

    document.getElementById("totalIzin")
    .textContent = izin;

    document.getElementById("totalSakit")
    .textContent = sakit;

    document.getElementById("totalAlpa")
    .textContent = alpa;
}

function logout(){

    localStorage.removeItem("login");

    window.location.href = "index.html";

}
