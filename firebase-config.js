// firebase-config.js
// Agrega estos scripts en tu index.html ANTES de storage.js:
//
// <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js"></script>
// <script src="firebase-config.js"></script>
// <script src="storage.js"></script>  ← reemplazar con el nuevo storage.js

const firebaseConfig = {
  apiKey: "AIzaSyBsR59MeyhKi-mn0Str6rDztTUstBuIWJI",
  authDomain: "inversionescentris.firebaseapp.com",
  databaseURL: "https://inversionescentris-default-rtdb.firebaseio.com",
  projectId: "inversionescentris",
  storageBucket: "inversionescentris.firebasestorage.app",
  messagingSenderId: "116701797942",
  appId: "1:116701797942:web:2d735844f17df2c76bc297"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();