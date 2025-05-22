// Importaciones Firebase (igual que antes)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.8.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/11.8.0/firebase-firestore.js";

// Config y init Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBRo2ZoKk-XbgPkNl1BOtRcGhSB4JEuocM",
  authDomain: "mi-potrero-partidos.firebaseapp.com",
  projectId: "mi-potrero-partidos",
  storageBucket: "mi-potrero-partidos.firebasestorage.app",
  messagingSenderId: "555922222113",
  appId: "1:555922222113:web:dd2f79d5e20f0d96cac760",
  measurementId: "G-7LBJ29RXKM"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const partidosCol = collection(db, "partidos");

// Funciones comunes
window.logout = function() {
  signOut(auth).then(() => {
    window.location.href = "index.html"; // o a login si tienes una página aparte
  });
};

// Detectar la página actual
const page = window.location.pathname.split("/").pop();

// Función para cargar partidos (en explorar)
function cargarPartidos() {
  const lista = document.getElementById("lista-partidos");
  if (!lista) return;
  lista.innerHTML = "";

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  getDocs(partidosCol).then(snapshot => {
    snapshot.forEach(doc => {
      const p = doc.data();
      const fechaPartido = new Date(p.fecha);
      if (fechaPartido < hoy) return;

      const div = document.createElement("div");
      div.className = "partido";
      const fechaFormateada = fechaPartido.toLocaleString();
      div.innerHTML = `<strong>${fechaFormateada}</strong> - ${p.lugar}<br>${p.descripcion}<br>${p.jugadores.length} / ${p.cupos} jugadores<br>`;
      if (!p.jugadores.includes(auth.currentUser.email)) {
        const btn = document.createElement("button");
        btn.textContent = "Unirse";
        btn.onclick = () => unirseAPartido(doc.id, p);
        div.appendChild(btn);
      }
      lista.appendChild(div);
    });
  });
}

// Función para crear partido
function crearPartido() {
  const lugar = document.getElementById("lugar").value.trim();
  const fechaInput = document.getElementById("fecha").value;
  const cupos = parseInt(document.getElementById("cupos").value);
  const descripcion = document.getElementById("descripcion").value.trim();

  if (!lugar || !fechaInput || isNaN(cupos) || cupos < 1) {
    alert("Por favor completa todos los campos correctamente");
    return;
  }

  const fecha = new Date(fechaInput);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const maxFecha = new Date();
  maxFecha.setDate(hoy.getDate() + 30);

  if (fecha < hoy) {
    alert("No podés crear partidos en fechas pasadas.");
    return;
  }

  if (fecha > maxFecha) {
    alert("No podés crear partidos con más de 30 días de anticipación.");
    return;
  }

  const partido = {
    lugar,
    fecha: fecha.toISOString(),
    cupos,
    descripcion,
    creador: auth.currentUser.email,
    jugadores: [auth.currentUser.email]
  };

  addDoc(partidosCol, partido).then(() => {
    alert("Partido creado!");
    window.location.href = "index.html"; // Volver a explorar
  }).catch(e => alert("Error al crear partido: " + e.message));
}

// Función para cargar mis partidos
function cargarMisPartidos() {
  const cont = document.getElementById("mis-partidos");
  if (!cont) return;
  cont.innerHTML = "";

  const q = query(partidosCol, where("jugadores", "array-contains", auth.currentUser.email));
  getDocs(q).then(snapshot => {
    snapshot.forEach(doc => {
      const p = doc.data();
      const div = document.createElement("div");
      const fechaFormateada = new Date(p.fecha).toLocaleString();
      div.className = "partido";
      div.innerHTML = `<strong>${fechaFormateada}</strong> - ${p.lugar}<br>${p.descripcion}`;
      cont.appendChild(div);
    });
  }).catch(e => console.error("Error al cargar mis partidos:", e));
}

// Función para unirse a un partido
window.unirseAPartido = function(id, partido) {
  if (partido.jugadores.length >= partido.cupos) {
    alert("El partido ya está lleno");
    return;
  }
  partido.jugadores.push(auth.currentUser.email);
  const docRef = doc(db, "partidos", id);
  updateDoc(docRef, { jugadores: partido.jugadores }).then(() => {
    alert("Te uniste al partido");
    if (page === "explorar.html") cargarPartidos();
    if (page === "mios.html") cargarMisPartidos();
  });
};

// Autoejecutar según página y estado sesión
onAuthStateChanged(auth, user => {
  if (!user) {
    alert("Inicia sesión primero");
    window.location.href = "index.html"; // o donde tengas login
    return;
  }
  if (page === "explorar.html") {
    cargarPartidos();
  } else if (page === "crear.html") {
    const btnCrear = document.getElementById("btnCrear");
    btnCrear?.addEventListener("click", crearPartido);
  } else if (page === "mios.html") {
    cargarMisPartidos();
  }
});
