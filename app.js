// Importaciones Firebase
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

const protectedPages = ["explorar.html", "crear.html", "mios.html"];
const currentPage = window.location.pathname.split("/").pop() || "index.html";

// Función para mostrar mensajes al usuario
function mostrarMensaje(mensaje, tipo = "exito") {
  const mensajeDiv = document.getElementById("mensaje");
  if (mensajeDiv) {
    mensajeDiv.textContent = mensaje;
    mensajeDiv.className = `mensaje ${tipo}`;
    setTimeout(() => {
      mensajeDiv.textContent = "";
      mensajeDiv.className = "mensaje";
    }, 3000);
  } else {
    // Fallback a alert si no hay div de mensaje
    alert(mensaje);
  }
}

// Lógica de autenticación para index.html
if (currentPage === "index.html") {
  const authSection = document.getElementById("auth-section");

  function renderAuthForm(isLogin = false) {
    authSection.innerHTML = `
      <h2>${isLogin ? 'Iniciar Sesión' : 'Registrarse'}</h2>
      <form id="${isLogin ? 'login-form' : 'register-form'}">
        <input type="email" id="auth-email" placeholder="Email" required>
        <input type="password" id="auth-password" placeholder="Contraseña" required>
        <p>${isLogin ? '¿No tienes una cuenta? <a href="#" id="toggle-register">Registrarse.</a>' : '¿Ya tienes una cuenta? <a href="#" id="toggle-login">Iniciar Sesión.</a>'}</p>
        <button type="submit">${isLogin ? 'Iniciar Sesión' : 'Registrarse'}</button>
      </form>
      <div id="mensaje" class="mensaje"></div>
    `;
    setupAuthForms();
  }

  function setupAuthForms() {
    const registerForm = document.getElementById("register-form");
    const loginForm = document.getElementById("login-form");
    const toggleLoginLink = document.getElementById("toggle-login");
    const toggleRegisterLink = document.getElementById("toggle-register");

    if (registerForm) {
      registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = registerForm.querySelector('#auth-email').value;
        const password = registerForm.querySelector('#auth-password').value;
        try {
          await createUserWithEmailAndPassword(auth, email, password);
          mostrarMensaje("Cuenta creada correctamente. ¡Bienvenido!", "exito");
        } catch (error) {
          mostrarMensaje("Error al crear cuenta: " + error.message, "error");
        }
      });
    }

    if (loginForm) {
      loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = loginForm.querySelector('#auth-email').value;
        const password = loginForm.querySelector('#auth-password').value;
        try {
          await signInWithEmailAndPassword(auth, email, password);
          mostrarMensaje("Sesión iniciada correctamente. ¡Bienvenido!", "exito");
        } catch (error) {
          mostrarMensaje("Error al iniciar sesión: " + error.message, "error");
        }
      });
    }

    if (toggleLoginLink) {
      toggleLoginLink.addEventListener("click", (e) => {
        e.preventDefault();
        renderAuthForm(true);
      });
    }

    if (toggleRegisterLink) {
      toggleRegisterLink.addEventListener("click", (e) => {
        e.preventDefault();
        renderAuthForm(false);
      });
    }
  }

  function displayUserProfile(user) {
    authSection.innerHTML = `
      <h2>Mi perfil</h2>
      <p><strong>Email:</strong> ${user.email}</p>
      <button id="cerrarSesion">Cerrar sesión</button>
    `;
    document.getElementById("cerrarSesion").addEventListener("click", () => {
      signOut(auth).then(() => {
        mostrarMensaje("Sesión cerrada.", "exito");
        renderAuthForm(true); // Vuelve al formulario de inicio de sesión
      }).catch(e => mostrarMensaje("Error al cerrar sesión: " + e.message, "error"));
    });
  }

  onAuthStateChanged(auth, user => {
    if (user) {
      displayUserProfile(user);
    } else {
      renderAuthForm(false); // Muestra el formulario de registro por defecto
    }
  });

} else if (protectedPages.includes(currentPage)) {
  onAuthStateChanged(auth, user => {
    if (!user) {
      mostrarMensaje("Inicia sesión primero", "error");
      window.location.href = "index.html";
      return;
    }

    // Lógica específica para cada página protegida
    if (currentPage === "crear.html") {
      const btnCrear = document.getElementById("btnCrear");
      btnCrear?.addEventListener("click", crearPartido);
    } else if (currentPage === "mios.html") {
      cargarPartidos(); // Carga partidos disponibles
      cargarMisPartidos(); // Carga mis partidos
    } else if (currentPage === "explorar.html") {
      // Esta página es ahora solo informativa, no muestra partidos.
      // Si se desea mostrar partidos disponibles aquí, se debería agregar un div para lista-partidos.
    }
  });
}

// Funciones comunes
window.logout = function() {
  signOut(auth).then(() => {
    window.location.href = "index.html";
  }).catch(e => mostrarMensaje("Error al cerrar sesión: " + e.message, "error"));
};

// Función para cargar partidos (ahora usada en mios.html para 'disponibles')
function cargarPartidos() {
  const lista = document.getElementById("lista-partidos");
  if (!lista) return;
  lista.innerHTML = ""; // Limpiar antes de cargar

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  getDocs(partidosCol).then(snapshot => {
    if (snapshot.empty) {
      lista.innerHTML = "<p>No hay partidos disponibles en este momento.</p>";
      return;
    }
    snapshot.forEach(doc => {
      const p = doc.data();
      const fechaPartido = new Date(p.fecha);
      if (fechaPartido < hoy) return; // No mostrar partidos pasados

      const div = document.createElement("div");
      div.className = "partido";
      const fechaFormateada = fechaPartido.toLocaleString();
      let jugadoresActuales = p.jugadores ? p.jugadores.length : 0;
      
      // Mostrar la lista de jugadores de forma mejorada
      const jugadoresListItems = p.jugadores && p.jugadores.length > 0
        ? p.jugadores.map(jugador => `<li>${jugador}</li>`).join('')
        : '<li>Nadie se ha unido aún.</li>';

      div.innerHTML = `
        <h3>${p.lugar}</h3>
        <p class="fecha-partido"><strong>Fecha:</strong> ${fechaFormateada}</p>
        <p class="descripcion-partido">${p.descripcion}</p>
        <p class="cupos-partido"><strong>Jugadores:</strong> ${jugadoresActuales} / ${p.cupos}</p>
        <div class="jugadores-list">
          <strong>Inscritos:</strong>
          <ul>
            ${jugadoresListItems}
          </ul>
        </div>
      `;

      if (auth.currentUser && !p.jugadores.includes(auth.currentUser.email)) {
        const btn = document.createElement("button");
        btn.textContent = "Unirse";
        btn.onclick = () => unirseAPartido(doc.id, p);
        div.appendChild(btn);
      } else if (auth.currentUser && p.jugadores.includes(auth.currentUser.email)) {
        const spanUnido = document.createElement("span");
        spanUnido.textContent = "¡Ya estás unido!";
        spanUnido.style.color = "green";
        div.appendChild(spanUnido);
      }
      lista.appendChild(div);
    });
  }).catch(e => mostrarMensaje("Error al cargar partidos: " + e.message, "error"));
}

// Función para crear partido
function crearPartido() {
  const lugar = document.getElementById("lugar").value.trim();
  const fechaInput = document.getElementById("fecha").value;
  const cupos = parseInt(document.getElementById("cupos").value);
  const descripcion = document.getElementById("descripcion").value.trim();

  if (!lugar || !fechaInput || isNaN(cupos) || cupos < 1) {
    mostrarMensaje("Por favor, completa todos los campos correctamente.", "error");
    return;
  }

  const fecha = new Date(fechaInput);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const maxFecha = new Date();
  maxFecha.setDate(hoy.getDate() + 30);

  if (fecha < hoy) {
    mostrarMensaje("No puedes crear partidos en fechas pasadas.", "error");
    return;
  }

  if (fecha > maxFecha) {
    mostrarMensaje("No puedes crear partidos con más de 30 días de anticipación.", "error");
    return;
  }

  const partido = {
    lugar,
    fecha: fecha.toISOString(),
    cupos,
    descripcion,
    creador: auth.currentUser.email,
    jugadores: [auth.currentUser.email] // El creador se une automáticamente
  };

  addDoc(partidosCol, partido).then(() => {
    mostrarMensaje("¡Partido creado exitosamente!", "exito");
    window.location.href = "mios.html"; // Redirigir a mios.html para ver el partido
  }).catch(e => mostrarMensaje("Error al crear partido: " + e.message, "error"));
}

// Función para cargar mis partidos (en mios.html)
function cargarMisPartidos() {
  const cont = document.getElementById("mis-partidos");
  if (!cont) return;
  cont.innerHTML = ""; // Limpiar antes de cargar

  const q = query(partidosCol, where("jugadores", "array-contains", auth.currentUser.email));
  getDocs(q).then(snapshot => {
    if (snapshot.empty) {
      cont.innerHTML = "<p>Aún no te has unido a ningún partido ni has creado uno.</p>";
      return;
    }
    snapshot.forEach(doc => {
      const p = doc.data();
      const div = document.createElement("div");
      const fechaFormateada = new Date(p.fecha).toLocaleString();
      
      // Mostrar la lista de jugadores de forma mejorada
      const jugadoresListItems = p.jugadores && p.jugadores.length > 0
        ? p.jugadores.map(jugador => `<li>${jugador}</li>`).join('')
        : '<li>Nadie se ha unido aún.</li>';

      div.className = "partido";
      div.innerHTML = `
        <h3>${p.lugar}</h3>
        <p class="fecha-partido"><strong>Fecha:</strong> ${fechaFormateada}</p>
        <p class="descripcion-partido">${p.descripcion}</p>
        <p class="cupos-partido"><strong>Jugadores:</strong> ${p.jugadores.length} / ${p.cupos}</p>
        <div class="jugadores-list">
          <strong>Inscritos:</strong>
          <ul>
            ${jugadoresListItems}
          </ul>
        </div>
      `;
      cont.appendChild(div);
    });
  }).catch(e => mostrarMensaje("Error al cargar mis partidos: " + e.message, "error"));
}

// Función para unirse a un partido
window.unirseAPartido = function(id, partido) {
  if (!auth.currentUser) {
    mostrarMensaje("Debes iniciar sesión para unirte a un partido.", "error");
    window.location.href = "index.html";
    return;
  }
  if (partido.jugadores.includes(auth.currentUser.email)) {
    mostrarMensaje("Ya estás unido a este partido.", "info");
    return;
  }
  if (partido.jugadores.length >= partido.cupos) {
    mostrarMensaje("El partido ya está lleno.", "error");
    return;
  }

  // Clonar el array de jugadores para evitar mutar el objeto original directamente
  const nuevosJugadores = [...partido.jugadores, auth.currentUser.email];
  const docRef = doc(db, "partidos", id);

  updateDoc(docRef, { jugadores: nuevosJugadores }).then(() => {
    mostrarMensaje("Te has unido al partido exitosamente!", "exito");
    // Recargar ambas listas en mios.html para que se actualicen
    if (currentPage === "mios.html") {
      cargarPartidos();
      cargarMisPartidos();
    }
  }).catch(e => mostrarMensaje("Error al unirse al partido: " + e.message, "error"));
};