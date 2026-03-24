/**
 * FIREBASE-CONFIG.JS
 * Configuración e inicialización de Firebase para Centris Inversiones.
 * Este archivo debe cargarse ANTES que storage.js en el index.html
 */

const firebaseConfig = {
  apiKey: "AIzaSyBsR59MeyhKi-mn0Str6rDztTUstBuIWJI",
  authDomain: "inversionescentris.firebaseapp.com",
  projectId: "inversionescentris",
  storageBucket: "inversionescentris.firebasestorage.app",
  messagingSenderId: "116701797942",
  appId: "1:116701797942:web:2d735844f17df2c76bc297"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Instancia global de Firestore — usada por storage.js
const db = firebase.firestore();

console.log('✅ Firebase conectado a:', firebaseConfig.projectId);