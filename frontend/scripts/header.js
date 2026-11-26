// header.js  El header unniversal de todas las paginas wey.
// el uso en cada pagina: <div id="header"></div> donde va el header
// y al final del propio body <script src="../scripts/header.js"></script>
// esta misma wey debe cargarse antes de session-manager.js y los demás scripts.
// Así se puede modificar aqui y se vera en todas las paginas

(function () {
  var HTML = `
<header class="navbar">
      <div class="logo">
        <a href="inicio.html">
          <img
            src="../imagenes/logos/Logo_modo_claro.webp"
            alt="Boutique de la Visión, ir al inicio"
            width="300"
            height="200"
            class="logo-icon"
          />
        </a>
      </div>

      <!-- Buscador del catálogo  -->
      <form class="buscador" action="catalogo.html" method="get" role="search">
        <input
          type="text"
          name="q"
          placeholder="Buscar productos..."
          class="busc"
          aria-label="Buscar productos"
        />
        <button type="submit" class="bot_bus" aria-label="Buscar">
          <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
        </button>
      </form>

      <input type="checkbox" id="menu-toggle" class="menu-toggle" />

      <nav aria-label="Menú principal">
        <ul class="navbar-menu">
          <li><a href="inicio.html">INICIO</a></li>
          <li><a href="catalogo.html">CATÁLOGO</a></li>
          <li><a href="agendar-cita.html">AGENDAR CITA</a></li>
          <li><a href="inicio-sesion.html">INICIAR SESIÓN</a></li>
          <li>
            <a href="carrito.html" aria-label="Carrito"><i class="fa-solid fa-cart-shopping" aria-hidden="true"></i><span class="cart-count" id="cartBadge" hidden>0</span></a>
          </li>
          <li class="navbar-theme-item">
            <button class="btn-tema" id="btnTemaPublico" type="button" aria-label="Alternar modo claro y oscuro" title="Alternar modo claro / oscuro">
              <i class="fa-solid fa-moon" aria-hidden="true"></i>
            </button>
          </li>
        </ul>
      </nav>
      <label for="menu-toggle" class="hamburguesa" aria-label="Abrir menú">
        <span></span>
        <span></span>
        <span></span>
      </label>
    </header>
`;

  var lugar = document.getElementById("header");
  if (lugar) lugar.outerHTML = HTML;

  // Marca como activa el enlace de la página actual
  var pagina = location.pathname.split("/").pop() || "inicio.html";
  document.querySelectorAll(".navbar-menu a[href]").forEach(function (a) {
    if (a.getAttribute("href") === pagina) a.classList.add("activo");
  });

  // El navbar se compacta al bajar
  var navbar = document.querySelector(".navbar");
  var pendiente = false;

  function actualizar() {
    if (navbar) navbar.classList.toggle("scrolled", window.scrollY > 40);
    pendiente = false;
  }

  actualizar();
  window.addEventListener("scroll", function () {
    if (!pendiente) {
      pendiente = true;
      requestAnimationFrame(actualizar);
    }
  }, { passive: true });
})();