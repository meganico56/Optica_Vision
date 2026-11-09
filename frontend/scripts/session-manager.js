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

    if (usuarioLogueadoStr) {
        let userData = {};
        try { userData = JSON.parse(usuarioLogueadoStr); } catch (e) {}

        // 1. Reemplazar "REGISTRO / LOGIN" por "CERRAR SESIÓN" en la barra de navegación
        const loginLinks = document.querySelectorAll('a[href="inicio-sesion.html"]');
        
        loginLinks.forEach(link => {
            if (!pathActual.includes('inicio-sesion.html') && !pathActual.includes('registro-usuario.html')) {
                link.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> CERRAR SESIÓN';
                link.href = '#';
                
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    cerrarSesionGlobal();
                });
                
                // Si es admin/empleado, agregar un enlace al Panel justo antes
                if (userData.rol === 'admin' || userData.rol === 'empleado' || userData.rol === 'Administrador' || userData.rol === 'Vendedor') {
                    const li = document.createElement('li');
                    li.innerHTML = '<a href="panel-admin.html" style="color: var(--gold);"><i class="fa-solid fa-chart-pie"></i> PANEL ADMIN</a>';
                    link.parentElement.insertAdjacentElement('beforebegin', li);
                }
                
                // Si es cliente, agregar enlace al Panel de Usuario
                if (userData.rol === 'cliente' || userData.rol === 'Cliente') {
                    const li = document.createElement('li');
                    li.innerHTML = '<a href="panel-usuario.html" style="color: var(--gold);"><i class="fa-solid fa-user"></i> MI PANEL</a>';
                    link.parentElement.insertAdjacentElement('beforebegin', li);
                }
            }
        });

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

// --- Manejo Global del Tema y Logotipos (Solo para páginas con soporte de modo oscuro/admin) ---
(function() {
    // Si la página es pública como inicio, catalogo, etc. que tienen fondo claro fijo, no forzar modo oscuro
    const esPaginaAdmin = window.location.pathname.includes('panel-admin.html');
    
    // Por defecto las páginas públicas usan modo claro
    const savedTheme = localStorage.getItem('theme');
    const isLightMode = esPaginaAdmin ? (savedTheme === 'light') : (savedTheme !== 'dark');

    if (isLightMode) {
        document.documentElement.classList.add('light-mode');
    }

    // Alternar los logotipos al cargar el DOM
    document.addEventListener('DOMContentLoaded', () => {
        const logoSrc = isLightMode ? '../imagenes/logos/Logo_modo_claro.png' : '../imagenes/logos/Logo_modo_oscuro.png';
        
        const logos = document.querySelectorAll('img');
        logos.forEach(img => {
            const src = img.getAttribute('src') || '';
            if (src.includes('Logo_modo_claro.png') || src.includes('Logo_modo_oscuro.png')) {
                img.setAttribute('src', logoSrc);
            }
        });
    });
})();
