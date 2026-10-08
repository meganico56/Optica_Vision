// session-manager.js
// Script para mantener y gestionar el estado de sesión en todas las páginas

document.addEventListener('DOMContentLoaded', () => {
    const usuarioLogueadoStr = sessionStorage.getItem('usuarioLogueado');
    const pathActual = window.location.pathname;

    if (usuarioLogueadoStr) {
        const userData = JSON.parse(usuarioLogueadoStr);
        
        // 1. Reemplazar "REGISTRO / LOGIN" por "CERRAR SESIÓN" en la barra de navegación
        const loginLinks = document.querySelectorAll('a[href="inicio-sesion.html"]');
        
        loginLinks.forEach(link => {
            // Si no estamos en la página de login
            if (!pathActual.includes('inicio-sesion.html') && !pathActual.includes('registro-usuario.html')) {
                link.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> CERRAR SESIÓN';
                link.href = '#';
                
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    sessionStorage.removeItem('usuarioLogueado');
                    window.location.reload();
                });
                
                // Si es admin/empleado, agregar un enlace al Panel justo antes
                if (userData.rol === 'admin' || userData.rol === 'empleado') {
                    const li = document.createElement('li');
                    li.innerHTML = '<a href="panel-admin.html" style="color: var(--gold);"><i class="fa-solid fa-chart-pie"></i> PANEL ADMIN</a>';
                    link.parentElement.insertAdjacentElement('beforebegin', li);
                }
                
                // Si es cliente, agregar enlace al Panel de Usuario
                if (userData.rol === 'cliente') {
                    const li = document.createElement('li');
                    li.innerHTML = '<a href="panel-usuario.html" style="color: var(--gold);"><i class="fa-solid fa-user"></i> MI PANEL</a>';
                    link.parentElement.insertAdjacentElement('beforebegin', li);
                }
            }
        });

        // 2. Interceptar botones de logout del panel de administrador
        const adminLogoutBtns = document.querySelectorAll('.logout-btn');
        adminLogoutBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                sessionStorage.removeItem('usuarioLogueado');
                window.location.href = 'inicio.html';
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
