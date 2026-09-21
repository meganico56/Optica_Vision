const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'estilos', 'estilo-admin.css');
let content = fs.readFileSync(cssPath, 'utf8');

// The file currently has:
// :root { dark colors }
// :root.light-mode { light colors }
// We need to swap them to:
// :root { light colors }
// :root.dark-mode { dark colors }

const rootLightMatch = content.match(/:root\.light-mode\s*{([^}]*)}/);
const rootDarkMatch = content.match(/:root\s*{([^}]*)}/);

if (rootLightMatch && rootDarkMatch) {
    const lightVars = rootLightMatch[1];
    const darkVars = rootDarkMatch[1];
    
    // Create new blocks
    const newRoot = `:root {${lightVars}}`;
    const newDark = `:root.dark-mode {${darkVars}}`;
    
    content = content.replace(rootDarkMatch[0], newRoot);
    content = content.replace(rootLightMatch[0], newDark);
    
    // Also replace .light-mode with .dark-mode anywhere else in the file
    content = content.replace(/\.light-mode/g, '.dark-mode');
    
    fs.writeFileSync(cssPath, content, 'utf8');
    console.log("estilo-admin.css fixed");
}
