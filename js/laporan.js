// ==========================================
// LAPORAN PDF (khusus Admin & Guru) - v2 tema biru-indigo sesuai logo
// Butuh: index-logic.js (bolehLaporan, riwayatHarianSantri, parseTglRiwayat, batasPeriode, showToast)
// Logo dibaca dari 'logo_v2.png' (lokasi sama dengan index.html)
// ==========================================
(function () {
    'use strict';
    const BIRU = [37, 99, 235], INDIGO = [99, 102, 241], GELAP = [30, 41, 59], MUTED = [100, 116, 139], TIPIS = [248, 250, 252], GARIS = [226, 232, 240], PUTIH = [255, 255, 255];
    const HIJAU = [16, 185, 129], AMBER = [245, 158, 11], MERAH = [239, 68, 68], INDIGO_MUDA = [238, 242, 255];
    const LOGO_SRC = 'logo_v2.png';

    const T = s => String(s == null ? '' : s).replace(/[’‘ʿʾ`]/g, "'").replace(/[·•]/g, '-').normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '').replace(/\(\s*\)/g, '').replace(/\s{2,}/g, ' ').trim();

    // ---------- DATA ----------
    function susunData(p) {
        const s = santriAktif, d = { nama: T(s.nama), hafalan: [], ummi: [], hijaiyah: [], tajwid: [], absensi: null };

        if (typeof databaseJuz !== 'undefined') Object.keys(databaseJuz).sort((a, b) => a - b).forEach(j => {
            const items = [];
            databaseJuz[j].forEach((sr, i) => {
                const pr = s.progress && s.progress[`juz${j}_surat${i}`], done = pr ? pr.filter(Boolean).length : 0;
                if (done > 0) items.push({ nama: T(sr.nama), done, total: sr.ayat });
            });
            if (items.length) d.hafalan.push({ juz: j, items });
        });

        if (s.ummi && typeof daftarJilidUmmi !== 'undefined') daftarJilidUmmi.forEach(jl => {
            const arr = s.ummi[jl.id]; if (!Array.isArray(arr)) return;
            const nil = arr.filter(v => v && v.nilai > 0).map(v => Number(v.nilai));
            if (nil.length) d.ummi.push({ nama: T(jl.nama), dinilai: nil.length, total: arr.length, rata: Math.round(nil.reduce((a, b) => a + b, 0) / nil.length) });
        });

        if (s.huruf && typeof daftarHijaiyah !== 'undefined') daftarHijaiyah.forEach((h, i) => {
            const v = parseInt(s.huruf['h_' + i]);
            if (v > 0) d.hijaiyah.push({ nama: T(String(h).split(' ')[0]) || T(h) || 'Huruf ' + (i + 1), nilai: v });
        });

        if (s.tajwid && typeof klasifikasiTajwid !== 'undefined') klasifikasiTajwid.forEach(k => {
            const items = (k.items || []).filter(it => parseInt(s.tajwid[it.id]) > 0).map(it => ({ nama: T(it.nama), nilai: parseInt(s.tajwid[it.id]) }));
            if (items.length) d.tajwid.push({ kelompok: T(k.nama || k.kategori || k.judul || k.title || ''), items });
        });

        if (Array.isArray(s.absensi) && s.absensi.length) {
            let list = s.absensi.map(a => ({ w: T(a.waktu), d: window.parseTglRiwayat(a.waktu) }));
            const r = rentang(p); if (r.awal && list.every(x => x.d)) list = list.filter(x => x.d >= r.awal && x.d <= r.akhir);
            d.absensi = { total: list.length, daftar: list.map(x => x.w).reverse() };
        }
        return d;
    }

    function ambilRingkasan() {
        const g = id => { const e = document.getElementById(id); return e ? T(e.innerText || e.textContent) : '-'; };
        return [['Hafalan', g('totalSelesaiAyat') + ' Surat', g('statCircleHafalan'), BIRU], ['Ummi', g('totalSelesaiUmmi') + ' Lulus', g('statCircleUmmi'), INDIGO],
                ['Hijaiyah', g('totalLulusHijaiyah') + ' Fasih', g('statCircleHijaiyah'), HIJAU], ['Tajwid', g('totalFasihTajwid') + ' Hukum', g('statCircleTajwid'), AMBER]];
    }

    const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    function rentang(v) {
        v = String(v); const n = new Date(), hari = new Date(n.getFullYear(), n.getMonth(), n.getDate());
        if (v === 'all') return { awal: null, akhir: null, label: 'Semua waktu' };
        if (v[0] === 'm') { const [y, m] = v.slice(2).split('-').map(Number); return { awal: new Date(y, m - 1, 1), akhir: new Date(y, m, 0), label: BLN[m - 1] + ' ' + y }; }
        const h = Number(v); return { awal: window.batasPeriode(h), akhir: hari, label: h + ' hari terakhir' };
    }

    const KAT = [['hafalan', 'skor', 'Ayat', "Hafalan Al-Qur'an", BIRU], ['ummi', 'skorUmmi', 'Hal', 'Ummi', INDIGO], ['hijaiyah', 'skorHijaiyah', 'Huruf', 'Hijaiyah', HIJAU], ['tajwid', 'skorTajwid', 'Hukum', 'Tajwid', AMBER]];
    // Grafik hanya untuk kategori yang dipilih (jika tak ada kategori dipilih -> semua)
    function ambilGrafik(pilih, r) {
        const harian = window.riwayatHarianSantri(); if (!harian.length) return [];
        const seri = harian.map(it => ({ d: window.parseTglRiwayat(it.waktu), it })), valid = seri.every(x => x.d);
        let pakai = KAT.filter(k => pilih[k[0]]); if (!pakai.length) pakai = KAT;
        return pakai.map(([id, f, unit, judul, c]) => {
            const pts = seri.map(x => ({ d: x.d, v: Number(x.it[f]) || 0 })); let dalam = pts, dasar;
            if (valid && r.awal) {
                const sebelum = pts.filter(x => x.d < r.awal), isi = pts.filter(x => x.d >= r.awal && x.d <= r.akhir);
                dasar = sebelum.length ? sebelum[sebelum.length - 1].v : 0; dalam = sebelum.length ? [sebelum[sebelum.length - 1], ...isi] : isi;
            }
            if (!dalam.length) return null;
            const total = dalam[dalam.length - 1].v, gain = total - (dasar !== undefined ? dasar : dalam[0].v), tanda = gain > 0 ? '+' : '';
            const chips = ['Total: ' + total + ' ' + unit, tanda + gain + ' ' + unit + (r.awal ? ' di periode ini' : dalam.length > 1 ? ' sejak awal' : '')];
            for (let i = dalam.length - 1; i > 0; i--) if (dalam[i].v > dalam[i - 1].v && dalam[i].d) { chips.push('Terakhir naik ' + dalam[i].d.getDate() + '/' + (dalam[i].d.getMonth() + 1)); break; }
            return { judul, unit, c, pts: dalam, total, chips };
        }).filter(Boolean);
    }

    let _logo;
    function muatLogo() {
        if (_logo !== undefined) return Promise.resolve(_logo);
        return new Promise(ok => {
            const im = new Image();
            im.onload = () => { try { const c = document.createElement('canvas'); c.width = c.height = 240; c.getContext('2d').drawImage(im, 0, 0, 240, 240); _logo = c.toDataURL('image/png'); } catch (e) { _logo = null; } ok(_logo); };
            im.onerror = () => { _logo = null; ok(null); }; im.src = LOGO_SRC;
        });
    }

    // ---------- GAMBAR PDF ----------
    function gambar(doc, pilih, d, ring, grafik, meta) {
        const M = 14, W = 182, BAWAH = 278; let y = 0, no = 0;
        const warna = a => doc.setTextColor(a[0], a[1], a[2]);
        const isi = a => doc.setFillColor(a[0], a[1], a[2]);
        const garis = a => doc.setDrawColor(a[0], a[1], a[2]);
        const font = (st, sz, c) => { doc.setFont('helvetica', st); doc.setFontSize(sz); if (c) warna(c); };
        const alpha = a => { try { doc.setGState(new doc.GState({ opacity: a })); } catch (e) {} };
        const cek = h => { if (y + h > BAWAH) { doc.addPage(); y = 18; } };
        const pot = (str, w) => { let t = T(str); if (doc.getTextWidth(t) <= w) return t; while (t.length > 3 && doc.getTextWidth(t + '..') > w) t = t.slice(0, -1); return t + '..'; };
        const skala = (v, max) => { const r = v / max; return r >= .8 ? HIJAU : r >= .6 ? BIRU : r >= .4 ? AMBER : MERAH; };
        const gradasi = (x, yy, w, h, c1, c2) => { const n = 60; for (let i = 0; i < n; i++) { const t = i / (n - 1); isi(c1.map((v, k) => Math.round(v + (c2[k] - v) * t))); doc.rect(x + w * i / n, yy, w / n + 0.4, h, 'F'); } };
        const lencana = (txt, xr, yy, c) => { // pil nilai rata kanan di xr
            font('bold', 8, PUTIH); const w = Math.max(9, doc.getTextWidth(txt) + 5); isi(c); doc.roundedRect(xr - w, yy, w, 5.2, 2.6, 2.6, 'F'); doc.text(txt, xr - w / 2, yy + 3.7, { align: 'center' });
        };
        const bagian = (judul, sub, ekstra) => {
            cek(14 + (ekstra || 22)); no++;
            isi(BIRU); doc.roundedRect(M, y, 7, 7, 2, 2, 'F'); font('bold', 9, PUTIH); doc.text(String(no), M + 3.5, y + 5, { align: 'center' });
            font('bold', 12.5, GELAP); doc.text(judul, M + 10.5, y + 5.2);
            if (sub) { font('normal', 8.5, MUTED); doc.text(sub, M + W, y + 5.2, { align: 'right' }); }
            garis(GARIS); doc.setLineWidth(0.3); doc.line(M, y + 9.5, M + W, y + 9.5); y += 14;
        };
        const bar = (x, w, persen, c) => {
            isi([226, 232, 240]); doc.roundedRect(x, y + 1.6, w, 2.6, 1.3, 1.3, 'F');
            if (persen > 0) { isi(c); doc.roundedRect(x, y + 1.6, Math.max(2.6, w * persen / 100), 2.6, 1.3, 1.3, 'F'); }
        };
        const baris = (i, h) => { if (i % 2 === 0) { isi(TIPIS); doc.roundedRect(M, y - 0.6, W, h, 1.5, 1.5, 'F'); } };
        const grid = (items, kol) => {
            const w = W / kol, max = Math.max(...items.map(i => i.nilai)) <= 5 ? 5 : 100;
            for (let i = 0; i < items.length; i += kol) {
                cek(10);
                items.slice(i, i + kol).forEach((it, c) => {
                    const x = M + c * w;
                    isi(TIPIS); garis(GARIS); doc.setLineWidth(0.2); doc.roundedRect(x, y, w - 3, 7.5, 2, 2, 'FD');
                    font('normal', 8.5, GELAP); doc.text(pot(it.nama, w - 20), x + 3, y + 5);
                    lencana(String(it.nilai), x + w - 4.5, y + 1.15, skala(it.nilai, max));
                });
                y += 9.5;
            }
            y += 2;
        };


        const stepAman = v => { const p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p; return Math.max(1, (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p); };
        const tgl = dt => dt ? dt.getDate() + '/' + (dt.getMonth() + 1) : '';
        const chart = (x, yy, w, h, g) => {
            isi(PUTIH); garis(GARIS); doc.setLineWidth(0.3); doc.roundedRect(x, yy, w, h, 3, 3, 'FD');
            isi(g.c); doc.roundedRect(x, yy, w, 2.2, 1.1, 1.1, 'F'); doc.rect(x, yy + 1.1, w, 1.1, 'F');
            font('bold', 9, GELAP); doc.text(g.judul, x + 4, yy + 8);
            lencana(g.total + ' ' + g.unit, x + w - 3.5, yy + 4.4, g.c);
            const px = x + 11, py = yy + 14, pw = w - 16, ph = h - 32, st = stepAman(Math.max(...g.pts.map(q => q.v), 1) / 4), max = st * 4;
            font('normal', 6.5, MUTED); garis(GARIS); doc.setLineWidth(0.2);
            for (let k = 0; k <= 4; k++) { const gy = py + ph - ph * k / 4; doc.line(px, gy, px + pw, gy); doc.text(String(st * k), px - 1.5, gy + 1, { align: 'right' }); }
            const n = g.pts.length, ta = g.pts[0].d, tb = g.pts[n - 1].d, useT = ta && tb && tb > ta;
            const P = g.pts.map((q, i) => [px + (n === 1 ? pw / 2 : useT ? pw * (q.d - ta) / (tb - ta) : pw * i / (n - 1)), py + ph - ph * q.v / max]);
            const rel = P.slice(1).map((q, i) => [q[0] - P[i][0], q[1] - P[i][1]]);
            if (n > 1) {
                alpha(0.14); isi(g.c); doc.lines(rel.concat([[0, py + ph - P[n - 1][1]], [P[0][0] - P[n - 1][0], 0]]), P[0][0], P[0][1], [1, 1], 'F', true); alpha(1);
                garis(g.c); doc.setLineWidth(0.7); doc.lines(rel, P[0][0], P[0][1], [1, 1], 'S', false);
            }
            if (n <= 20) P.forEach(q => { isi(PUTIH); garis(g.c); doc.setLineWidth(0.5); doc.circle(q[0], q[1], 0.9, 'FD'); });
            font('normal', 6.5, MUTED); doc.text(tgl(ta), px, py + ph + 4); if (n > 1) doc.text(tgl(tb), px + pw, py + ph + 4, { align: 'right' });
            font('normal', 7.5, MUTED); doc.text(doc.splitTextToSize(g.chips.join('  |  '), w - 8).slice(0, 2), x + 4, yy + h - 7.5);
        };

        // ===== KOP =====
        gradasi(0, 0, 210, 46, BIRU, INDIGO);
        alpha(.10); isi(PUTIH); doc.circle(190, 6, 30, 'F'); doc.circle(165, 50, 22, 'F'); alpha(1);
        if (meta.logo) doc.addImage(meta.logo, 'PNG', M, 9, 24, 24);
        const tx = meta.logo ? M + 30 : M;
        font('bold', 8, [199, 210, 254]); doc.text('LAPORAN HASIL BELAJAR', tx, 15, { charSpace: 0.6 });
        font('bold', 20, PUTIH); doc.text(pot(d.nama || '-', 120), tx, 25);
        font('normal', 9, [224, 231, 255]); doc.text('Hasnan Private App', tx, 32);
        const pil = (txt, yy) => { font('bold', 8, PUTIH); const w = doc.getTextWidth(txt) + 8; alpha(.22); isi(PUTIH); doc.roundedRect(196 - w, yy, w, 6.5, 3.2, 3.2, 'F'); alpha(1); font('bold', 8, PUTIH); doc.text(txt, 196 - w / 2, yy + 4.5, { align: 'center' }); };
        pil('Periode: ' + meta.periode, 12); pil('Dicetak: ' + meta.tgl, 21);
        isi(AMBER); doc.rect(0, 46, 210, 1.2, 'F');
        if (meta.catatan) { font('normal', 7.5, MUTED); doc.text(meta.catatan, M, 53); }
        y = 59;

        // ===== GRAFIK (paling atas) =====
        if (pilih.grafik && grafik.length) {
            bagian('Grafik Perkembangan', meta.periode, 66); const dua = grafik.length > 1, w = dua ? (W - 6) / 2 : W, per = dua ? 2 : 1, h = 60;
            for (let i = 0; i < grafik.length; i += per) { cek(h + 4); grafik.slice(i, i + per).forEach((g, c) => chart(M + c * (w + 6), y, w, h, g)); y += h + 6; }
            y += 2;
        }

        // ===== RINGKASAN =====
        if (pilih.ringkasan && ring.length) {
            bagian('Ringkasan', 'Capaian utama', 34); const w = (W - 9) / 4;
            ring.forEach((r, i) => {
                const x = M + i * (w + 3), c = r[3];
                isi(PUTIH); garis(GARIS); doc.setLineWidth(0.3); doc.roundedRect(x, y, w, 28, 3, 3, 'FD');
                isi(c); doc.roundedRect(x, y, w, 2.6, 1.3, 1.3, 'F'); doc.rect(x, y + 1.3, w, 1.3, 'F');
                font('bold', 7.5, c); doc.text(r[0].toUpperCase(), x + 3.5, y + 8.5, { charSpace: 0.3 });
                font('bold', 12, GELAP); doc.text(pot(r[1], w - 6), x + 3.5, y + 16);
                font('normal', 7.5, MUTED); doc.text(doc.splitTextToSize(r[2], w - 7).slice(0, 2), x + 3.5, y + 21.5);
            });
            y += 36;
        }

        // ===== HAFALAN =====
        if (pilih.hafalan && d.hafalan.length) {
            const totalSurat = d.hafalan.reduce((a, g) => a + g.items.length, 0);
            bagian("Hafalan Al-Qur'an", totalSurat + ' surat dalam proses');
            d.hafalan.forEach(g => {
                cek(20); isi(INDIGO_MUDA); doc.roundedRect(M, y, W, 6.5, 2, 2, 'F');
                font('bold', 8.5, INDIGO); doc.text('JUZ ' + g.juz, M + 3, y + 4.5, { charSpace: 0.3 });
                font('normal', 8, MUTED); doc.text(g.items.length + ' surat', M + W - 3, y + 4.5, { align: 'right' }); y += 9;
                g.items.forEach((it, i) => {
                    cek(8); const pr = Math.round(it.done / it.total * 100), c = pr >= 100 ? HIJAU : pr >= 50 ? BIRU : AMBER;
                    baris(i, 7);
                    font('normal', 9.5, GELAP); doc.text(pot(it.nama, 60), M + 3, y + 4);
                    font('normal', 8.5, MUTED); doc.text(`${it.done}/${it.total} ayat`, M + 68, y + 4);
                    bar(M + 98, 62, pr, c);
                    font('bold', 9, c); doc.text(pr + '%', M + W - 2, y + 4, { align: 'right' }); y += 7;
                });
                y += 3;
            });
            y += 2;
        }

        // ===== UMMI =====
        if (pilih.ummi && d.ummi.length) {
            bagian('Ummi', d.ummi.length + ' jilid dinilai');
            d.ummi.forEach((u, i) => {
                cek(9); baris(i, 8);
                font('bold', 9.5, GELAP); doc.text(pot(u.nama, 46), M + 3, y + 4.4);
                font('normal', 8.5, MUTED); doc.text(`${u.dinilai}/${u.total} hal`, M + 54, y + 4.4);
                bar(M + 80, 58, Math.round(u.dinilai / u.total * 100), INDIGO);
                lencana('Nilai ' + u.rata, M + W - 2, y + 0.9, skala(u.rata, 100)); y += 8;
            });
            y += 5;
        }

        // ===== HIJAIYAH =====
        if (pilih.hijaiyah && d.hijaiyah.length) { bagian('Hijaiyah', d.hijaiyah.length + ' huruf dinilai'); grid(d.hijaiyah, 4); y += 2; }

        // ===== TAJWID =====
        if (pilih.tajwid && d.tajwid.length) {
            bagian('Tajwid', d.tajwid.reduce((a, g) => a + g.items.length, 0) + ' hukum dinilai');
            d.tajwid.forEach(g => {
                if (g.kelompok) { cek(18); font('bold', 8.5, INDIGO); doc.text(g.kelompok.toUpperCase(), M, y + 3, { charSpace: 0.3 }); y += 6; }
                grid(g.items, 2);
            });
        }

        // ===== ABSENSI =====
        if (pilih.absensi && d.absensi) {
            bagian('Absensi', meta.periode, 30);
            cek(16); isi(INDIGO_MUDA); doc.roundedRect(M, y, W, 11, 3, 3, 'F');
            font('normal', 9.5, GELAP); doc.text('Total kehadiran', M + 5, y + 7);
            font('bold', 13, INDIGO); doc.text(d.absensi.total + ' kali', M + W - 5, y + 7.3, { align: 'right' }); y += 16;
            const daf = d.absensi.daftar.slice(0, 30), kol = 3, w = W / kol;
            for (let i = 0; i < daf.length; i += kol) {
                cek(8); daf.slice(i, i + kol).forEach((t, c) => {
                    const x = M + c * w; isi(TIPIS); garis(GARIS); doc.setLineWidth(0.2); doc.roundedRect(x, y, w - 3, 6, 2, 2, 'FD');
                    isi(HIJAU); doc.circle(x + 3, y + 3, 1, 'F'); font('normal', 8, GELAP); doc.text(pot(t, w - 12), x + 6, y + 4.1);
                }); y += 7.5;
            }
            if (d.absensi.daftar.length > 30) { cek(6); font('normal', 8.5, MUTED); doc.text(`+ ${d.absensi.daftar.length - 30} kehadiran lainnya`, M, y + 3); y += 6; }
            y += 4;
        }

        // ===== TANDA TANGAN =====
        cek(34); y += 6;
        font('normal', 9, MUTED); doc.text('Mengetahui,', M + W - 45, y, { align: 'center' });
        font('bold', 9.5, GELAP); doc.text('Guru Pembimbing', M + W - 45, y + 5, { align: 'center' });
        let lebarTtd = 60; const cx = M + W - 45;
        if (meta.guru) { font('bold', 9.5, GELAP); const nm = T(meta.guru); doc.text(nm, cx, y + 22.5, { align: 'center' }); lebarTtd = Math.min(Math.max(doc.getTextWidth(nm) + 8, 30), 80); }
        garis(MUTED); doc.setLineWidth(0.3); doc.line(cx - lebarTtd / 2, y + 24, cx + lebarTtd / 2, y + 24);

        // ===== FOOTER =====
        const n = doc.getNumberOfPages();
        for (let i = 1; i <= n; i++) {
            doc.setPage(i); garis(GARIS); doc.setLineWidth(0.3); doc.line(M, 285, M + W, 285);
            if (meta.logo) doc.addImage(meta.logo, 'PNG', M, 287, 5.5, 5.5);
            font('normal', 8, MUTED); doc.text('Hasnan Private App  -  Laporan ' + (d.nama || ''), M + (meta.logo ? 8 : 0), 291);
            font('bold', 8, BIRU); doc.text(`${i} / ${n}`, M + W, 291, { align: 'right' });
        }
    }
    window.LaporanPdf = { susunData, gambar, T, ambilGrafik, rentang };

    // ---------- STYLE MODAL (menimpa gaya lama) ----------
    if (!document.getElementById('rpStyleV2')) {
        const st = document.createElement('style'); st.id = 'rpStyleV2';
        st.textContent = `.rp-card{padding:0!important;overflow:auto}
        .rp-head{align-items:center!important;gap:12px;padding:18px 20px;background:linear-gradient(135deg,#2563eb,#6366f1);border-radius:24px 24px 0 0;color:#fff}
        .rp-head img{width:44px;height:44px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,.2);flex-shrink:0}
        .rp-head>div:first-child{display:flex;align-items:center;gap:12px;flex:1;min-width:0}
        .rp-head h3{color:#fff!important} .rp-head p{color:#c7d2fe!important}
        .rp-x{color:#fff!important} .rp-x:hover{background:rgba(255,255,255,.2)!important}
        .rp-body{padding:4px 20px 20px}
        .rp-subrow{display:flex;justify-content:space-between;align-items:center;margin:14px 0 2px}
        .rp-subrow .rp-sub{margin:0!important}
        .rp-sel{width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:12px;font-size:13px;font-weight:700;color:#1e293b;background:#fff;margin-top:6px} .rp-sel:focus{outline:none;border-color:#6366f1;box-shadow:0 0 0 3px #e0e7ff}
        .rp-all{font-size:12px;font-weight:700;color:#4f46e5;padding:6px 10px;border-radius:10px} .rp-all:hover{background:#eef2ff}
        .rp-opt:has(input:checked){border-color:#6366f1!important;background:#eef2ff!important}
        .rp-opt input{accent-color:#4f46e5!important} .rp-opt>.material-symbols-outlined{color:#4f46e5!important}
        .rp-pri{background:linear-gradient(135deg,#2563eb,#6366f1)!important;box-shadow:0 6px 16px rgba(79,70,229,.35)!important}`;
        document.head.appendChild(st);
    }

    // ---------- UI ----------
    const OPSI = [['grafik', 'Grafik Perkembangan', 'Hanya untuk bagian yang dipilih di bawah', 'monitoring'], ['ringkasan', 'Ringkasan', 'Angka utama dari dashboard', 'dashboard'],
                  ['hafalan', "Hafalan Al-Qur'an", 'Daftar surat dan persentase ayat', 'menu_book'], ['ummi', 'Ummi', 'Jilid, halaman dinilai, rata-rata', 'school'],
                  ['hijaiyah', 'Hijaiyah', 'Nilai per huruf', 'abc'], ['tajwid', 'Tajwid', 'Nilai per hukum bacaan', 'record_voice_over'],
                  ['absensi', 'Absensi', 'Riwayat kehadiran sesuai periode', 'event_available']];

    function muatJsPdf() {
        if (window.jspdf) return Promise.resolve();
        return new Promise((ok, gagal) => {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            s.onload = ok; s.onerror = () => gagal(new Error('jsPDF gagal dimuat')); document.head.appendChild(s);
        });
    }

    // ----- Daftar guru pembimbing: tersimpan di Firestore (users/{uid}.pembimbingLaporan), cadangan di localStorage -----
    const KUNCI_GURU = 'pembimbingLaporan';
    const escG = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    let daftarGuru = (() => { try { const a = JSON.parse(localStorage.getItem(KUNCI_GURU)); return Array.isArray(a) ? a : []; } catch (e) { return []; } })();
    const uidGuru = () => { try { const u = firebase.auth().currentUser; return u ? u.uid : null; } catch (e) { return null; } };
    async function simpanGuru(list) {
        daftarGuru = list;
        try { localStorage.setItem(KUNCI_GURU, JSON.stringify(list)); } catch (e) {}
        try { const uid = uidGuru(); if (uid) await db.collection('users').doc(uid).set({ [KUNCI_GURU]: list }, { merge: true }); }
        catch (e) { console.warn('Gagal menyimpan daftar guru ke Firestore', e); window.showToast && window.showToast('Daftar nama hanya tersimpan di perangkat ini', 'warning'); }
    }
    async function muatGuru() {
        try {
            const uid = uidGuru(); if (!uid) return;
            const snap = await db.collection('users').doc(uid).get(), a = snap.exists ? snap.data()[KUNCI_GURU] : null;
            if (Array.isArray(a)) { daftarGuru = a; try { localStorage.setItem(KUNCI_GURU, JSON.stringify(a)); } catch (e) {} }
            else if (daftarGuru.length) simpanGuru(daftarGuru); // pindahkan daftar lama di perangkat ini ke akun
        } catch (e) { console.warn('Gagal memuat daftar guru pembimbing', e); }
    }
    function catatGuru(nama) { // nama terbaru di urutan pertama, tanpa duplikat, maks 20 nama
        const n = String(nama || '').trim().replace(/\s+/g, ' '); if (!n) return;
        simpanGuru([n, ...daftarGuru.filter(x => x.toLowerCase() !== n.toLowerCase())].slice(0, 20));
    }
    function chipGuru(m) {
        const el = m.querySelector('#rpGuruList'); if (!el) return;
        el.innerHTML = daftarGuru.map((n, i) => `<span style="display:inline-flex;align-items:center;background:#eef2ff;border:1px solid #c7d2fe;border-radius:999px;padding:3px 4px 3px 10px;font-size:12px;font-weight:700;color:#3730a3">` +
            `<button type="button" data-a="pilihguru" data-i="${i}" style="all:unset;cursor:pointer">${escG(n)}</button>` +
            `<button type="button" data-a="hapusguru" data-i="${i}" aria-label="Hapus ${escG(n)}" style="all:unset;cursor:pointer;padding:0 7px;font-size:15px;color:#64748b">&times;</button></span>`).join('');
    }

    const onEsc = e => { if (e.key === 'Escape') tutup(); };
    function tutup() { const m = document.getElementById('rpModal'); if (m) m.remove(); document.removeEventListener('keydown', onEsc); }

    async function proses(aksi, d0, tombol) {
        const pilih = {}; document.querySelectorAll('#rpModal input[type=checkbox]:checked').forEach(c => { pilih[c.value] = true; });
        if (!Object.keys(pilih).length) return window.showToast('Pilih minimal satu bagian', 'warning');
        const asli = tombol.innerHTML; tombol.disabled = true; tombol.innerHTML = '<span class="spinner"></span>Membuat...';
        try {
            await muatJsPdf();
            const logo = await muatLogo();
            const guru = ((document.getElementById('rpGuru') || {}).value || '').trim();
            const pv = (document.getElementById('rpPeriode') || {}).value || 'all', r = rentang(pv), d = susunData(pv);
            const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' }), now = new Date();
            const meta = { logo, guru, tgl: `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`, periode: r.label,
                           catatan: r.awal ? 'Grafik dan absensi mengikuti periode ' + r.label + '; daftar capaian menampilkan kondisi terkini.' : '' };
            gambar(doc, pilih, d, pilih.ringkasan ? ambilRingkasan() : [], pilih.grafik ? ambilGrafik(pilih, r) : [], meta);
            const nama = `Laporan_${(d.nama || 'santri').replace(/\s+/g, '_')}_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.pdf`;
            if (aksi === 'bagikan') await navigator.share({ files: [new File([doc.output('blob')], nama, { type: 'application/pdf' })], title: 'Laporan Hasil Belajar' });
            else { doc.save(nama); window.showToast('PDF berhasil dibuat', 'success'); }
            catatGuru(guru);
            tutup();
        } catch (e) {
            if (!(e && e.name === 'AbortError')) { window.showToast('Gagal membuat PDF', 'error'); console.error(e); }
        } finally { tombol.disabled = false; tombol.innerHTML = asli; }
    }

    window.bukaLaporan = function () {
        if (!window.bolehLaporan || !window.bolehLaporan()) return window.showToast('Fitur ini hanya untuk Admin dan Guru', 'warning');
        if (typeof santriAktif === 'undefined' || !santriAktif) return window.showToast('Pilih santri terlebih dahulu', 'warning');
        tutup(); muatLogo();
        const d = susunData(window.periodeGrafik);
        const ada = { ringkasan: true, hafalan: d.hafalan.length > 0, ummi: d.ummi.length > 0, hijaiyah: d.hijaiyah.length > 0, tajwid: d.tajwid.length > 0,
                      grafik: window.riwayatHarianSantri().length > 0, absensi: !!d.absensi };
        const bulan = (() => { const st = new Set(), add = w => { const t = window.parseTglRiwayat(w); if (t) st.add(t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0')); };
            (santriAktif.riwayatHafalan || []).forEach(i => add(i.waktu)); (santriAktif.absensi || []).forEach(i => add(i.waktu)); return [...st].sort().reverse(); })();
        const opt = (v, t) => `<option value="${v}" ${v === String(window.periodeGrafik) ? 'selected' : ''}>${t}</option>`;
        const selPeriode = `<p class="rp-sub">Periode laporan</p><select id="rpPeriode" class="rp-sel">${opt('all', 'Semua waktu')}${opt('7', '7 hari terakhir')}${opt('30', '30 hari terakhir')}` +
            (bulan.length ? `<optgroup label="Per bulan">${bulan.map(k => { const [y, m] = k.split('-'); return opt('m:' + k, BLN[m - 1] + ' ' + y); }).join('')}</optgroup>` : '') + `</select>`;
        let bisaBagikan = false;
        try { bisaBagikan = !!(navigator.canShare && navigator.canShare({ files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] })); } catch (e) {}

        const m = document.createElement('div'); m.id = 'rpModal'; m.className = 'rp-ov'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
        m.innerHTML = `<div class="rp-card">
            <div class="rp-head"><div><img src="${LOGO_SRC}" alt="" onerror="this.remove()"><div><h3>Laporan PDF</h3><p>${d.nama || 'Santri'}</p></div></div>
            <button class="rp-x" data-a="batal" aria-label="Tutup"><span class="material-symbols-outlined">close</span></button></div>
            <div class="rp-body">
            ${selPeriode}
            <div class="rp-subrow"><p class="rp-sub">Pilih bagian yang ingin dimasukkan</p><button class="rp-all" data-a="semua">Pilih semua</button></div>
            ${OPSI.map(([id, judul, desc, ico]) => `<label class="rp-opt ${ada[id] ? '' : 'dis'}"><input type="checkbox" value="${id}" ${ada[id] ? 'checked' : 'disabled'}>
                <span class="material-symbols-outlined">${ico}</span><span class="rp-t"><b>${judul}</b><small>${ada[id] ? desc : 'Belum ada data'}</small></span></label>`).join('')}
            <p class="rp-sub">Nama Guru Pembimbing (tercetak di tanda tangan)</p>
            <input id="rpGuru" type="text" maxlength="60" autocomplete="off" placeholder="Ketik nama guru pembimbing" value="${escG(daftarGuru[0] || (typeof role !== 'undefined' && role === 'guru' && typeof namaLogin !== 'undefined' ? namaLogin : ''))}" style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:12px;font-size:14px;font-weight:600;box-sizing:border-box">
            <div id="rpGuruList" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px"></div>
            <div class="rp-foot">
                <button class="rp-btn rp-sec" data-a="batal">Batal</button>
                ${bisaBagikan ? '<button class="rp-btn rp-sec" data-a="bagikan"><span class="material-symbols-outlined">share</span>Bagikan</button>' : ''}
                <button class="rp-btn rp-pri" data-a="unduh"><span class="material-symbols-outlined">download</span>Unduh PDF</button>
            </div></div></div>`;
        m.addEventListener('click', e => {
            if (e.target === m) return tutup();
            const b = e.target.closest('button[data-a]'); if (!b) return;
            if (b.dataset.a === 'batal') return tutup();
            if (b.dataset.a === 'semua') {
                const cb = [...m.querySelectorAll('input[type=checkbox]:not(:disabled)')], semua = cb.every(c => c.checked);
                cb.forEach(c => { c.checked = !semua; }); b.textContent = semua ? 'Pilih semua' : 'Kosongkan'; return;
            }
            if (b.dataset.a === 'pilihguru') { const inp = m.querySelector('#rpGuru'); if (inp) inp.value = daftarGuru[+b.dataset.i] || ''; return; }
            if (b.dataset.a === 'hapusguru') { simpanGuru(daftarGuru.filter((_, i) => i !== +b.dataset.i)); chipGuru(m); return; }
            proses(b.dataset.a, d, b);
        });
        document.body.appendChild(m); document.addEventListener('keydown', onEsc);
        chipGuru(m);
        muatGuru().then(() => { if (!m.isConnected) return; chipGuru(m); const inp = m.querySelector('#rpGuru'); if (inp && !inp.value.trim() && daftarGuru[0]) inp.value = daftarGuru[0]; });
    };
})();
