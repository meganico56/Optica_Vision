(function () {
  var STORAGE_KEY = "optica-accesibilidad-v1";

  // Si el sistema pide menos movimiento, las animaciones arrancan detenidas
  function obtenerDefaults() {
    var menosMovimiento = false;
    try {
      menosMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (error) {
      menosMovimiento = false;
    }
    return {
      escala: "normal",
      contraste: false,
      grises: false,
      fuente: false,
      enlaces: false,
      animaciones: menosMovimiento
    };
  }

  function cargarPreferencias() {
    var defaults = obtenerDefaults();
    try {
      var guardadas = window.localStorage.getItem(STORAGE_KEY);
      if (!guardadas) return defaults;

      var preferencias = JSON.parse(guardadas);
      if (!preferencias || typeof preferencias !== "object" || Array.isArray(preferencias)) {
        return defaults;
      }

      return {
        escala: ["chica", "normal", "grande"].indexOf(preferencias.escala) !== -1
          ? preferencias.escala
          : defaults.escala,
        contraste: preferencias.contraste === true,
        grises: preferencias.grises === true,
        fuente: preferencias.fuente === true,
        enlaces: preferencias.enlaces === true,
        animaciones: preferencias.animaciones === true
      };
    } catch (error) {
      console.error("No se pudieron cargar las preferencias de accesibilidad.", error);
      return defaults;
    }
  }

  function guardarPreferencias(preferencias) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferencias));
    } catch (error) {
      console.error("No se pudieron guardar las preferencias de accesibilidad.", error);
    }
  }

  function crearPanel() {
    var contenedor = document.createElement("aside");
    contenedor.className = "accesibilidad";
    contenedor.setAttribute("aria-label", "Opciones de accesibilidad");
    contenedor.innerHTML = `
      <button class="accesibilidad-boton" type="button" aria-label="Abrir opciones de accesibilidad" aria-expanded="false" aria-controls="panel-accesibilidad">
        <i class="fa-solid fa-universal-access" aria-hidden="true"></i>
      </button>
      <section class="accesibilidad-panel" id="panel-accesibilidad" aria-labelledby="titulo-accesibilidad" hidden>
        <h2 id="titulo-accesibilidad">Accesibilidad</h2>
        <p class="accesibilidad-titulo" id="acc-titulo-escala">Tamaño de la página</p>
        <div class="accesibilidad-opciones" role="group" aria-labelledby="acc-titulo-escala">
          <input type="radio" name="accesibilidad-escala" id="accesibilidad-escala-chica" value="chica" aria-label="Reducir página">
          <label for="accesibilidad-escala-chica">A-</label>
          <input type="radio" name="accesibilidad-escala" id="accesibilidad-escala-normal" value="normal">
          <label for="accesibilidad-escala-normal">Normal</label>
          <input type="radio" name="accesibilidad-escala" id="accesibilidad-escala-grande" value="grande" aria-label="Agrandar página">
          <label for="accesibilidad-escala-grande">A+</label>
        </div>
        <p class="accesibilidad-titulo" id="acc-titulo-visualizacion">Visualización</p>
        <div class="accesibilidad-lista" role="group" aria-labelledby="acc-titulo-visualizacion">
          <input type="checkbox" id="accesibilidad-contraste">
          <label for="accesibilidad-contraste"><i class="fa-solid fa-circle-half-stroke" aria-hidden="true"></i> Alto contraste</label>
          <input type="checkbox" id="accesibilidad-grises">
          <label for="accesibilidad-grises"><i class="fa-solid fa-droplet-slash" aria-hidden="true"></i> Escala de grises</label>
          <input type="checkbox" id="accesibilidad-fuente">
          <label for="accesibilidad-fuente"><i class="fa-solid fa-font" aria-hidden="true"></i> Fuente legible</label>
          <input type="checkbox" id="accesibilidad-enlaces">
          <label for="accesibilidad-enlaces"><i class="fa-solid fa-link" aria-hidden="true"></i> Resaltar enlaces</label>
          <input type="checkbox" id="accesibilidad-animaciones">
          <label for="accesibilidad-animaciones"><i class="fa-solid fa-pause" aria-hidden="true"></i> Detener animaciones</label>
        </div>
        <button class="accesibilidad-reset" type="button">
          <i class="fa-solid fa-rotate-left" aria-hidden="true"></i> Restablecer
        </button>
      </section>
    `;

    document.body.appendChild(contenedor);
    return contenedor;
  }

  function inicializar() {
    if (document.querySelector(".accesibilidad")) return;

    var contenedor = crearPanel();
    var boton = contenedor.querySelector(".accesibilidad-boton");
    var panel = contenedor.querySelector(".accesibilidad-panel");
    var escalaInputs = contenedor.querySelectorAll('input[name="accesibilidad-escala"]');
    var controles = {
      contraste: contenedor.querySelector("#accesibilidad-contraste"),
      grises: contenedor.querySelector("#accesibilidad-grises"),
      fuente: contenedor.querySelector("#accesibilidad-fuente"),
      enlaces: contenedor.querySelector("#accesibilidad-enlaces"),
      animaciones: contenedor.querySelector("#accesibilidad-animaciones")
    };
    var preferencias = cargarPreferencias();

    function aplicarPreferencias() {
      var body = document.body;
      body.classList.toggle("accesibilidad-escala-chica", preferencias.escala === "chica");
      body.classList.toggle("accesibilidad-escala-grande", preferencias.escala === "grande");
      body.classList.toggle("accesibilidad-contraste", preferencias.contraste);
      body.classList.toggle("accesibilidad-grises", preferencias.grises);
      body.classList.toggle("accesibilidad-fuente", preferencias.fuente);
      body.classList.toggle("accesibilidad-enlaces", preferencias.enlaces);
      body.classList.toggle("accesibilidad-sin-animaciones", preferencias.animaciones);

      Array.prototype.forEach.call(escalaInputs, function (input) {
        input.checked = input.value === preferencias.escala;
      });
      Object.keys(controles).forEach(function (opcion) {
        controles[opcion].checked = Boolean(preferencias[opcion]);
      });
    }

    boton.addEventListener("click", function () {
      var abierto = boton.getAttribute("aria-expanded") !== "true";
      boton.setAttribute("aria-expanded", String(abierto));
      boton.setAttribute("aria-label", abierto ? "Cerrar opciones de accesibilidad" : "Abrir opciones de accesibilidad");
      panel.hidden = !abierto;
      if (abierto) {
        // El foco va a la opción de tamaño seleccionada
        (contenedor.querySelector('input[name="accesibilidad-escala"]:checked') || escalaInputs[0]).focus();
      }
    });

    Array.prototype.forEach.call(escalaInputs, function (input) {
      input.addEventListener("change", function () {
        preferencias.escala = input.value;
        aplicarPreferencias();
        guardarPreferencias(preferencias);
      });
    });

    Object.keys(controles).forEach(function (opcion) {
      controles[opcion].addEventListener("change", function () {
        preferencias[opcion] = controles[opcion].checked;
        aplicarPreferencias();
        guardarPreferencias(preferencias);
      });
    });

    contenedor.querySelector(".accesibilidad-reset").addEventListener("click", function () {
      preferencias = obtenerDefaults();
      aplicarPreferencias();
      guardarPreferencias(preferencias);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !panel.hidden) {
        panel.hidden = true;
        boton.setAttribute("aria-expanded", "false");
        boton.setAttribute("aria-label", "Abrir opciones de accesibilidad");
        boton.focus();
      }
    });

    aplicarPreferencias();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inicializar, { once: true });
  } else {
    inicializar();
  }
})();