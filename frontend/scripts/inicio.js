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