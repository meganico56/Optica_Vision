
(function () {
    'use strict';

    const archivo = location.pathname.split('/').pop() || 'panel';
    const CLAVE = 'bv_seccion:' + archivo;
    const oyentes = [];
    let actual = null;

    function cambiar(nombre) {
        const destino = document.getElementById('sec-' + nombre);
        if (!destino) return false;

        document.querySelectorAll('.nav-item').forEach((item) => {
            item.classList.toggle('active', item.dataset.section === nombre);
        });
        document.querySelectorAll('.section-content').forEach((sec) => {
            sec.classList.toggle('active', sec === destino);
        });

        actual = nombre;
        try { localStorage.setItem(CLAVE, nombre); } catch (e) { /* almacenamiento bloqueado */ }

        oyentes.forEach((fn) => {
            try { fn(nombre); } catch (e) { console.error('Error al cargar la sección ' + nombre, e); }
        });
        return true;
    }

    window.PanelNav = {
        ir: cambiar,
        actual: () => actual,
        alCambiar: (fn) => { oyentes.push(fn); }
    };

    // Un solo listener para el menú lateral y para los botones "Ver todas" (data-goto).
    document.addEventListener('click', (e) => {
        const el = e.target.closest('.nav-item[data-section], [data-goto]');
        if (!el) return;
        e.preventDefault();
        cambiar(el.dataset.section || el.dataset.goto);
    });

    function iniciar() {
        let guardada = null;
        try { guardada = localStorage.getItem(CLAVE); } catch (e) { /* ignorar */ }

        // Si la sección guardada ya no existe (otro rol, por ejemplo) se cae al dashboard.
        if (!cambiar(guardada || 'dashboard')) cambiar('dashboard');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }
})();