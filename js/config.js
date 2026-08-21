// ==========================================
// 1. INISIALISASI FIREBASE (VERSI 8 / COMPAT)
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyCIBGqJVfrRZikYeQDtQynWDxybsFFtY-0",
    authDomain: "hasnanprivate.firebaseapp.com",
    projectId: "hasnanprivate",
    storageBucket: "hasnanprivate.firebasestorage.app",
    messagingSenderId: "737022132780",
    appId: "1:737022132780:web:8ab47b587f13ee53900789"
};

// Nyalakan Mesin Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ==========================================
// 2. VARIABEL GLOBAL APLIKASI
// ==========================================
let dataSantri = JSON.parse(localStorage.getItem("dataSantri")) || [];
let santriAktif = null;
let currentView = 'viewDashboard'; 
let currentJuzAkses = null;
let currentJilidAkses = null; 
let currentEditUmmi = { jilidId: null, index: null }; 

const role = localStorage.getItem("role");
const namaLogin = localStorage.getItem("nama");

// Proteksi Halaman Sementara (Menyesuaikan sistem lama)
if (localStorage.getItem("login") !== "true") {
    window.location.replace("login.html");
}