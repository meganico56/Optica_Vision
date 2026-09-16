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
