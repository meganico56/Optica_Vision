// session-manager.js
// Script para mantener y gestionar el estado de sesión en todas las páginas

document.addEventListener('DOMContentLoaded', () => {
    function cerrarSesionGlobal() {
        localStorage.removeItem('usuarioLogueado');
        localStorage.removeItem('bv_token');
        localStorage.removeItem('bv_usuario');
        localStorage.removeItem('bv_volver');
        sessionStorage.removeItem('usuarioLogueado');
        sessionStorage.removeItem('bv_token');
        sessionStorage.removeItem('bv_usuario');
        sessionStorage.removeItem('bv_volver');
        if (window.Sesion && typeof window.Sesion.limpiar === 'function') {
            window.Sesion.limpiar();
        }
        window.location.href = 'inicio.html';
    }

    const usuarioLogueadoStr = localStorage.getItem('usuarioLogueado') || localStorage.getItem('bv_usuario') || sessionStorage.getItem('bv_usuario');
    const pathActual = window.location.pathname;
    const avataresNavbar = [];

    function crearEnlacePanelCliente() {
        const li = document.createElement('li');
        const link = document.createElement('a');
        const fallback = document.createElement('i');
        const avatar = document.createElement('img');
        const texto = document.createElement('span');

        link.href = 'panel-cliente.html';
        link.className = 'navbar-profile-link';
        link.title = 'Mi perfil';
        link.setAttribute('aria-label', 'Abrir mi perfil');

        fallback.className = 'fa-solid fa-user navbar-profile-fallback';
        fallback.setAttribute('aria-hidden', 'true');
        avatar.className = 'navbar-profile-avatar';
        avatar.alt = '';
        avatar.hidden = true;
        avatar.addEventListener('error', () => {
            avatar.hidden = true;
            fallback.hidden = false;
        }, { once: true });
        texto.textContent = 'MI PANEL';

        link.appendChild(fallback);
        link.appendChild(avatar);
        link.appendChild(texto);
        li.appendChild(link);
        avataresNavbar.push({ avatar, fallback });
        return li;
    }

    function cargarFotoNavbar() {
        if (!avataresNavbar.length || !window.Api) return;

        const token = localStorage.getItem('bv_token') || sessionStorage.getItem('bv_token') || '';
        const coincidencia = /^session-(\d+)$/.exec(token);
        if (!coincidencia) return;

        window.Api.get('/api/perfil/' + coincidencia[1]).then((perfil) => {
            if (typeof perfil.foto_perfil !== 'string' || !/^data:image\/(?:jpeg|png|webp);base64,/i.test(perfil.foto_perfil)) return;
            avataresNavbar.forEach(({ avatar, fallback }) => {
                avatar.src = perfil.foto_perfil;
                avatar.hidden = false;
                fallback.hidden = true;
            });
        }).catch((error) => {
            console.warn('No se pudo cargar la imagen de perfil del navbar:', error.message);
        });
    }

    if (usuarioLogueadoStr) {
        let userData = {};
        try { userData = JSON.parse(usuarioLogueadoStr); } catch (e) {}

        const menu = document.querySelector('.navbar-menu');
        const esCliente = userData.rol === 'cliente' || userData.rol === 'Cliente';
        const enlacePanelCliente = menu && menu.querySelector('a[href="panel-cliente.html"]');
        if (esCliente && enlacePanelCliente) {
            if (enlacePanelCliente.classList.contains('navbar-profile-link')) {
                avataresNavbar.push({
                    avatar: enlacePanelCliente.querySelector('.navbar-profile-avatar'),
                    fallback: enlacePanelCliente.querySelector('.navbar-profile-fallback')
                });
            } else {
                const elementoPanel = enlacePanelCliente.closest('li');
                if (elementoPanel) elementoPanel.replaceWith(crearEnlacePanelCliente());
            }
        }

        // 1. Reemplazar "REGISTRO / LOGIN" por "CERRAR SESIÓN" en la barra de navegación
        const loginLinks = menu
            ? menu.querySelectorAll('a[href="inicio-sesion.html"]')
            : [];
        
        loginLinks.forEach(link => {
            if (!pathActual.includes('inicio-sesion.html') && !pathActual.includes('registro-usuario.html')) {
                link.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> CERRAR SESIÓN';
                link.href = '#';
                
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    cerrarSesionGlobal();
                });
                
                // Si es admin, agregar un enlace al Panel Admin justo antes
                if (userData.rol === 'admin' || userData.rol === 'Administrador') {
                    const li = document.createElement('li');
                    li.innerHTML = '<a href="panel-admin.html" style="color: var(--gold);"><i class="fa-solid fa-chart-pie"></i> PANEL ADMIN</a>';
                    link.parentElement.insertAdjacentElement('beforebegin', li);
                }
                
                // Si es empleado/vendedor, agregar enlace al Panel Empleado
                if (userData.rol === 'empleado' || userData.rol === 'Vendedor') {
                    const li = document.createElement('li');
                    li.innerHTML = '<a href="panel-empleado.html" style="color: var(--gold);"><i class="fa-solid fa-id-badge"></i> MI PANEL</a>';
                    link.parentElement.insertAdjacentElement('beforebegin', li);
                }
                
                // Si es cliente, agregar enlace al Panel de Usuario
                if (esCliente && !avataresNavbar.length) {
                    link.parentElement.insertAdjacentElement('beforebegin', crearEnlacePanelCliente());
                }
            }
        });
        cargarFotoNavbar();

        // 2. Interceptar botones de logout con la clase .logout-btn
        const adminLogoutBtns = document.querySelectorAll('.logout-btn');
        adminLogoutBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                cerrarSesionGlobal();
            });
        });

    } else {
        // 3. Proteger las rutas que requieren inicio de sesión (ej. panel de admin)
        if (pathActual.includes('panel-admin.html')) {
            alert('Debes iniciar sesión para acceder al panel.');
            window.location.href = 'inicio-sesion.html';
        }
    }
});

// --- Manejo Global del Tema y Logotipos ---
(function() {
    const esPaginaPanel = window.location.pathname.includes('panel-admin.html') ||
                          window.location.pathname.includes('panel-empleado.html') ||
                          window.location.pathname.includes('panel-cliente.html');
    const CLAVE_TEMA = 'pub_theme';
    const temaGuardado = localStorage.getItem(CLAVE_TEMA);
    const temaAnterior = localStorage.getItem('bv-theme');
    const savedTheme = temaGuardado || temaAnterior; // conservar la preferencia del visualizador anterior
    if (!temaGuardado && temaAnterior) {
        localStorage.setItem(CLAVE_TEMA, temaAnterior);
        localStorage.removeItem('bv-theme');
    }
    // Por defecto modo claro; solo oscuro si el usuario lo eligió explícitamente
    const isDark = savedTheme === 'dark';
    let temporizadorAnimacionTema;

    function aplicarTemaPublico(dark) {
        const root = document.documentElement;
        if (dark) {
            root.classList.add('dark-mode');
            root.classList.remove('light-mode');
        } else {
            root.classList.remove('dark-mode');
            root.classList.add('light-mode');
        }
        // Actualizar logo
        const logoSrc = dark
            ? '../imagenes/logos/Logo_modo_oscuro.png'
            : '../imagenes/logos/Logo_modo_claro.png';
        document.querySelectorAll('img').forEach(img => {
            const src = img.getAttribute('src') || '';
            if (src.includes('Logo_modo_claro.png') || src.includes('Logo_modo_oscuro.png')) {
                img.setAttribute('src', logoSrc);
            }
        });
        // Actualizar texto e icono del botón
        const btn = document.getElementById('btnTemaPublico');
        if (btn) {
            const icon = btn.querySelector('i');
            if (dark) {
                if (icon) icon.className = 'fa-solid fa-sun';
                btn.setAttribute('aria-label', 'Activar modo claro');
                btn.title = 'Activar modo claro';
            } else {
                if (icon) icon.className = 'fa-solid fa-moon';
                btn.setAttribute('aria-label', 'Activar modo oscuro');
                btn.title = 'Activar modo oscuro';
            }
        }
    }

    function animarCambioTema(btn) {
        const root = document.documentElement;
        root.classList.remove('theme-transition');
        if (btn) btn.classList.remove('is-animating');
        void root.offsetWidth;
        root.classList.add('theme-transition');
        if (btn) btn.classList.add('is-animating');

        window.clearTimeout(temporizadorAnimacionTema);
        temporizadorAnimacionTema = window.setTimeout(() => {
            root.classList.remove('theme-transition');
            if (btn) btn.classList.remove('is-animating');
        }, 900);
    }

    // Aplicar de inmediato (antes del DOMContentLoaded) para evitar parpadeos
    if (!esPaginaPanel) {
        if (isDark) document.documentElement.classList.add('dark-mode');
        else        document.documentElement.classList.add('light-mode');
    }

    document.addEventListener('DOMContentLoaded', () => {
        if (esPaginaPanel) return; // Los paneles tienen su propio toggle en panel-navegacion.js

        // Aplicar tema inicial completo (logos + botón)
        aplicarTemaPublico(isDark);

        // Conectar el botón
        const btn = document.getElementById('btnTemaPublico');
        if (btn) {
            btn.addEventListener('click', () => {
                const ahoraOscuro = document.documentElement.classList.contains('dark-mode');
                const nuevoOscuro = !ahoraOscuro;
                animarCambioTema(btn);
                localStorage.setItem(CLAVE_TEMA, nuevoOscuro ? 'dark' : 'light');
                aplicarTemaPublico(nuevoOscuro);
            });
        }
    });
})();
