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
        togglePassword.addEventListener('click', function () {
            const tipo = inputPass.getAttribute('type') === 'password' ? 'text' : 'password';
            inputPass.setAttribute('type', tipo);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }

    if (!form) return;

    function mostrarError(texto) {
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
            // Administrador y Vendedor -> panel-admin.html, Cliente -> panel-usuario.html
            // (o la página donde estaba si el login se pidió desde otra, como el pedido).
            location.href = Sesion.destinoTrasLogin();
        } catch (error) {
            mostrarError(error.message);
            btnLogin.disabled = false;
            btnLogin.textContent = 'Iniciar sesión';
        }
    });
});