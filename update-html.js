const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'paginas');
const files = fs.readdirSync(directoryPath).filter(f => f.endsWith('.html'));

files.forEach(file => {
    const filePath = path.join(directoryPath, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add the theme toggle button next to the logo or inside the header
    const buttonHtml = `
    <button id="theme-toggle-btn" class="theme-toggle-btn" title="Alternar Modo Oscuro">
        <i class="fa-solid fa-moon"></i>
    </button>`;
    
    if (content.includes('class="logo"')) {
        // Insert after the logo div
        content = content.replace(/(<div class="logo">[\s\S]*?<\/div>)/i, `$1${buttonHtml}`);
    }
    
    // Add the script tag before </body>
    if (!content.includes('theme-toggle.js')) {
        content = content.replace(/<\/body>/i, `\n<script src="../scripts/theme-toggle.js"></script>\n</body>`);
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
});
