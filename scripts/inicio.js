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