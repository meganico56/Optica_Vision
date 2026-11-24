// autenticacion.js - Inicio de sesión contra la API (POST /api/login).
// Requiere api.js y sesion.js cargados antes.

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('formLogin');
    const inputCorreo = document.getElementById('correo');
    const inputPass = document.getElementById('contrasena');
    const btnLogin = document.getElementById('btnLogin');
    const mensaje = document.getElementById('mensajeError');
    const togglePassword = document.getElementById('togglePassword');

    // Mostrar / ocultar contraseña
    if (togglePassword && inputPass) {
        togglePassword.addEventListener('mousedown', function (event) {
            event.preventDefault();
        });
        togglePassword.addEventListener('click', function () {
            const tipo = inputPass.getAttribute('type') === 'password' ? 'text' : 'password';
            inputPass.setAttribute('type', tipo);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }

    if (!form) return;

    if (sessionStorage.getItem('bv_registro_ok') === '1') {
        sessionStorage.removeItem('bv_registro_ok');

        const notificacion = document.createElement('div');
        notificacion.className = 'registro-toast';
        notificacion.setAttribute('role', 'status');
        notificacion.setAttribute('aria-live', 'polite');
        notificacion.textContent = 'Cuenta creada con éxito. Ya puedes iniciar sesión.';
        document.body.appendChild(notificacion);

        requestAnimationFrame(() => notificacion.classList.add('visible'));
        setTimeout(() => {
            notificacion.classList.remove('visible');
            setTimeout(() => notificacion.remove(), 250);
        }, 4000);
    }

    function mostrarError(texto) {
        mensaje.style.color = '';
        mensaje.textContent = texto;
        mensaje.hidden = false;
    }

    // Enter dentro de los campos ya envía el formulario (el botón es type="submit").
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        mensaje.hidden = true;

        const correo = inputCorreo.value.trim();
        const contrasena = inputPass.value; // la contraseña no se recorta

        if (!correo || !contrasena) {
            mostrarError('Por favor ingresa tu correo y contraseña.');
            return;
        }

        btnLogin.disabled = true;
        btnLogin.textContent = 'Ingresando...';

        try {
            const respuesta = await Api.post('/api/login', { correo, contrasena });
            Sesion.iniciar(respuesta.token, respuesta.usuario);
            const destino = Sesion.destinoTrasLogin();
            location.replace(destino);
        } catch (error) {
            mostrarError(error.message);
            btnLogin.disabled = false;
            btnLogin.textContent = 'Iniciar sesión';
        }
    });
});