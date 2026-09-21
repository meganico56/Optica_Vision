// theme-toggle.js
document.addEventListener('DOMContentLoaded', () => {
    // Buscar o crear el botón de modo oscuro si no existe
    let themeToggleBtn = document.getElementById('theme-toggle-btn');
    
    // Configurar estado inicial
    const currentTheme = localStorage.getItem('theme') || 'light';
    if (currentTheme === 'dark') {
        document.documentElement.classList.add('dark-mode');
        document.body.classList.add('dark-mode');
        if (themeToggleBtn) {
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
        }
    } else {
        if (themeToggleBtn) {
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        }
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const isDark = document.documentElement.classList.toggle('dark-mode');
            document.body.classList.toggle('dark-mode'); // Para compatibilidad con estilos antiguos
            
            if (isDark) {
                localStorage.setItem('theme', 'dark');
                themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
            } else {
                localStorage.setItem('theme', 'light');
                themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
            }
            
            // Actualizar el logo globalmente
            const logos = document.querySelectorAll('img[src*="logo-boutique.png"], img[src*="Logo_modo_oscuro.png"]');
            logos.forEach(logo => {
                if (isDark) {
                    logo.src = logo.src.replace('logo-boutique.png', 'Logo_modo_oscuro.png');
                } else {
                    logo.src = logo.src.replace('Logo_modo_oscuro.png', 'logo-boutique.png');
                }
            });
        });
    }
});
