// ==========================================
// FITUR CEKLIS MASSAL HALAMAN UMMI (khusus admin & guru)
// ==========================================
const NILAI_MASSAL_UMMI = 100;                          // nilai bawaan untuk halaman yang ditandai massal
const CATATAN_MASSAL_UMMI = "";
let _ummiModePilih = false;
const _ummiPilih = new Set();

function _bolehEditUmmi() { return role === "admin" || role === "guru"; }
function _sudahDinilaiUmmi(d) { return d === true || !!(d && d.nilai !== undefined && d.nilai !== null); }
function _resetPilihUmmi() { _ummiModePilih = false; _ummiPilih.clear(); }
function _pesanUmmi(t) { if (typeof showToast === "function") showToast(t, "sukses"); }
async function _konfirmasiUmmi(pesan, ya) {
    if (typeof tampilkanKonfirmasi === "function") return await tampilkanKonfirmasi(pesan, { ya: ya, tidak: "Batal" });
    return confirm(pesan);
}
function _segarkanUmmi() {
    save();
    if (currentJilidAkses) renderHalamanUmmi(currentJilidAkses);
    if (currentView === 'viewUmmi') renderDaftarUmmi();
    updateLiveDashboardStats();
}
// Isi halaman kosong pada satu jilid (halaman yang sudah bernilai TIDAK ditimpa). Mengembalikan jumlah yang terisi.
function _isiKosongUmmi(jilidId, daftarIndex) {
    const jilid = daftarJilidUmmi.find(j => j.id === jilidId);
    if (!jilid) return 0;
    if (!santriAktif.ummi) santriAktif.ummi = {};
    if (!Array.isArray(santriAktif.ummi[jilidId])) santriAktif.ummi[jilidId] = Array(jilid.halaman).fill(null);
    const arr = santriAktif.ummi[jilidId];
    let n = 0;
    daftarIndex.forEach(i => {
        if (i < 0 || i >= jilid.halaman || _sudahDinilaiUmmi(arr[i])) return;
        arr[i] = { nilai: NILAI_MASSAL_UMMI, catatan: CATATAN_MASSAL_UMMI };
        n++;
    });
    return n;
}

window.modePilihUmmi = function(aktif) {
    if (!_bolehEditUmmi()) return;
    _ummiModePilih = !!aktif; _ummiPilih.clear();
    renderHalamanUmmi(currentJilidAkses);
};
window.togglePilihUmmi = function(i) {
    if (!_bolehEditUmmi() || !_ummiModePilih) return;
    _ummiPilih.has(i) ? _ummiPilih.delete(i) : _ummiPilih.add(i);
    renderHalamanUmmi(currentJilidAkses);
};
window.pilihSemuaUmmi = function() {
    const jilid = daftarJilidUmmi.find(j => j.id === currentJilidAkses); if (!jilid) return;
    const semua = _ummiPilih.size === jilid.halaman;
    _ummiPilih.clear();
    if (!semua) for (let i = 0; i < jilid.halaman; i++) _ummiPilih.add(i);
    renderHalamanUmmi(currentJilidAkses);
};
window.pilihRentangUmmi = function() {
    const jilid = daftarJilidUmmi.find(j => j.id === currentJilidAkses); if (!jilid) return;
    const a = parseInt(document.getElementById("ummiDari").value), b = parseInt(document.getElementById("ummiSampai").value);
    if (isNaN(a) || isNaN(b) || a < 1 || b < a || b > jilid.halaman) {
        tampilkanPeringatan(`Isi rentang dengan benar, contoh: dari 1 sampai ${jilid.halaman}.`); return;
    }
    for (let i = a - 1; i < b; i++) _ummiPilih.add(i);
    renderHalamanUmmi(currentJilidAkses);
};
window.tandaiPilihanUmmi = function() {
    if (!_bolehEditUmmi() || !santriAktif) return;
    if (_ummiPilih.size === 0) return tampilkanPeringatan("Pilih dulu halaman yang ingin ditandai selesai.");
    const n = _isiKosongUmmi(currentJilidAkses, [..._ummiPilih]);
    _resetPilihUmmi(); _segarkanUmmi();
    _pesanUmmi(`${n} halaman ditandai selesai`);
};
window.hapusTandaPilihanUmmi = async function() {
    if (!_bolehEditUmmi() || !santriAktif) return;
    if (_ummiPilih.size === 0) return tampilkanPeringatan("Pilih dulu halaman yang tanda/nilainya ingin dihapus.");
    if (!(await _konfirmasiUmmi(`Hapus nilai/tanda pada ${_ummiPilih.size} halaman terpilih?`, "Hapus"))) return;
    const arr = santriAktif.ummi?.[currentJilidAkses];
    if (arr) _ummiPilih.forEach(i => { arr[i] = null; });
    _resetPilihUmmi(); _segarkanUmmi();
};
window.selesaikanJilidSebelumnyaUmmi = async function() {
    if (!_bolehEditUmmi() || !santriAktif) return;
    const idx = daftarJilidUmmi.findIndex(j => j.id === currentJilidAkses);
    const sebelum = daftarJilidUmmi.slice(0, idx);
    if (sebelum.length === 0) return;
    const rentang = sebelum.length === 1 ? sebelum[0].nama : `${sebelum[0].nama} sampai ${sebelum[sebelum.length - 1].nama}`;
    if (!(await _konfirmasiUmmi(`Tandai semua halaman kosong pada ${rentang} sebagai selesai? Halaman yang sudah punya nilai tidak diubah.`, "Tandai selesai"))) return;
    let n = 0;
    sebelum.forEach(j => { n += _isiKosongUmmi(j.id, Array.from({ length: j.halaman }, (_, i) => i)); });
    _resetPilihUmmi(); _segarkanUmmi();
    _pesanUmmi(`${n} halaman pada jilid sebelumnya ditandai selesai`);
};

function renderToolbarUmmi() {
    const list = document.getElementById("halamanUmmiList");
    if (!list) return;
    let bar = document.getElementById("toolbarUmmi");
    if (!_bolehEditUmmi()) { if (bar) bar.remove(); return; }
    if (!bar) {
        bar = document.createElement("div"); bar.id = "toolbarUmmi"; bar.className = "space-y-2";
        list.parentElement.insertBefore(bar, list);
    }
    const btn = (warna, fn, teks) => `<button type="button" onclick="event.stopPropagation(); ${fn}" class="px-3 py-2 text-[11px] font-bold rounded-xl border transition active:scale-95 ${warna}">${teks}</button>`;
    const abu = "bg-white text-slate-700 border-slate-200 hover:bg-slate-100";
    const idx = daftarJilidUmmi.findIndex(j => j.id === currentJilidAkses);
    if (!_ummiModePilih) {
        bar.innerHTML = `<div class="flex flex-wrap gap-2 justify-center">
            ${btn("bg-purple-600 text-white border-purple-600 hover:bg-purple-700", "modePilihUmmi(true)", "☑ Ceklis Banyak Halaman")}
            ${idx > 0 ? btn(abu, "selesaikanJilidSebelumnyaUmmi()", "Selesaikan Jilid Sebelumnya") : ""}
        </div>`;
    } else {
        bar.innerHTML = `<div class="p-3 bg-white border border-amber-300 rounded-2xl space-y-2">
            <p class="text-[11px] font-bold text-slate-600 text-center"><span class="text-amber-600">${_ummiPilih.size}</span> halaman dipilih. Ketuk halaman untuk memilih/membatalkan.</p>
            <div class="flex flex-wrap items-center gap-2 justify-center">
                <span class="text-[11px] font-bold text-slate-500">Halaman</span>
                <input id="ummiDari" type="number" min="1" placeholder="1" class="w-14 px-2 py-1.5 text-xs border border-slate-200 rounded-lg text-center">
                <span class="text-[11px] font-bold text-slate-500">s/d</span>
                <input id="ummiSampai" type="number" min="1" placeholder="40" class="w-14 px-2 py-1.5 text-xs border border-slate-200 rounded-lg text-center">
                ${btn(abu, "pilihRentangUmmi()", "Pilih")}
                ${btn(abu, "pilihSemuaUmmi()", "Semua/Kosongkan")}
            </div>
            <div class="flex flex-wrap gap-2 justify-center">
                ${btn("bg-purple-600 text-white border-purple-600 hover:bg-purple-700", "tandaiPilihanUmmi()", "Tandai Selesai")}
                ${btn("bg-white text-rose-600 border-rose-200 hover:bg-rose-50", "hapusTandaPilihanUmmi()", "Hapus Tanda")}
                ${btn(abu, "modePilihUmmi(false)", "Batal")}
            </div>
        </div>`;
    }
}

// 11. MODUL METODE UMMI
// ==========================================
function renderDaftarUmmi() {
    const grid = document.getElementById("containerListUmmi");
    if (!grid) return; grid.innerHTML = "";

    daftarJilidUmmi.forEach((jilid) => {
        const total = jilid.halaman;
        const progress = santriAktif?.ummi?.[jilid.id] || [];
        
        let done = 0;
        for(let i=0; i<total; i++) {
            let dataP = progress[i];
            if(dataP === true) done++; 
            else if(dataP && dataP.nilai !== undefined && dataP.nilai > 0) done++;
        }
        
        const persen = Math.round((done / total) * 100);

        let color = "#ef4444"; let bgLight = "bg-white";
        if (persen >= 50) color = "#f59e0b";
        if (persen >= 80) color = "#8b5cf6"; 
        if (persen === 100) bgLight = "bg-purple-50/50 border-purple-200";

        grid.innerHTML += `
        <div onclick="openJilidUmmi('${jilid.id}')" class="flex items-center gap-3 p-4 rounded-2xl border border-slate-100 cursor-pointer ${bgLight} hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
            <div class="flex-shrink-0 group-hover:scale-105 transition-transform">${circularProgress(persen, color)}</div>
            <div>
                <h4 class="font-extrabold text-slate-800 text-sm tracking-tight group-hover:text-purple-700 transition-colors">${jilid.nama}</h4>
                <span class="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md mt-1 inline-block">${jilid.halaman} Halaman</span>
            </div>
        </div>`;
    });
}

function openJilidUmmi(jilidId) {
    if (!santriAktif) return tampilkanPeringatan ("Pilih atau masukkan nama santri terlebih dahulu di kolom pencarian atas!");
    
    currentJilidAkses = jilidId; _resetPilihUmmi();
    document.body.style.overflow = 'hidden'; 
    const backdrop = document.getElementById("backdropDetail");
    const modal = document.getElementById("ummiDetail");
    
    if(backdrop) backdrop.classList.remove("hidden");
    if(modal) modal.classList.remove("hidden");
    
    const jilid = daftarJilidUmmi.find(j => j.id === jilidId);
    const textJudul = document.getElementById("judulUmmi");
    if(textJudul) textJudul.innerText = `${jilid.nama} (${jilid.halaman} Halaman)`;
    
    renderHalamanUmmi(jilidId);
}

function renderHalamanUmmi(jilidId) {
    const container = document.getElementById("halamanUmmiList");
    if (!container) return; container.innerHTML = "";
    
    const jilid = daftarJilidUmmi.find(j => j.id === jilidId);
    const total = jilid.halaman;
    const isMurid = (role === "murid");

    if (!santriAktif.ummi) santriAktif.ummi = {};
    if (!santriAktif.ummi[jilidId]) santriAktif.ummi[jilidId] = Array(total).fill(null);

    for (let i = 0; i < total; i++) {
        let dataHalaman = santriAktif.ummi[jilidId][i];
        if(dataHalaman === true) dataHalaman = { nilai: 100, catatan: "Telah Diselesaikan (Data Lama)" };
        
        const isDone = dataHalaman && dataHalaman.nilai !== undefined && dataHalaman.nilai !== null;
        const teksNilai = isDone ? dataHalaman.nilai : "";
        const adaCatatan = isDone && dataHalaman.catatan && dataHalaman.catatan.trim() !== "";
        
        let bgStyle = 'bg-slate-100 text-slate-700 hover:bg-slate-200'; 
        if (isDone) {
            if (dataHalaman.nilai < 75) bgStyle = 'bg-rose-600 text-white shadow-md shadow-rose-500/40 ring-2 ring-rose-500 ring-offset-2';
            else bgStyle = 'bg-purple-600 text-white shadow-md shadow-purple-500/40 ring-2 ring-purple-500 ring-offset-2';
        }

        let teksIndikatorWarna = isDone ? (dataHalaman.nilai < 75 ? 'text-rose-200' : 'text-purple-200') : '';
        const dipilih = _ummiModePilih && _ummiPilih.has(i);
        if (dipilih) bgStyle += ' outline outline-4 outline-amber-400';
        let aksi = isMurid ? `bukaLihatNilaiUmmi('${jilidId}', ${i})` : `bukaFormNilaiUmmi('${jilidId}', ${i})`;
        if (_ummiModePilih && !isMurid) aksi = `togglePilihUmmi(${i})`;

        container.innerHTML += `
        <button onclick="event.stopPropagation(); ${aksi}" title="${isDone ? 'Nilai: ' + dataHalaman.nilai : 'Belum dinilai'}" class="relative w-12 h-12 rounded-xl font-bold text-xs flex flex-col items-center justify-center transition focus:outline-none ${bgStyle}">
            <span class="text-sm">${i + 1}</span>
            ${isDone ? `<span class="text-[9px] font-bold ${teksIndikatorWarna} leading-none mt-0.5">${teksNilai}</span>` : ''}
            ${dipilih ? `<span class="absolute -top-2 -left-2 w-4 h-4 bg-amber-400 text-white rounded-full text-[10px] leading-4 text-center border-2 border-white">✓</span>` : ''}
            ${adaCatatan ? `<span class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full flex items-center justify-center border-2 border-white"><span class="material-symbols-outlined text-[8px] text-white">edit_note</span></span>` : ''}
        </button>`;
    }
    renderToolbarUmmi();
}

window.bukaLihatNilaiUmmi = function(jilidId, index) {
    if (!santriAktif) return alert("Data santri aktif tidak ditemukan.");
    let data = santriAktif.ummi?.[jilidId]?.[index];
    if (data === true) data = { nilai: 100, catatan: "Telah Diselesaikan (Data Lama)" };
    
    if (!data || data.nilai === undefined || data.nilai === null) {
        tampilkanPeringatan ("Halaman ini belum memiliki penilaian dari Pengajar."); return;
    }

    const modalLihat = document.getElementById('modalLihatUmmi');
    const displayNilai = document.getElementById('displayNilaiUmmi');
    const displayCatatan = document.getElementById('displayCatatanUmmi');

    if (modalLihat && displayNilai && displayCatatan) {
        displayNilai.innerText = data.nilai;
        displayCatatan.innerText = data.catatan || "- Tidak ada catatan -";
        modalLihat.classList.remove('hidden');
    } else {
        const modalForm = document.getElementById('modalPenilaianUmmi');
        const inputNilai = document.getElementById('inputNilaiUmmi');
        const inputCatatan = document.getElementById('inputCatatanUmmi');
        const judulForm = document.getElementById('judulFormUmmi');

        if (modalForm && inputNilai && inputCatatan) {
            if (judulForm) judulForm.innerText = `Detail Nilai Halaman ${index + 1} (Hanya Baca)`;
            inputNilai.value = data.nilai; inputNilai.disabled = true; 
            inputCatatan.value = data.catatan || ''; inputCatatan.disabled = true; 
            
            const btnSimpan = modalForm.querySelector('button[onclick*="simpanNilaiUmmi"]');
            const btnHapus = modalForm.querySelector('button[onclick*="hapusNilaiUmmi"]');
            if (btnSimpan) btnSimpan.classList.add('hidden');
            if (btnHapus) btnHapus.classList.add('hidden');
            modalForm.classList.remove('hidden');
        } else {
            alert(`[Detail Nilai Halaman ${index + 1}]\n\nNilai: ${data.nilai}\nCatatan: ${data.catatan || '- Tidak ada catatan -'}`);
        }
    }
}

window.tutupLihatNilaiUmmi = function() {
    const modal = document.getElementById('modalLihatUmmi');
    if(modal) modal.classList.add('hidden');
}

function bukaFormNilaiUmmi(jilidId, index) {
    if (role === "murid") return;
    currentEditUmmi = { jilidId, index };
    
    let data = santriAktif.ummi?.[jilidId]?.[index] || { nilai: '', catatan: '' };
    if(typeof data === 'boolean') data = { nilai: data ? 100 : '', catatan: '' }; 

    const inputNilai = document.getElementById('inputNilaiUmmi');
    const inputCatatan = document.getElementById('inputCatatanUmmi');
    const judulForm = document.getElementById('judulFormUmmi');
    const modalForm = document.getElementById('modalPenilaianUmmi');

    if (inputNilai) { inputNilai.value = data.nilai || ''; inputNilai.disabled = false; }
    if (inputCatatan) { inputCatatan.value = data.catatan || ''; inputCatatan.disabled = false; }
    if (judulForm) judulForm.innerText = `Input Halaman ${index + 1}`;
    
    if (modalForm) {
        const btnSimpan = modalForm.querySelector('button[onclick*="simpanNilaiUmmi"]');
        const btnHapus = modalForm.querySelector('button[onclick*="hapusNilaiUmmi"]');
        if (btnSimpan) btnSimpan.classList.remove('hidden');
        if (btnHapus) btnHapus.classList.remove('hidden');
        modalForm.classList.remove('hidden');
    }
}

function tutupFormNilaiUmmi() {
    document.getElementById('modalPenilaianUmmi').classList.add('hidden');
}

function simpanNilaiUmmi() {
    const nilaiInput = document.getElementById('inputNilaiUmmi').value;
    const nilai = parseInt(nilaiInput);
    const catatan = document.getElementById('inputCatatanUmmi').value;
    const { jilidId, index } = currentEditUmmi;

    if (!nilaiInput || isNaN(nilai) || nilai < 1 || nilai > 100) {
        tampilkanPeringatan ("Mohon masukkan nilai berupa angka antara 1 sampai 100."); return;
    }
    if (!santriAktif.ummi[jilidId]) santriAktif.ummi[jilidId] = [];
    santriAktif.ummi[jilidId][index] = { nilai: nilai, catatan: catatan };
    
    save(); renderHalamanUmmi(jilidId); tutupFormNilaiUmmi();
    if (currentView === 'viewUmmi') renderDaftarUmmi();
    updateLiveDashboardStats();
}

function hapusNilaiUmmi() {
    const { jilidId, index } = currentEditUmmi;
    if (!santriAktif.ummi[jilidId]) return;
    santriAktif.ummi[jilidId][index] = null; 
    save(); renderHalamanUmmi(jilidId); tutupFormNilaiUmmi();
    if (currentView === 'viewUmmi') renderDaftarUmmi();
    updateLiveDashboardStats();
}

function closeUmmiDetail() {
    currentJilidAkses = null; _resetPilihUmmi(); document.body.style.overflow = 'auto'; 
    const modal = document.getElementById("ummiDetail");
    const backdrop = document.getElementById("backdropDetail");
    if(modal) modal.classList.add("hidden");
    const suratDetail = document.getElementById("suratDetail");
    if(backdrop && (!suratDetail || suratDetail.classList.contains("hidden"))) backdrop.classList.add("hidden");
    if (currentView === 'viewUmmi') renderDaftarUmmi();
    updateLiveDashboardStats();
}

