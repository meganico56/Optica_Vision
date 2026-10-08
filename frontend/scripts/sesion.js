
(function () {
    'use strict';

    const K_TOKEN = 'bv_token';
    const K_USUARIO = 'bv_usuario';
    const K_VOLVER = 'bv_volver';

    const STAFF = ['Administrador', 'Vendedor'];
    const archivo = location.pathname.split('/').pop() || 'inicio.html';

    // Páginas que exigen sesión y los roles que pueden verlas.
    const PROTEGIDAS = {
        'panel-admin.html': STAFF,
        'panel-usuario.html': ['Cliente']
    };

    function leerUsuario() {
        try { return JSON.parse(localStorage.getItem(K_USUARIO)); } catch (e) { return null; }
    }

    function panelDe(rol) {
        if (STAFF.indexOf(rol) !== -1) return 'panel-admin.html';
        if (rol === 'Cliente') return 'panel-usuario.html';
        return 'inicio.html';
    }

    const Sesion = {
        token: () => localStorage.getItem(K_TOKEN),
        usuario: leerUsuario,
        rol: () => { const u = leerUsuario(); return u ? u.rol : null; },
        estaLogueado: () => !!localStorage.getItem(K_TOKEN) && !!leerUsuario(),
        esStaff: () => STAFF.indexOf(Sesion.rol()) !== -1,
        panelDe,

        iniciar(token, usuario) {
            localStorage.setItem(K_TOKEN, token);
            localStorage.setItem(K_USUARIO, JSON.stringify(usuario));
            // Asegurar que al iniciar sesión el panel siempre abra desde la pestaña principal (Dashboard / Inicio)
            localStorage.removeItem('bv_seccion:panel-admin.html');
            localStorage.removeItem('bv_seccion:panel-usuario.html');
        },

        limpiar() {
            localStorage.removeItem(K_TOKEN);
            localStorage.removeItem(K_USUARIO);
            localStorage.removeItem('usuarioLogueado');
            sessionStorage.removeItem(K_TOKEN);
            sessionStorage.removeItem(K_USUARIO);
            sessionStorage.removeItem('usuarioLogueado');
        },

        cerrar() {
            Sesion.limpiar();
            location.href = 'inicio.html';
        },

        // Manda al login y recuerda a dónde volver (carrito, agendar cita, etc.).
        irALogin() {
            if (archivo !== 'inicio-sesion.html') {
                sessionStorage.setItem(K_VOLVER, archivo + location.search);
            }
            location.replace('inicio-sesion.html');
        },

        // Lo usa autenticacion.js después de un login correcto.
        destinoTrasLogin() {
            const volver = sessionStorage.getItem(K_VOLVER);
            sessionStorage.removeItem(K_VOLVER);
            return volver || panelDe(Sesion.rol());
        }
    };

    window.Sesion = Sesion;

    // ---------- Protección de páginas (corre de inmediato, antes de pintar) ----------
    const permitidos = PROTEGIDAS[archivo];
    if (permitidos) {
        if (!Sesion.estaLogueado()) {
            document.documentElement.style.visibility = 'hidden';
            Sesion.irALogin();
            return;
        }
        if (permitidos.indexOf(Sesion.rol()) === -1) {
            document.documentElement.style.visibility = 'hidden';
            location.replace(panelDe(Sesion.rol()));
            return;
        }
    }

    // Token vencido: api.js avisa con este evento.
    window.addEventListener('bv:sesion-expirada', () => {
        Sesion.limpiar();
        Sesion.irALogin();
    });

    // ---------- Interfaz ----------
    function iniciales(nombre) {
        const partes = String(nombre || '').trim().split(/\s+/).filter(Boolean);
        if (partes.length === 0) return '?';
        if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
        return (partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
    }

    function ponerTexto(id, texto) {
        const el = document.getElementById(id);
        if (el) el.textContent = texto;
    }

    // Quita lo que el rol actual no debe ver (data-roles="Administrador,Vendedor").
    function aplicarRoles(rol) {
        document.querySelectorAll('[data-roles]').forEach((el) => {
            const permitidosEl = el.dataset.roles.split(',').map((r) => r.trim());
            if (permitidosEl.indexOf(rol) === -1) el.remove();
        });
    }

    function pintarIdentidad(usuario) {
        const nombre = usuario.nombre || '';
        ponerTexto('adminName', nombre);
        ponerTexto('adminRol', usuario.rol || '');
        ponerTexto('adminAvatar', iniciales(nombre));
        ponerTexto('userName', nombre.split(' ')[0]);
        ponerTexto('userAvatar', iniciales(nombre));
        ponerTexto('profileAvatarLarge', iniciales(nombre));
    }

    // "REGISTRO / LOGIN" pasa a "CERRAR SESIÓN" (+ enlace al panel) solo en la barra superior.
    function pintarNavbar(usuario) {
        document.querySelectorAll('header.navbar a[href="inicio-sesion.html"]').forEach((enlace) => {
            const esStaff = STAFF.indexOf(usuario.rol) !== -1;
            const li = document.createElement('li');
            li.innerHTML = esStaff
                ? '<a href="panel-admin.html" style="color: var(--gold);"><i class="fa-solid fa-chart-pie"></i> PANEL</a>'
                : '<a href="panel-usuario.html" style="color: var(--gold);"><i class="fa-solid fa-user"></i> MI PANEL</a>';
            enlace.parentElement.insertAdjacentElement('beforebegin', li);

            enlace.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> CERRAR SESIÓN';
            enlace.setAttribute('href', '#');
            enlace.addEventListener('click', (e) => {
                e.preventDefault();
                Sesion.cerrar();
            });
        });
    }

    function alListo(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            fn();
        }
    }

    alListo(() => {
        // Los botones de cerrar sesión de los paneles (.logout-btn) se tratan aparte.
        document.querySelectorAll('.logout-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                Sesion.cerrar();
            });
        });

        if (!Sesion.estaLogueado()) return;
        const usuario = Sesion.usuario();

        aplicarRoles(usuario.rol);
        pintarIdentidad(usuario);
        pintarNavbar(usuario);
    });
})();