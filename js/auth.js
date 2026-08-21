function logout() {
    firebase.auth().signOut().then(() => {
        localStorage.removeItem("login");
        localStorage.removeItem("role");
        localStorage.removeItem("nama");
        localStorage.removeItem("dataSantri");
        window.location.replace("login.html");
    }).catch((error) => console.error("Gagal logout:", error));
}

window.addEventListener("load", () => {
    const splash = document.getElementById("splashScreen");
    if(splash) {
        setTimeout(() => {
            splash.style.opacity = '0'; 
            setTimeout(() => { splash.style.display = 'none'; }, 1000); 
        }, 1200); 
    }
});

firebase.auth().onAuthStateChanged((user) => {
    if (user) { console.log("Akses diizinkan untuk:", user.email); } 
    else {
        console.warn("Akses ditolak! Mengalihkan ke halaman login...");
        window.location.replace("login.html"); 
    }
});

// Pendaftaran User Baru (Mendukung Admin membuat Guru/Murid)
async function daftarkanUserBaru(email, password, namaLengkap, rolePilihan, namaGuruPembimbing = "") {
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        let dataUser = { nama: namaLengkap, email: email, role: rolePilihan };
        if (rolePilihan === "murid") {
            dataUser.guruPembimbing = namaGuruPembimbing;
        }

        await db.collection("users").doc(user.uid).set(dataUser);
        console.log(`Akun ${namaLengkap} berhasil dibuat sebagai ${rolePilihan}!`);
        
    } catch (error) {
        console.error("Gagal mendaftarkan user:", error.message);
    }
}

