// admin-navigation.js - Maneja la navegación entre secciones del panel de administrador
// Mantiene la sección activa al recargar la página usando localStorage

document.addEventListener('DOMContentLoaded', () => {
    // Elementos de navegación
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.section-content');
    
    // Recuperar la sección guardada o usar 'dashboard' por defecto
    const savedSection = localStorage.getItem('adminActiveSection') || 'dashboard';
    
    // Función para cambiar de sección
    function switchSection(sectionName) {
        // Remover clase active de todos los nav-items
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.section === sectionName) {
                item.classList.add('active');
            }
        });
        
        // Ocultar todas las secciones
        sections.forEach(section => {
            section.classList.remove('active');
        });
        
        // Mostrar la sección seleccionada
        const targetSection = document.getElementById(`sec-${sectionName}`);
        if (targetSection) {
            targetSection.classList.add('active');
            // Guardar la sección activa
            localStorage.setItem('adminActiveSection', sectionName);
        }
    }
    
    // Configurar navegación inicial
    switchSection(savedSection);
    
    // Agregar event listeners a los nav-items
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionName = item.dataset.section;
            switchSection(sectionName);
        });
    });
    
    // Manejar botones que navegan a secciones específicas
    const gotoButtons = document.querySelectorAll('[data-goto]');
    gotoButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionName = button.dataset.goto;
            switchSection(sectionName);
        });
    });
});