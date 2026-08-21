// 7. NAVIGASI UTAMA
// ==========================================
function navigateTo(viewId) {
    currentView = viewId;
    const views = ["viewDashboard", "viewHafalan", "viewPenilaian", "viewUmmi"];

    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.classList.add("hidden"); el.classList.remove("animate-entry"); }
    });

    if(viewId === 'viewHafalan') {
        const sub1 = document.getElementById('subPageDaftarJuz');
        const sub2 = document.getElementById('subPageDetailSuratJuz');
        if(sub1) sub1.classList.remove('hidden');
        if(sub2) sub2.classList.add('hidden');
    }

    if(viewId === 'viewPenilaian') {
        const sub1 = document.getElementById('subPageMenuPenilaian');
        const sub2 = document.getElementById('subPageDetailHijaiyah');
        const sub3 = document.getElementById('subPageDetailTajwid');
        if(sub1) sub1.classList.remove('hidden');
        if(sub2) sub2.classList.add('hidden');
        if(sub3) sub3.classList.add('hidden');
        renderPenilaianModul();
    }
    
    if(viewId === 'viewUmmi') {
        const sub1 = document.getElementById('subPageDaftarUmmi');
        const sub2 = document.getElementById('subPageDetailUmmi');
        if(sub1) sub1.classList.remove('hidden');
        if(sub2) sub2.classList.add('hidden');
        renderDaftarUmmi();
    }

    if(viewId === 'viewDashboard') {
        tampilkanHaditsAcak();
        updateLiveDashboardStats();
    }

    const target = document.getElementById(viewId);
    if (target) {
        target.classList.remove("hidden");
        setTimeout(() => target.classList.add("animate-entry"), 10); 
    }
}

