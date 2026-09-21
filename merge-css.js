const fs = require('fs');
const path = require('path');

const cssDir = path.join(__dirname, 'estilos');
const globalCssPath = path.join(cssDir, 'global.css');

if (!fs.existsSync(globalCssPath)) {
    console.error("global.css not found");
    process.exit(1);
}

const globalContent = fs.readFileSync(globalCssPath, 'utf8');

const targetFiles = [
    'inicio.css',
    'catalogo.css',
    'estilo-visualizador.css',
    'estilo-carrito.css',
    'estilo-formulario.css',
    'estilo-admin.css',
    'estilo-auth.css',
    'estilo-registro.css',
    'estilo-recuperar.css' // Optional, for recovering password if used
];

targetFiles.forEach(file => {
    const filePath = path.join(cssDir, file);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Remove import if it exists
        content = content.replace(/@import\s+url\(['"]global\.css['"]\);\s*/g, '');
        
        // Ensure we don't prepend multiple times
        if (!content.includes('PREVENIR CURSOR Y ENTRADA DE TEXTO AL HACER CLIC')) {
            content = globalContent + '\n\n/* === START OF SPECIFIC PAGE STYLES === */\n\n' + content;
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Merged global.css into ${file}`);
        } else {
            console.log(`${file} already has global styles merged.`);
        }
    }
});

// Remove global.css links from HTML files
const htmlDir = path.join(__dirname, 'paginas');
const htmlFiles = fs.readdirSync(htmlDir).filter(f => f.endsWith('.html'));

htmlFiles.forEach(file => {
    const htmlPath = path.join(htmlDir, file);
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Regex to match the global.css link tag (handling different path structures and trailing slashes/tags)
    htmlContent = htmlContent.replace(/<link\s+rel="stylesheet"\s+href="[^"]*global\.css"[^>]*>\s*/ig, '');
    
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');
    console.log(`Removed global.css link from ${file}`);
});
