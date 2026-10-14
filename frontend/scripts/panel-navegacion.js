
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

    // Manejo de tema Claro / Oscuro
    const CLAVE_TEMA = 'bv_admin_theme';
    const LOGO_OSCURO = '../imagenes/logos/Logo_modo_oscuro.png';
    const LOGO_CLARO = '../imagenes/logos/logo-boutique.png';

    function aplicarTema(tema) {
        const raiz = document.documentElement;
        const icon = document.getElementById('themeToggleIcon');
        const texto = document.getElementById('themeToggleText');
        const logo = document.getElementById('mainLogo');

        if (tema === 'light') {
            raiz.classList.add('light-mode');
            raiz.classList.remove('dark-mode');
            if (icon) icon.className = 'fa-solid fa-moon';
            if (texto) texto.textContent = 'Modo oscuro';
            if (logo) logo.src = LOGO_CLARO;
        } else {
            raiz.classList.remove('light-mode');
            raiz.classList.add('dark-mode');
            if (icon) icon.className = 'fa-solid fa-sun';
            if (texto) texto.textContent = 'Modo claro';
            if (logo) logo.src = LOGO_OSCURO;
        }

        try { 
            localStorage.setItem(CLAVE_TEMA, tema);
            localStorage.setItem('theme', tema);
        } catch (e) { /* ignorar */ }
    }

    function toggleTema() {
        const esClaro = document.documentElement.classList.contains('light-mode');
        const nuevoTema = esClaro ? 'dark' : 'light';
        aplicarTema(nuevoTema);
    }

    function obtenerTemaInicial() {
        let temaGuardado = null;
        try { temaGuardado = localStorage.getItem(CLAVE_TEMA) || localStorage.getItem('theme'); } catch (e) { /* ignorar */ }

        if (!temaGuardado) {
            const prefiereClaro = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
            temaGuardado = prefiereClaro ? 'light' : 'dark';
        }
        return temaGuardado;
    }

    // Aplicar clase a :root de inmediato para evitar parpadeos visuales al cargar
    (function precargarTema() {
        const tema = obtenerTemaInicial();
        if (tema === 'light') {
            document.documentElement.classList.add('light-mode');
            document.documentElement.classList.remove('dark-mode');
        } else {
            document.documentElement.classList.remove('light-mode');
            document.documentElement.classList.add('dark-mode');
        }
    })();

    function iniciarTema() {
        const tema = obtenerTemaInicial();
        aplicarTema(tema);

        const btnToggle = document.getElementById('themeToggleBtn');
        if (btnToggle) {
            btnToggle.addEventListener('click', toggleTema);
        }
    }

    // Un solo listener para el menú lateral y para los botones "Ver todas" (data-goto).
    document.addEventListener('click', (e) => {
        const el = e.target.closest('.nav-item[data-section], [data-goto]');
        if (el) {
            e.preventDefault();
            cambiar(el.dataset.section || el.dataset.goto);
            // Si está en pantalla pequeña, cerrar sidebar al navegar
            const sidebar = document.getElementById('sidebar');
            if (sidebar && sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
            }
            return;
        }

        // Abrir menú móvil
        if (e.target.closest('#menuToggle')) {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.add('open');
            return;
        }

        // Cerrar menú móvil
        if (e.target.closest('#sidebarClose')) {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.remove('open');
            return;
        }
    });

    function iniciar() {
        iniciarTema();

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