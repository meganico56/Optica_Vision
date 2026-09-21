const fs = require('fs');
const path = require('path');

const adminPath = path.join(__dirname, 'paginas', 'panel-admin.html');
const formPath = path.join(__dirname, 'paginas', 'formulario-pedido.html');

const buttonHtml = `
<button id="theme-toggle-btn" class="theme-toggle-btn" title="Alternar Modo Oscuro" style="margin-left: 15px; z-index: 9999;">
    <i class="fa-solid fa-moon"></i>
</button>`;

// FIX PANEL ADMIN
let adminContent = fs.readFileSync(adminPath, 'utf8');

// Remove inline script
adminContent = adminContent.replace(/<script>\s*\/\/ Cargar el tema guardado inmediatamente para evitar parpadeos\s*if \(localStorage\.getItem\('theme'\) === 'light'\) {\s*document\.documentElement\.classList\.add\('light-mode'\);\s*}\s*<\/script>/, '');

// Insert button in topbar
if (!adminContent.includes('theme-toggle-btn')) {
    adminContent = adminContent.replace(/(<div class="topbar-left">)/, `$1${buttonHtml}`);
}
fs.writeFileSync(adminPath, adminContent, 'utf8');
console.log("Fixed panel-admin.html");

// FIX FORMULARIO PEDIDO
let formContent = fs.readFileSync(formPath, 'utf8');
if (!formContent.includes('theme-toggle-btn')) {
    // Let's place it next to the summary logo
    formContent = formContent.replace(/(<div class="summary-top">[\s\S]*?)<\/div>/i, `$1${buttonHtml}</div>`);
}
fs.writeFileSync(formPath, formContent, 'utf8');
console.log("Fixed formulario-pedido.html");
