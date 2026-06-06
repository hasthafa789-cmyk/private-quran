function login(){

    const username =
    document.getElementById("username").value;

    const password =
    document.getElementById("password").value;

    if(
        username === "admin" &&
        password === "123456"
    ){

        localStorage.setItem(
            "login",
            "true"
        );

        window.location.href =
        "index.html";

    }else{

        alert(
            "Username atau Password salah"
        );

    }
}