// ==========================================
// 12. VISUAL UTILITIES & LAINNYA
// ==========================================
function circularProgress(persen, color) {
    const size = 48; const stroke = 4; const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius; const offset = circumference - (persen / 100) * circumference;
    return `
    <svg width="${size}" height="${size}" class="-rotate-90">
        <circle cx="${size/2}" cy="${size/2}" r="${radius}" stroke="#f1f5f9" stroke-width="${stroke}" fill="none" />
        <circle cx="${size/2}" cy="${size/2}" r="${radius}" stroke="${color}" stroke-width="${stroke}" fill="none" stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" class="transition-all duration-500 ease-out"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="10" font-weight="800" fill="#334155" transform="rotate(90 ${size/2} ${size/2})">${persen}%</text>
    </svg>`;
}

