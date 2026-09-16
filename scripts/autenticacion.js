// auth-local.js
// Simulación local de autenticación con roles

document.addEventListener('DOMContentLoaded', () => {
    const btnLogin = document.getElementById('btnLogin');
    const inputEmail = document.getElementById('username');
    const inputPass = document.getElementById('password');

    // Base de datos simulada
    const usuarios = [
        { email: 'admin@admin.com', pass: 'admin', rol: 'admin', url: 'panel-admin.html' },
        { email: 'empleado@empleado.com', pass: 'empleado', rol: 'empleado', url: 'inicio.html' },
        { email: 'cliente@cliente.com', pass: 'cliente', rol: 'cliente', url: 'inicio.html' }
    ];

    if(btnLogin) {
        const triggerEnter = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                btnLogin.click();
            }
        };

        if (inputEmail) inputEmail.addEventListener('keydown', triggerEnter);
        if (inputPass) inputPass.addEventListener('keydown', triggerEnter);

        btnLogin.addEventListener('click', (e) => {
            e.preventDefault(); // Por si estuviera dentro de un formulario

            const email = inputEmail.value.trim();
            const pass = inputPass.value.trim();

            if (!email || !pass) {
                alert('Por favor ingrese su correo y contraseña.');
                return;
            }

            // Buscar usuario
            const usuarioValido = usuarios.find(u => u.email === email && u.pass === pass);

            if (usuarioValido) {
                // Guardar en sessionStorage para simular que está logueado
                sessionStorage.setItem('usuarioLogueado', JSON.stringify({
                    email: usuarioValido.email,
                    rol: usuarioValido.rol
                }));

                // Redirigir según el rol
                window.location.href = usuarioValido.url;
            } else {
                alert('Credenciales incorrectas. Inténtalo de nuevo.');
            }
        });
    }
});
