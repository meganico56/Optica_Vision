// session-manager.js
// Script para mantener y gestionar el estado de sesión en todas las páginas

window.actualizarNavbarSesion = function (usuario, cerrarSesion) {
  if (!usuario || typeof usuario !== "object") return;

  const panelesPorRol = {
    administrador: "panel-admin.html",
    admin: "panel-admin.html",
    vendedor: "panel-empleado.html",
    empleado: "panel-empleado.html",
    cliente: "panel-cliente.html",
  };
  const rol =
    typeof usuario.rol === "string" ? usuario.rol.trim().toLowerCase() : "";
  const panel = panelesPorRol[rol];

  if (!panel) return;

  const nombre =
    typeof usuario.nombre === "string" && usuario.nombre.trim()
      ? usuario.nombre.trim()
      : "Mi cuenta";
  const partesNombre = [usuario.nombre, usuario.apellido]
    .filter((parte) => typeof parte === "string" && parte.trim())
    .join(" ")
    .trim()
    .split(/\s+/);
  const iniciales =
    partesNombre.length > 1
      ? partesNombre[0].charAt(0) +
        partesNombre[partesNombre.length - 1].charAt(0)
      : partesNombre[0]
        ? partesNombre[0].charAt(0)
        : "?";

  document
    .querySelectorAll(
      'header.navbar a[href="inicio-sesion.html"], header.navbar a.navbar-profile-link',
    )
    .forEach((enlace) => {
      const elementoMenu = enlace.closest("li");
      if (!elementoMenu) return;

      let enlaceCerrar = elementoMenu.querySelector(".navbar-logout-link");
      if (!enlaceCerrar) {
        enlaceCerrar = document.createElement("a");
        enlaceCerrar.href = "#";
        enlaceCerrar.className = "navbar-logout-link";
        enlaceCerrar.setAttribute("aria-label", "Cerrar sesión");

        const iconoCerrar = document.createElement("i");
        iconoCerrar.className = "fa-solid fa-right-from-bracket";
        iconoCerrar.setAttribute("aria-hidden", "true");
        enlaceCerrar.appendChild(iconoCerrar);
        enlaceCerrar.addEventListener("click", (evento) => {
          evento.preventDefault();
          cerrarSesion();
        });
      }

      enlace.href = panel;
      enlace.className = "navbar-profile-link";
      enlace.setAttribute("aria-label", `Abrir la cuenta de ${nombre}`);

      const foto =
        typeof usuario.foto_perfil === "string" &&
        /^data:image\/(?:jpeg|png|webp);base64,/i.test(usuario.foto_perfil);
      const avatar = document.createElement(foto ? "img" : "span");
      avatar.className = foto
        ? "navbar-profile-avatar"
        : "navbar-profile-fallback";
      avatar.setAttribute("aria-hidden", "true");
      if (foto) {
        avatar.src = usuario.foto_perfil;
        avatar.alt = "";
      } else {
        avatar.textContent = iniciales.toUpperCase();
      }
      enlace.replaceChildren(avatar, document.createTextNode(nombre));

      elementoMenu.classList.add("navbar-account-item");
      elementoMenu.replaceChildren(enlace, enlaceCerrar);
    });
};

document.addEventListener("DOMContentLoaded", () => {
  const usuarioLogueadoStr =
    localStorage.getItem("bv_usuario") ||
    sessionStorage.getItem("bv_usuario") ||
    localStorage.getItem("usuarioLogueado");
  let userData = null;

  function cerrarSesionGlobal() {
    localStorage.removeItem("bv_volver");
    sessionStorage.removeItem("bv_volver");

    if (window.Sesion && typeof window.Sesion.cerrar === "function") {
      window.Sesion.cerrar();
      return;
    }

    localStorage.removeItem("usuarioLogueado");
    localStorage.removeItem("bv_token");
    localStorage.removeItem("bv_usuario");
    sessionStorage.removeItem("usuarioLogueado");
    sessionStorage.removeItem("bv_token");
    sessionStorage.removeItem("bv_usuario");
    window.location.href = "inicio.html";
  }

  if (usuarioLogueadoStr) {
    try {
      userData = JSON.parse(usuarioLogueadoStr);
    } catch (error) {
      console.error("No se pudo leer el usuario de la sesión:", error);
    }
  }

  const token =
    localStorage.getItem("bv_token") || sessionStorage.getItem("bv_token");
  if (userData && (token || localStorage.getItem("usuarioLogueado"))) {
    window.actualizarNavbarSesion(userData, cerrarSesionGlobal);

    const idUsuario = userData.id || userData.id_usuario;
    if (
      userData.avatar_cargado !== true &&
      idUsuario &&
      window.Api &&
      typeof window.Api.get === "function" &&
      document.querySelector("header.navbar")
    ) {
      window.Api.get("/api/perfil/" + encodeURIComponent(idUsuario))
        .then((perfil) => {
          userData = Object.assign({}, userData, {
            apellido: perfil.apellido || userData.apellido || "",
            foto_perfil: perfil.foto_perfil || userData.foto_perfil || null,
            avatar_cargado: true,
          });
          window.actualizarNavbarSesion(userData, cerrarSesionGlobal);
          try {
            localStorage.setItem("bv_usuario", JSON.stringify(userData));
          } catch (error) {
            console.error("No se pudo guardar el avatar de la sesión:", error);
          }
        })
        .catch((error) => {
          console.error("No se pudo cargar el avatar del usuario:", error);
        });
    }
  }

});

// --- Manejo global del tema y de los logotipos ---
(function () {
  const esPaginaPanel =
    /panel-(?:admin|empleado|cliente)\.html$/.test(window.location.pathname);
  const CLAVE_TEMA = "pub_theme";
  const temaGuardado = localStorage.getItem(CLAVE_TEMA);
  const temaAnterior = localStorage.getItem("bv-theme");
  const tema = temaGuardado || temaAnterior;
  const esOscuro = tema === "dark";
  let temporizadorAnimacionTema;

  if (!temaGuardado && temaAnterior) {
    localStorage.setItem(CLAVE_TEMA, temaAnterior);
    localStorage.removeItem("bv-theme");
  }

  function aplicarTemaPublico(dark) {
    const root = document.documentElement;
    root.classList.toggle("dark-mode", dark);
    root.classList.toggle("light-mode", !dark);

    document.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src") || "";
      const logo = src.match(/^(.*)Logo_modo_(?:claro|oscuro)\.(webp|png)$/i);
      if (logo) {
        img.setAttribute(
          "src",
          `${logo[1]}Logo_modo_${dark ? "oscuro" : "claro"}.${logo[2]}`,
        );
      }
    });

    const btn = document.getElementById("btnTemaPublico");
    if (!btn) return;

    const icon = btn.querySelector("i");
    if (icon) icon.className = dark ? "fa-solid fa-sun" : "fa-solid fa-moon";
    btn.setAttribute(
      "aria-label",
      dark ? "Activar modo claro" : "Activar modo oscuro",
    );
    btn.title = dark ? "Activar modo claro" : "Activar modo oscuro";
  }

  function animarCambioTema(btn) {
    const root = document.documentElement;
    root.classList.remove("theme-transition");
    btn.classList.remove("is-animating");
    void root.offsetWidth;
    root.classList.add("theme-transition");
    btn.classList.add("is-animating");

    window.clearTimeout(temporizadorAnimacionTema);
    temporizadorAnimacionTema = window.setTimeout(() => {
      root.classList.remove("theme-transition");
      btn.classList.remove("is-animating");
    }, 900);
  }

  if (!esPaginaPanel) {
    document.documentElement.classList.toggle("dark-mode", esOscuro);
    document.documentElement.classList.toggle("light-mode", !esOscuro);
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (esPaginaPanel) return;

    aplicarTemaPublico(esOscuro);

    const btn = document.getElementById("btnTemaPublico");
    if (!btn || btn.dataset.themeBound === "true") return;
    btn.dataset.themeBound = "true";
    btn.addEventListener("click", () => {
      const nuevoOscuro =
        !document.documentElement.classList.contains("dark-mode");
      animarCambioTema(btn);
      localStorage.setItem(CLAVE_TEMA, nuevoOscuro ? "dark" : "light");
      aplicarTemaPublico(nuevoOscuro);
    });
  });
})();
