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
    
    currentJilidAkses = jilidId;
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
        const aksi = isMurid ? `bukaLihatNilaiUmmi('${jilidId}', ${i})` : `bukaFormNilaiUmmi('${jilidId}', ${i})`;

        container.innerHTML += `
        <button onclick="event.stopPropagation(); ${aksi}" title="${isDone ? 'Nilai: ' + dataHalaman.nilai : 'Belum dinilai'}" class="relative w-12 h-12 rounded-xl font-bold text-xs flex flex-col items-center justify-center transition focus:outline-none ${bgStyle}">
            <span class="text-sm">${i + 1}</span>
            ${isDone ? `<span class="text-[9px] font-bold ${teksIndikatorWarna} leading-none mt-0.5">${teksNilai}</span>` : ''}
            ${adaCatatan ? `<span class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full flex items-center justify-center border-2 border-white"><span class="material-symbols-outlined text-[8px] text-white">edit_note</span></span>` : ''}
        </button>`;
    }
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
    currentJilidAkses = null; document.body.style.overflow = 'auto'; 
    const modal = document.getElementById("ummiDetail");
    const backdrop = document.getElementById("backdropDetail");
    if(modal) modal.classList.add("hidden");
    const suratDetail = document.getElementById("suratDetail");
    if(backdrop && (!suratDetail || suratDetail.classList.contains("hidden"))) backdrop.classList.add("hidden");
    if (currentView === 'viewUmmi') renderDaftarUmmi();
    updateLiveDashboardStats();
}

