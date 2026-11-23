(function () {
  "use strict";

  const K_TOKEN = "bv_token";
  const K_USUARIO = "bv_usuario";
  const K_VOLVER = "bv_volver";

  const STAFF = ["Administrador", "Vendedor"];
  const archivo = location.pathname.split("/").pop() || "inicio.html";

  // Páginas que exigen sesión y los roles que pueden verlas.
  const PROTEGIDAS = {
    "panel-admin.html": STAFF,
    "panel-empleado.html": ["Vendedor"],
    "panel-cliente.html": ["Cliente"],
  };

  function leerUsuario() {
    try {
      return JSON.parse(localStorage.getItem(K_USUARIO));
    } catch (e) {
      return null;
    }
  }

  function panelDe(rol) {
    if (rol === "Administrador") return "panel-admin.html";
    if (rol === "Vendedor") return "panel-empleado.html";
    if (rol === "Cliente") return "panel-cliente.html";
    return "inicio.html";
  }

  const Sesion = {
    token: () => localStorage.getItem(K_TOKEN),
    usuario: leerUsuario,
    rol: () => {
      const u = leerUsuario();
      return u ? u.rol : null;
    },
    estaLogueado: () => !!localStorage.getItem(K_TOKEN) && !!leerUsuario(),
    esStaff: () => STAFF.indexOf(Sesion.rol()) !== -1,
    panelDe,

    iniciar(token, usuario) {
      localStorage.setItem(K_TOKEN, token);
      localStorage.setItem(K_USUARIO, JSON.stringify(usuario));
      // Asegurar que al iniciar sesión el panel siempre abra desde la pestaña principal (Dashboard / Inicio)
      localStorage.removeItem("bv_seccion:panel-admin.html");
      localStorage.removeItem("bv_seccion:panel-cliente.html");
      localStorage.removeItem("bv_seccion:panel-empleado.html");
    },

    limpiar() {
      localStorage.removeItem(K_TOKEN);
      localStorage.removeItem(K_USUARIO);
      localStorage.removeItem("usuarioLogueado");
      sessionStorage.removeItem(K_TOKEN);
      sessionStorage.removeItem(K_USUARIO);
      sessionStorage.removeItem("usuarioLogueado");
    },
    async cerrar() {
      const token = Sesion.token();

      try {
        if (token) {
          await fetch(window.Api.base + "/api/logout", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        }
      } catch (error) {
        console.error("Error al cerrar la sesión:", error);
      } finally {
        Sesion.limpiar();
        location.href = "inicio.html";
      }
    },

    // Manda al login y recuerda a dónde volver (carrito, agendar cita, etc.).
    irALogin() {
      if (archivo !== "inicio-sesion.html") {
        sessionStorage.setItem(K_VOLVER, archivo + location.search);
      }
      location.replace("inicio-sesion.html");
    },

    // Lo usa autenticacion.js después de un login correcto.
    destinoTrasLogin() {
      const volver = sessionStorage.getItem(K_VOLVER);
      sessionStorage.removeItem(K_VOLVER);
      return volver || panelDe(Sesion.rol());
    },
  };

  window.Sesion = Sesion;

  // ---------- Detectar regreso desde un panel al inicio de sesión ----------

  const MARCA_REGRESO_PANEL = "bv_regreso_panel";

  if (PROTEGIDAS[archivo] && Sesion.estaLogueado()) {
    window.addEventListener("pagehide", () => {
      sessionStorage.setItem(MARCA_REGRESO_PANEL, "true");
    });
  }

  if (archivo === "inicio-sesion.html") {
    window.addEventListener("pageshow", async (evento) => {
      const navegacion = performance.getEntriesByType("navigation")[0];

      const regresoAtras =
        evento.persisted || (navegacion && navegacion.type === "back_forward");

      if (!regresoAtras) {
        sessionStorage.removeItem(MARCA_REGRESO_PANEL);
        return;
      }

      if (sessionStorage.getItem(MARCA_REGRESO_PANEL) !== "true") {
        return;
      }

      sessionStorage.removeItem(MARCA_REGRESO_PANEL);

      const token = Sesion.token();

      Sesion.limpiar();

      try {
        if (token) {
          await fetch(window.Api.base + "/api/logout", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        }
      } catch (error) {
        console.error("Error al invalidar la sesión:", error);
      }
    });
  }

  // ---------- Protección al restaurar paneles desde la caché ----------

  if (PROTEGIDAS[archivo]) {
    window.addEventListener("pageshow", (evento) => {
      if (!evento.persisted) return;

      document.documentElement.style.visibility = "hidden";

      if (
        !Sesion.estaLogueado() ||
        PROTEGIDAS[archivo].indexOf(Sesion.rol()) === -1
      ) {
        Sesion.irALogin();
        return;
      }

      document.documentElement.style.visibility = "";
    });
  }

  // ---------- Protección de páginas (corre de inmediato, antes de pintar) ----------
  const permitidos = PROTEGIDAS[archivo];
  if (permitidos) {
    if (!Sesion.estaLogueado()) {
      document.documentElement.style.visibility = "hidden";
      Sesion.irALogin();
      return;
    }
    if (permitidos.indexOf(Sesion.rol()) === -1) {
      document.documentElement.style.visibility = "hidden";
      location.replace(panelDe(Sesion.rol()));
      return;
    }
  }

  // ---------- Control de inactividad: 15 minutos ----------
  const TIEMPO_INACTIVIDAD = 15 * 60 * 1000;
  let temporizadorInactividad;
  let ultimaActividadServidor = 0;

  async function registrarActividadServidor() {
    const token = Sesion.token();

    if (!token) return;

    const ahora = Date.now();

    if (ahora - ultimaActividadServidor < 60000) return;

    ultimaActividadServidor = ahora;

    try {
      const respuesta = await fetch(window.Api.base + "/api/sesion/actividad", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (respuesta.status === 401 || respuesta.status === 403) {
        window.dispatchEvent(new Event("bv:sesion-expirada"));
      }
    } catch (error) {
      console.error("Error al registrar actividad:", error);
    }
  }

  function reiniciarTemporizador() {
    if (!Sesion.estaLogueado()) return;
    registrarActividadServidor();

    clearTimeout(temporizadorInactividad);

    temporizadorInactividad = setTimeout(() => {
      Sesion.cerrar();
    }, TIEMPO_INACTIVIDAD);
  }

  // Token vencido: api.js avisa con este evento.
  window.addEventListener("bv:sesion-expirada", () => {
    clearTimeout(temporizadorInactividad);
    Sesion.limpiar();
    Sesion.irALogin();
  });

  // Detectar actividad del usuario
  ["click", "keydown", "scroll", "touchstart"].forEach((evento) => {
    window.addEventListener(evento, reiniciarTemporizador);
  });

  // Iniciar el temporizador
  reiniciarTemporizador();

  // ---------- Interfaz ----------
  function iniciales(nombre) {
    const partes = String(nombre || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (partes.length === 0) return "?";
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
    return (partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
  }

  function ponerTexto(id, texto) {
    const el = document.getElementById(id);
    if (el) el.textContent = texto;
  }

  // Quita lo que el rol actual no debe ver (data-roles="Administrador,Vendedor").
  function aplicarRoles(rol) {
    document.querySelectorAll("[data-roles]").forEach((el) => {
      const permitidosEl = el.dataset.roles.split(",").map((r) => r.trim());
      if (permitidosEl.indexOf(rol) === -1) el.remove();
    });
  }

  function pintarIdentidad(usuario) {
    const nombre = usuario.nombre || "";
    ponerTexto("adminName", nombre);
    ponerTexto("adminRol", usuario.rol || "");
    ponerTexto("adminAvatar", iniciales(nombre));
    ponerTexto("userName", nombre.split(" ")[0]);
    ponerTexto("userAvatar", iniciales(nombre));
    ponerTexto("profileAvatarLarge", iniciales(nombre));
  }

  function pintarNavbar(usuario) {
    if (typeof window.actualizarNavbarSesion === "function") {
      window.actualizarNavbarSesion(usuario, () => Sesion.cerrar());
    }
  }

  function alListo(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  alListo(() => {
    // Los botones de cerrar sesión de los paneles (.logout-btn) se tratan aparte.
    document.querySelectorAll(".logout-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        Sesion.cerrar();
      });
    });

    if (!Sesion.estaLogueado()) return;
    const usuario = Sesion.usuario();

    aplicarRoles(usuario.rol);
    pintarIdentidad(usuario);
    pintarNavbar(usuario);
  });
})();
