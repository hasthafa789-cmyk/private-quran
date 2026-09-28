/** Tailwind v3 (sama dengan versi cdn.tailwindcss.com) */
module.exports = {
  content: ["./index.html", "./js/**/*.js"],   // semua file JS ikut dipindai (kelas dibuat lewat template string)
  safelist: [
    // kelas dinamis seperti `text-${color}-700` di resetScan
    { pattern: /^(text|bg|border)-(rose|amber|emerald|blue|slate)-(50|100|200|500|600|700)$/ },
  ],
  theme: { extend: {} },
  plugins: [],
};
