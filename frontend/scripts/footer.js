// footer.js — Footer y ventanas de ayuda UNIVERSALES.
// Uso en cada página: <div id="footer"></div> donde va el footer
// y, al final del body: <script defer src="../scripts/footer.js"></script>
// (cárgalo ANTES de los demás scripts). Para cambiar el footer se edita solo este archivo.

(function () {
  var HTML = `
<footer>

    <div class="footer-container">

        <!-- LOGO -->
        <div class="footer-col">
          <div class="logo">
            <img
              src="../imagenes/logos/Logo_modo_claro.png"
              class="logo-icon"
            />
          </div>
        </div>

        <!-- AYUDA -->
        <div class="footer-col">
            <h4>AYUDA</h4>

            <ul class="ayuda-lista">
                <li>
                    <button class="ayuda-link" data-modal="modal-cita">
                        ¿Cómo puedo apartar una cita?
                    </button>
                </li>

                <li>
                    <button class="ayuda-link" data-modal="modal-formula">
                        ¿Cómo sé la fórmula que necesito?
                    </button>
                </li>

                <li>
                    <button class="ayuda-link" data-modal="modal-recoger">
                        ¿Dónde puedo recoger mis lentes?
                    </button>
                </li>

                <li>
                    <button class="ayuda-link" data-modal="modal-manual">
                        Manual del usuario
                    </button>
                </li>

                <li>
                    <button class="ayuda-link" data-modal="modal-pqrs">
                        PQRS
                    </button>
                </li>
                <li>
                    <a href="terminos.html" class="ayuda-link">
                        Términos y condiciones
                    </a>
                </li>
            </ul>
        </div>

        <!-- CONTACTO -->
        <div class="footer-col">
            <h4>CONTACTO</h4>

            <div class="contact-info">
                <i class="fa-solid fa-location-dot"></i>
                <span>CALLE 17 # 14-49 DUITAMA</span>
            </div>

            <div class="contact-info">
                <i class="fa-solid fa-phone"></i>
                <span>318 5211416</span>
            </div>

            <div class="social-icons">
                <a href="#"><i class="fa-brands fa-facebook-f"></i></a>
                <a href="#"><i class="fa-brands fa-twitter"></i></a>
                <a href="#"><i class="fa-brands fa-instagram"></i></a>
            </div>
        </div>

        <!-- MÉTODOS DE PAGO -->
        <div class="footer-col">
            <h4>MÉTODOS DE PAGO</h4>

            <div class="payment-methods">
                <span class="pago-visa">VISA</span>
                <span class="pago-mc">MC</span>
                <span class="pago-amex">AMEX</span>
                <span class="pago-pse">PSE</span>
                <span class="pago-nequi">NEQUI</span>
                <span title="Efectivo en la óptica"><i class="fa-solid fa-money-bill"></i></span>
            </div>
        </div>

    </div>

    <!-- COPYRIGHT -->
    <div class="copyright">
        Copyright© Desarrolladores ADSO 2026.
    </div>

</footer>

    <!-- MODALES DE AYUDA -->

    <div class="ayuda-modal" id="modal-cita">
        <div class="ayuda-modal-contenido">
            <button class="ayuda-cerrar" aria-label="Cerrar">&times;</button>
            <i class="fa-solid fa-calendar-check ayuda-icono"></i>
            <h2>¿Cómo puedo apartar una cita?</h2>
            <p>
                Para apartar una cita en Óptica Visión, ingresa a la
                sección Agendar cita de nuestra página web. Allí podrás
                seleccionar la fecha y hora disponibles y completar los
                datos solicitados para realizar tu reserva.
            </p>
        </div>
    </div>

    <div class="ayuda-modal" id="modal-formula">
        <div class="ayuda-modal-contenido">
            <button class="ayuda-cerrar" aria-label="Cerrar">&times;</button>
            <i class="fa-solid fa-eye ayuda-icono"></i>
            <h2>¿Cómo sé la fórmula que necesito?</h2>
            <p>
                Para conocer la fórmula que necesitas para tus lentes,
                debes realizar un examen visual con un profesional de
                la salud visual. Durante el examen se evaluará tu visión
                y se determinará la prescripción adecuada.
            </p>
        </div>
    </div>

    <div class="ayuda-modal" id="modal-recoger">
        <div class="ayuda-modal-contenido">
            <button class="ayuda-cerrar" aria-label="Cerrar">&times;</button>
            <i class="fa-solid fa-glasses ayuda-icono"></i>
            <h2>¿Dónde puedo recoger mis lentes?</h2>
            <p>
                Puedes recoger tus lentes directamente en nuestra óptica,
                ubicada en la Calle 17 # 14-49 de Duitama. Para consultar
                el estado de tu pedido puedes comunicarte con nuestro
                equipo de atención.
            </p>
        </div>
    </div>

    <div class="ayuda-modal" id="modal-manual">
        <div class="ayuda-modal-contenido">
            <button class="ayuda-cerrar" aria-label="Cerrar">&times;</button>
            <i class="fa-solid fa-book-open ayuda-icono"></i>
            <h2>Manual del usuario</h2>
            <p>
                Explora nuestro catálogo de productos, consulta los
                servicios disponibles, agenda tus citas y realiza
                compras en línea. Utiliza el menú de navegación para
                acceder a las diferentes secciones de nuestra página.
            </p>
        </div>
    </div>

    <div class="ayuda-modal" id="modal-pqrs">
        <div class="ayuda-modal-contenido">
            <button class="ayuda-cerrar" aria-label="Cerrar">&times;</button>
            <i class="fa-solid fa-comments ayuda-icono"></i>
            <h2>Peticiones, quejas, reclamos y sugerencias</h2>
            <p>
                En Óptica Visión valoramos tu opinión. Si tienes alguna
                petición, queja, reclamo o sugerencia sobre nuestros
                productos o servicios, puedes comunicarte con nuestro
                equipo de atención al cliente.
            </p>
        </div>
    </div>
`;

  var lugar = document.getElementById("footer");
  if (lugar) lugar.outerHTML = HTML;

  // Ventanas de ayuda (delegación: funciona aunque el footer se haya inyectado)
  document.addEventListener("click", function (e) {
    var boton = e.target.closest(".ayuda-link[data-modal]");
    if (boton) {
      var modal = document.getElementById(boton.dataset.modal);
      if (modal) modal.style.display = "flex";
      return;
    }
    if (e.target.closest(".ayuda-cerrar") || e.target.classList.contains("ayuda-modal")) {
      document.querySelectorAll(".ayuda-modal").forEach(function (m) { m.style.display = "none"; });
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      document.querySelectorAll(".ayuda-modal").forEach(function (m) { m.style.display = "none"; });
    }
  });
})();