// registro.js — Maneja el formulario de creación de cuenta.
// Requiere api.js cargado antes.

document.addEventListener('DOMContentLoaded', () => {
    const form      = document.getElementById('formRegistro');
    const mensaje   = document.getElementById('mensajeError');

    if (!form) return;

    function mostrarError(texto) {
        mensaje.textContent = texto;
        mensaje.hidden = false;
        mensaje.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function ocultarError() {
        mensaje.hidden = true;
        mensaje.textContent = '';
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        ocultarError();

        const nombre             = document.getElementById('nombre').value.trim();
        const apellido           = document.getElementById('apellido').value.trim();
        const tipoDocumento      = document.getElementById('tipoDocumento').value;
        const numDocumento       = document.getElementById('numDocumento').value.trim();
        const fechaNacimiento    = document.getElementById('fechaNacimiento').value;
        const telefono           = document.getElementById('telefono').value.trim();
        const correo             = document.getElementById('correo').value.trim();
        const direccion          = document.getElementById('direccion').value.trim();
        const contrasena         = document.getElementById('contrasena').value;
        const confirmar          = document.getElementById('confirmarContrasena').value;
        const aceptaDatos        = document.getElementById('aceptaDatos').checked;

        // Validaciones del lado del cliente
        if (!nombre || !apellido) {
            return mostrarError('Por favor ingresa tu nombre y apellido.');
        }
        if (!tipoDocumento) {
            return mostrarError('Selecciona un tipo de documento.');
        }
        if (!numDocumento) {
            return mostrarError('Ingresa tu número de documento.');
        }
        if (!fechaNacimiento) {
            return mostrarError('Ingresa tu fecha de nacimiento.');
        }
        if (!telefono) {
            return mostrarError('Ingresa tu número de teléfono.');
        }
        if (!correo) {
            return mostrarError('Ingresa tu correo electrónico.');
        }
        if (contrasena.length < 8) {
            return mostrarError('La contraseña debe tener al menos 8 caracteres.');
        }
        if (contrasena !== confirmar) {
            return mostrarError('Las contraseñas no coinciden.');
        }
        if (!aceptaDatos) {
            return mostrarError('Debes aceptar el tratamiento de tus datos personales.');
        }

        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Creando cuenta...';

        try {
            await Api.post('/api/registro', {
                nombre,
                apellido,
                tipo_documento: tipoDocumento,
                num_documento: numDocumento,
                telefono,
                correo,
                direccion: direccion || null,
                fecha_nacimiento: fechaNacimiento,
                contrasena
            });

            // Registro exitoso → redirigir al login con mensaje de éxito
            sessionStorage.setItem('bv_registro_ok', '1');
            window.location.href = 'inicio-sesion.html';

        } catch (error) {
            mostrarError(error.message || 'Ocurrió un error al crear la cuenta. Intenta de nuevo.');
            btn.disabled = false;
            btn.textContent = 'Crear cuenta';
        }
    });
});
