// session-manager.js
// Script para mantener y gestionar el estado de sesión en todas las páginas

window.actualizarNavbarSesion = function (usuario, cerrarSesion) {
  const panelesPorRol = {
    administrador: "panel-admin.html",
    admin: "panel-admin.html",
    vendedor: "panel-empleado.html",
    empleado: "panel-empleado.html",
    cliente: "panel-cliente.html",
  };
  const rol =
    usuario && typeof usuario.rol === "string"
      ? usuario.rol.toLowerCase()
      : "";
  const panel = Object.prototype.hasOwnProperty.call(panelesPorRol, rol)
    ? panelesPorRol[rol]
    : null;

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

      const enlaceCuenta = enlace;
      enlaceCuenta.href = panel;
      enlaceCuenta.className = "navbar-profile-link";
      enlaceCuenta.setAttribute("aria-label", `Abrir la cuenta de ${nombre}`);

      const foto =
        typeof usuario.foto_perfil === "string" &&
        usuario.foto_perfil.startsWith("data:image/jpeg;base64,");
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
      enlaceCuenta.replaceChildren(avatar, document.createTextNode(nombre));

      elementoMenu.classList.add("navbar-account-item");
      elementoMenu.replaceChildren(enlaceCuenta, enlaceCerrar);
    });
};

document.addEventListener("DOMContentLoaded", () => {
  const pathActual = window.location.pathname;

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

<<<<<<< HEAD
  let userData = null;
  const usuarioLogueadoStr = localStorage.getItem("bv_usuario");
=======
  const usuarioLogueadoStr =
    localStorage.getItem("bv_usuario") ||
    sessionStorage.getItem("bv_usuario") ||
    localStorage.getItem("usuarioLogueado");
  const pathActual = window.location.pathname;
  const avataresNavbar = [];

  function panelDeUsuario(usuario) {
    const rol = String((usuario && usuario.rol) || "").toLowerCase();
    if (rol === "cliente") {
      return {
        href: "panel-cliente.html",
        texto: "MI PANEL",
        icono: "fa-solid fa-user",
        title: "Mi perfil",
        ariaLabel: "Abrir mi perfil",
      };
    }
    if (rol === "administrador" || rol === "admin") {
      return {
        href: "panel-admin.html",
        texto: "PANEL ADMIN",
        icono: "fa-solid fa-chart-pie",
        title: "Panel de administración",
        ariaLabel: "Abrir panel de administración",
      };
    }
    if (rol === "vendedor" || rol === "empleado") {
      return {
        href: "panel-empleado.html",
        texto: "MI PANEL",
        icono: "fa-solid fa-id-badge",
        title: "Mi panel",
        ariaLabel: "Abrir mi panel",
      };
    }
    return null;
  }

  function crearEnlacePanel(panel) {
    const li = document.createElement("li");
    const link = document.createElement("a");
    const fallback = document.createElement("i");
    const avatar = document.createElement("img");
    const texto = document.createElement("span");

    link.href = panel.href;
    link.className = "navbar-profile-link";
    link.title = panel.title;
    link.setAttribute("aria-label", panel.ariaLabel);

    fallback.className = panel.icono + " navbar-profile-fallback";
    fallback.setAttribute("aria-hidden", "true");
    avatar.className = "navbar-profile-avatar";
    avatar.alt = "";
    avatar.hidden = true;
    avatar.addEventListener(
      "error",
      () => {
        avatar.hidden = true;
        fallback.hidden = false;
      },
      { once: true },
    );
    texto.textContent = panel.texto;

    link.appendChild(fallback);
    link.appendChild(avatar);
    link.appendChild(texto);
    li.appendChild(link);
    avataresNavbar.push({ avatar, fallback });
    return li;
  }

  function cargarFotoNavbar(usuario) {
    if (!avataresNavbar.length || !window.Api) return;

    const idUsuario = Number(usuario && (usuario.id || usuario.id_usuario));
    if (!Number.isInteger(idUsuario) || idUsuario <= 0) return;

    window.Api.get("/api/perfil/" + idUsuario)
      .then((perfil) => {
        if (
          typeof perfil.foto_perfil !== "string" ||
          !/^data:image\/(?:jpeg|png|webp);base64,/i.test(perfil.foto_perfil)
        ) {
          return;
        }
        avataresNavbar.forEach(({ avatar, fallback }) => {
          avatar.src = perfil.foto_perfil;
          avatar.hidden = false;
          fallback.hidden = true;
        });
      })
      .catch((error) => {
        console.warn(
          "No se pudo cargar la imagen de perfil del navbar:",
          error.message,
        );
      });
  }

>>>>>>> 8071640b70c87803c99aba5e224f465a3debe069
  if (usuarioLogueadoStr) {
    try {
      userData = JSON.parse(usuarioLogueadoStr);
<<<<<<< HEAD
    } catch (error) {
      console.error("No se pudo leer el usuario de la sesión:", error);
=======
    } catch (e) {}

    const menu = document.querySelector(".navbar-menu");
    const panel = panelDeUsuario(userData);
    const enlacePanel =
      menu && panel && menu.querySelector('a[href="' + panel.href + '"]');
    if (enlacePanel) {
      const elementoPanel = enlacePanel.closest("li");
      if (elementoPanel) elementoPanel.replaceWith(crearEnlacePanel(panel));
>>>>>>> 8071640b70c87803c99aba5e224f465a3debe069
    }
  }

<<<<<<< HEAD
  if (localStorage.getItem("bv_token") && userData) {
    window.actualizarNavbarSesion(userData, cerrarSesionGlobal);

    if (
      userData.avatar_cargado !== true &&
      userData.id &&
      window.Api &&
      typeof window.Api.get === "function" &&
      document.querySelector("header.navbar")
    ) {
      window.Api.get("/api/perfil/" + encodeURIComponent(userData.id))
        .then((perfil) => {
          userData = Object.assign({}, userData, {
            apellido: perfil.apellido || userData.apellido || "",
            foto_perfil: perfil.foto_perfil || null,
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

  if (!window.Sesion || typeof window.Sesion.cerrar !== "function") {
    document.querySelectorAll(".logout-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        cerrarSesionGlobal();
      });
    });
  }

  if (!userData && pathActual.includes("panel-admin.html")) {
=======
    const loginLinks = menu
      ? menu.querySelectorAll('a[href="inicio-sesion.html"]')
      : [];
    loginLinks.forEach((link) => {
      if (
        pathActual.includes("inicio-sesion.html") ||
        pathActual.includes("registro-usuario.html")
      ) {
        return;
      }

      link.innerHTML =
        '<i class="fa-solid fa-right-from-bracket"></i> CERRAR SESIÓN';
      link.href = "#";
      link.addEventListener("click", (event) => {
        event.preventDefault();
        cerrarSesionGlobal();
      });

      if (panel && !avataresNavbar.length) {
        link.parentElement.insertAdjacentElement(
          "beforebegin",
          crearEnlacePanel(panel),
        );
      }
    });
    cargarFotoNavbar(userData);

    document.querySelectorAll(".logout-btn").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        cerrarSesionGlobal();
      });
    });
  } else if (pathActual.includes("panel-admin.html")) {
>>>>>>> 8071640b70c87803c99aba5e224f465a3debe069
    alert("Debes iniciar sesión para acceder al panel.");
    window.location.href = "inicio-sesion.html";
  }
});

// --- Manejo Global del Tema y Logotipos ---
(function () {
  const esPaginaPanel =
    window.location.pathname.includes("panel-admin.html") ||
    window.location.pathname.includes("panel-empleado.html") ||
    window.location.pathname.includes("panel-cliente.html");
  const CLAVE_TEMA = "pub_theme";
  const temaGuardado = localStorage.getItem(CLAVE_TEMA);
  const temaAnterior = localStorage.getItem("bv-theme");
  const savedTheme = temaGuardado || temaAnterior; // conservar la preferencia del visualizador anterior
  if (!temaGuardado && temaAnterior) {
    localStorage.setItem(CLAVE_TEMA, temaAnterior);
    localStorage.removeItem("bv-theme");
  }
  // Por defecto modo claro; solo oscuro si el usuario lo eligió explícitamente
  const isDark = savedTheme === "dark";
  let temporizadorAnimacionTema;

  function aplicarTemaPublico(dark) {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark-mode");
      root.classList.remove("light-mode");
    } else {
      root.classList.remove("dark-mode");
      root.classList.add("light-mode");
    }

    const logoSrc = dark
      ? "../imagenes/logos/Logo_modo_oscuro.webp"
      : "../imagenes/logos/Logo_modo_claro.webp";
    document.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src") || "";
      if (
        src.includes("Logo_modo_claro.webp") ||
        src.includes("Logo_modo_oscuro.webp")
      ) {
        img.setAttribute("src", logoSrc);
      }
    });

    const btn = document.getElementById("btnTemaPublico");
    if (btn) {
      const icon = btn.querySelector("i");
      if (dark) {
        if (icon) icon.className = "fa-solid fa-sun";
        btn.setAttribute("aria-label", "Activar modo claro");
        btn.title = "Activar modo claro";
      } else {
        if (icon) icon.className = "fa-solid fa-moon";
        btn.setAttribute("aria-label", "Activar modo oscuro");
        btn.title = "Activar modo oscuro";
      }
    }
  }

  function animarCambioTema(btn) {
    const root = document.documentElement;
    root.classList.remove("theme-transition");
    if (btn) btn.classList.remove("is-animating");
    void root.offsetWidth;
    root.classList.add("theme-transition");
    if (btn) btn.classList.add("is-animating");

    window.clearTimeout(temporizadorAnimacionTema);
    temporizadorAnimacionTema = window.setTimeout(() => {
      root.classList.remove("theme-transition");
      if (btn) btn.classList.remove("is-animating");
    }, 900);
  }

  if (!esPaginaPanel) {
    if (isDark) document.documentElement.classList.add("dark-mode");
    else document.documentElement.classList.add("light-mode");
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (esPaginaPanel) return;

    aplicarTemaPublico(isDark);

    const btn = document.getElementById("btnTemaPublico");
    if (btn) {
      btn.addEventListener("click", () => {
        const ahoraOscuro =
          document.documentElement.classList.contains("dark-mode");
        const nuevoOscuro = !ahoraOscuro;
        animarCambioTema(btn);
        localStorage.setItem(CLAVE_TEMA, nuevoOscuro ? "dark" : "light");
        aplicarTemaPublico(nuevoOscuro);
      });
    }
  });
})();
