import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCpU9XNhgQtcoRX9HpACkFvx0pnkNdMXGk",
  authDomain: "hasnan-project-3569b.firebaseapp.com",
  projectId: "hasnan-project-3569b",
  storageBucket: "hasnan-project-3569b.firebasestorage.app",
  messagingSenderId: "926093455510",
  appId: "1:926093455510:web:513b3d07ce7559f677d2b7",
  measurementId: "G-QZXJLG79DQ"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);