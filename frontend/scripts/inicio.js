// ScriptInicio.js
// Comportamiento básico de la página de Inicio: animación de entrada
// y navbar que cambia de aspecto al hacer scroll.

document.addEventListener("DOMContentLoaded", () => {

    // 1. Animación de entrada del hero (texto y visor de gafas)
    const elementosAnimados = document.querySelectorAll(".fade-in-up");

    elementosAnimados.forEach((el, index) => {
        // pequeño retraso escalonado para que no aparezcan todos a la vez
        setTimeout(() => {
            el.classList.add("visible");
        }, 150 * index);
    });

    // 2. Navbar que se compacta al hacer scroll
    const navbar = document.querySelector(".navbar");

    function actualizarNavbar() {
        if (window.scrollY > 40) {
            navbar.classList.add("scrolled");
        } else {
            navbar.classList.remove("scrolled");
        }
    }

    // estado inicial (por si la página carga ya con scroll, ej. al recargar)
    actualizarNavbar();

    window.addEventListener("scroll", actualizarNavbar);

    // 3. Carrusel de Servicios: rotación automática y botones anterior / siguiente
    const slides = [
        document.getElementById("slide1"),
        document.getElementById("slide2"),
        document.getElementById("slide3")
    ].filter(Boolean);

    const btnPrev = document.getElementById("servicioPrev");
    const btnNext = document.getElementById("servicioNext");
    const contenedorServicios = document.querySelector(".servicios-contenedor");

    let indiceActual = 0;
    let temporizador = null;
    const INTERVALO = 5000; // cambia cada 5 segundos

    function obtenerIndiceActivo() {
        const idx = slides.findIndex(radio => radio.checked);
        return idx !== -1 ? idx : 0;
    }

    function mostrarSlide(idx) {
        indiceActual = (idx + slides.length) % slides.length;
        if (slides[indiceActual]) {
            slides[indiceActual].checked = true;
        }
    }

    function siguienteSlide() {
        indiceActual = obtenerIndiceActivo();
        mostrarSlide(indiceActual + 1);
    }

    function anteriorSlide() {
        indiceActual = obtenerIndiceActivo();
        mostrarSlide(indiceActual - 1);
    }

    function iniciarRotacion() {
        detenerRotacion();
        temporizador = setInterval(siguienteSlide, INTERVALO);
    }

    function detenerRotacion() {
        if (temporizador) {
            clearInterval(temporizador);
            temporizador = null;
        }
    }

    if (slides.length > 0) {
        iniciarRotacion();

        if (btnNext) {
            btnNext.addEventListener("click", () => {
                siguienteSlide();
                iniciarRotacion();
            });
        }

        if (btnPrev) {
            btnPrev.addEventListener("click", () => {
                anteriorSlide();
                iniciarRotacion();
            });
        }

        // Pausar si el usuario pasa el mouse por encima
        if (contenedorServicios) {
            contenedorServicios.addEventListener("mouseenter", detenerRotacion);
            contenedorServicios.addEventListener("mouseleave", iniciarRotacion);
        }

        // Si el usuario hace clic directamente en los puntos inferiores
        document.querySelectorAll(".carrusel-puntos label").forEach((label, i) => {
            label.addEventListener("click", () => {
                indiceActual = i;
                iniciarRotacion();
            });
        });
    }

});

const abrir = document.getElementById("abrirModal");
const cerrar = document.getElementById("cerrarModal");
const modal = document.getElementById("miModal");

// =====================================
// MODALES DE AYUDA DEL FOOTER
// =====================================

document.addEventListener("DOMContentLoaded", () => {

    const botonesAyuda = document.querySelectorAll(".ayuda-link");
    const modalesAyuda = document.querySelectorAll(".ayuda-modal");

    // Abrir modal correspondiente
    botonesAyuda.forEach(boton => {

        boton.addEventListener("click", () => {

            const idModal = boton.dataset.modal;
            const modal = document.getElementById(idModal);

            if (modal) {
                modal.style.display = "flex";
            }

        });

    });

    // Cerrar con la X
    document.querySelectorAll(".ayuda-cerrar").forEach(boton => {

        boton.addEventListener("click", () => {

            const modal = boton.closest(".ayuda-modal");

            modal.style.display = "none";

        });

    });

    // Cerrar al hacer clic fuera del contenido
    modalesAyuda.forEach(modal => {

        modal.addEventListener("click", (event) => {

            if (event.target === modal) {
                modal.style.display = "none";
            }

        });

    });

    // Cerrar presionando ESC
    document.addEventListener("keydown", (event) => {

        if (event.key === "Escape") {

            modalesAyuda.forEach(modal => {
                modal.style.display = "none";
            });

        }

    });

});