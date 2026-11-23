// header.js — Header universal wey de las páginas públicas.
// Uso en cada página: <div id="header"></div> donde va el header
// y, al final del body: <script defer src="../scripts/header.js"></script>
// como el otro tambien se debe cargar antes de server-manajer.js y los demas scripts
// asi ya no toca la repetidera de la repetidera todo se modifica desde aca y cambia para todos.

(function () {
  var HTML = `
<header class="navbar">
      <div class="logo">
        <a href="inicio.html">
          <img
            src="../imagenes/logos/Logo_modo_claro.webp"
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
          <i class="fa-solid fa-magnifying-glass"></i>
        </button>
      </form>

      <input type="checkbox" id="menu-toggle" class="menu-toggle" />

      <label for="menu-toggle" class="hamburguesa" aria-label="Abrir menú">
        <span></span>
        <span></span>
        <span></span>
      </label>

      <nav>
        <ul class="navbar-menu">
          <li><a href="inicio.html">INICIO</a></li>
          <li><a href="catalogo.html">CATÁLOGO</a></li>
          <li><a href="agendar-cita.html">AGENDAR CITA</a></li>
          <li><a href="inicio-sesion.html">INICIAR SESIÓN</a></li>
          <li>
            <a href="carrito.html" aria-label="Carrito"><i class="fa-solid fa-cart-shopping"></i><span class="cart-count" id="cartBadge" hidden>0</span></a>
          </li>
          <li class="navbar-theme-item">
            <button class="btn-tema" id="btnTemaPublico" type="button" aria-label="Alternar modo claro y oscuro" title="Alternar modo claro / oscuro">
              <i class="fa-solid fa-moon"></i>
            </button>
          </li>
        </ul>
      </nav>
    </header>
`;

  var lugar = document.getElementById("header");
  if (lugar) lugar.outerHTML = HTML;

  // Marca como activa el enlace de la página actual donde se ubica
  var pagina = location.pathname.split("/").pop() || "inicio.html";
  document.querySelectorAll(".navbar-menu a[href]").forEach(function (a) {
    if (a.getAttribute("href") === pagina) a.classList.add("activo");
  });

  // Navbar se compacta al bajar wey uwu
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