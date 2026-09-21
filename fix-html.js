const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'paginas');
const files = fs.readdirSync(directoryPath).filter(f => f.endsWith('.html'));

files.forEach(file => {
    const filePath = path.join(directoryPath, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Primero, remover el boton inyectado anteriormente (si esta fuera del div logo)
    content = content.replace(/<\/div>\s*<button id="theme-toggle-btn" class="theme-toggle-btn" title="Alternar Modo Oscuro">\s*<i class="fa-solid fa-moon"><\/i>\s*<\/button>/i, '</div>');
    
    // Ahora, inyectar el boton DENTRO del div class="logo", justo antes del cierre del div
    // Buscamos <div class="logo">...</div>
    const buttonHtml = `
        <button id="theme-toggle-btn" class="theme-toggle-btn" title="Alternar Modo Oscuro" style="margin-left: 15px; z-index: 9999;">
            <i class="fa-solid fa-moon"></i>
        </button>
    </div>`;
    
    // Replace the closing div of logo
    content = content.replace(/(<div class="logo">[\s\S]*?)<\/div>/i, `$1${buttonHtml}`);
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed ${file}`);
});
