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

// --- Manejo Global del Tema y Logotipos ---
(function() {
    // 1. Aplicar la clase correcta de inmediato para evitar parpadeos
    const isLightMode = localStorage.getItem('theme') === 'light';
    if (isLightMode) {
        document.documentElement.classList.add('light-mode');
    }

    // 2. Alternar los logotipos al cargar el DOM
    document.addEventListener('DOMContentLoaded', () => {
        const logoSrc = isLightMode ? '../imagenes/logos/logo-boutique.png' : '../imagenes/logos/Logo_modo_oscuro.png';
        
        // Encontrar todas las imágenes que contengan "logo-boutique" o "Logo_modo_oscuro"
        const logos = document.querySelectorAll('img');
        logos.forEach(img => {
            const src = img.getAttribute('src') || '';
            if (src.includes('logo-boutique.png') || src.includes('Logo_modo_oscuro.png')) {
                // Exceptuar si tienen ids específicos que ya son manejados por el panel admin de otra forma, 
                // aunque reemplazar su src aquí asegura que cargue bien al inicio.
                img.setAttribute('src', logoSrc);
            }
        });
    });
})();
