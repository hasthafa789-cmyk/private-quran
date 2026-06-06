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
                <button
                onclick="hapusSantri(${index})">
                Hapus
                </button>
            </td>
        </tr>
        `;
    });
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