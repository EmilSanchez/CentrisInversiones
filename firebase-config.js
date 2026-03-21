// firebase-config.js
// Usa la versión "compat" para que funcione sin npm ni webpack

// ── Cargar Firebase ──────────────────────────────────────────────────────
// (estos scripts van en index.html, no aquí)

const firebaseConfig = {
  apiKey: "AIzaSyBsR59MeyhKi-mn0Str6rDztTUstBuIWJI",
  authDomain: "inversionescentris.firebaseapp.com",
  projectId: "inversionescentris",
  storageBucket: "inversionescentris.firebasestorage.app",
  messagingSenderId: "116701797942",
  appId: "1:116701797942:web:2d735844f17df2c76bc297"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();