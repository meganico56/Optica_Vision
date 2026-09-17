// intro-animacion.js
// Controla la animación inicial de enfoque que se ejecuta al cargar las páginas

document.addEventListener('DOMContentLoaded', () => {
    // El fondo con desenfoque y el reflejo se adaptan al tema para que
    // la animación se vea igual de vistosa en modo claro y oscuro.
    const isLightMode = document.documentElement.classList.contains('light-mode');
    const bgBlurColor  = isLightMode ? 'rgba(240, 235, 220, 0.55)' : 'rgba(20, 20, 20, 0.55)';
    const reflectColor = isLightMode ? 'rgba(180, 140, 40, 0.45)'  : 'rgba(255, 255, 255, 0.5)';
    const logoSrc      = isLightMode ? '../imagenes/logos/logo-boutique.png' : '../imagenes/logos/Logo_modo_oscuro.png';

    // 1. Inyectar HTML de la animación
    const introHTML = `
        <div id="intro-container" style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;pointer-events:all;">
            <div id="intro-blur" style="position:absolute;top:0;left:0;width:100%;height:100%;background:${bgBlurColor};backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);"></div>
            <div id="intro-ring" style="position:absolute;transform:translate(-50%,-50%);border-radius:50%;border:1px solid rgba(204,164,59,0.7);box-shadow:0 8px 32px rgba(0,0,0,0.3),inset 0 0 20px rgba(255,255,255,0.5);background:linear-gradient(135deg,rgba(255,255,255,0.1) 0%,rgba(255,255,255,0) 50%,rgba(255,255,255,0.05) 100%);overflow:hidden;opacity:0;">
                <div id="intro-reflection" style="position:absolute;width:200%;height:200%;background:linear-gradient(45deg, transparent 40%, ${reflectColor} 50%, transparent 60%);top:-50%;left:0;transform:rotate(30deg);"></div>
            </div>
            <div id="intro-logo" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) scale(0.8);opacity:0;">
                <img src="${logoSrc}" alt="Logo" style="height:70px;filter:drop-shadow(0 4px 10px rgba(0,0,0,0.3));">
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('afterbegin', introHTML);
    
    // 2. Ejecutar Animación
    const c = document.getElementById('intro-container'), b = document.getElementById('intro-blur');
    const r = document.getElementById('intro-ring'), l = document.getElementById('intro-logo');
    const ref = document.getElementById('intro-reflection');
    
    // Forzamos un pequeño retraso para asegurar que el navegador ha renderizado el HTML inicial
    setTimeout(() => {
        const start = performance.now(), duration = 2800; // 2.8 segundos
        
        // Keyframes: t = tiempo, rad = radio, x/y = posicion %, lO = logo opacity, lS = logo scale, rO = ring opacity
        const kf = [
            { t: 0,    rad: 0,   x: 20, y: 30, lO: 0, lS: 0.8, rO: 0 },
            { t: 0.1,  rad: 100, x: 20, y: 30, lO: 0, lS: 0.8, rO: 1 },
            { t: 0.35, rad: 100, x: 75, y: 65, lO: 0, lS: 0.8, rO: 1 },
            { t: 0.55, rad: 140, x: 50, y: 50, lO: 0, lS: 0.8, rO: 1 },
            { t: 0.65, rad: 140, x: 50, y: 50, lO: 1, lS: 1.0, rO: 1 },
            { t: 0.8,  rad: 140, x: 50, y: 50, lO: 1, lS: 1.0, rO: 1 },
            { t: 0.95, rad: 'MAX',x: 50, y: 50, lO: 0, lS: 1.1, rO: 0 },
            { t: 1.0,  rad: 'MAX',x: 50, y: 50, lO: 0, lS: 1.1, rO: 0 }
        ];

        function lerp(a, b, t) { return a + (b - a) * t; }
        function ease(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }

        function animate(time) {
            let p = (time - start) / duration;
            if (p > 1) p = 1;
            
            let i = 0; while(i < kf.length - 2 && p >= kf[i+1].t) i++;
            const s = kf[i], e = kf[i+1], segP = (p - s.t) / (e.t - s.t), eased = ease(segP);
            
            const maxR = Math.hypot(window.innerWidth, window.innerHeight);
            const rad = lerp(s.rad === 'MAX' ? maxR : s.rad, e.rad === 'MAX' ? maxR : e.rad, eased);
            const pxX = lerp(s.x, e.x, eased) / 100 * window.innerWidth;
            const pxY = lerp(s.y, e.y, eased) / 100 * window.innerHeight;
            
            // Máscara para revelar el contenido enfocado
            const mask = `radial-gradient(circle at ${pxX}px ${pxY}px, transparent ${rad}px, black ${rad + 1}px)`;
            b.style.webkitMaskImage = mask; 
            b.style.maskImage = mask;
            
            // Actualizar anillo
            r.style.width = r.style.height = (rad * 2) + 'px';
            r.style.left = pxX + 'px'; 
            r.style.top = pxY + 'px';
            r.style.opacity = lerp(s.rO, e.rO, eased);
            
            // Mover reflejo
            ref.style.left = (p * 200 - 100) + '%';
            
            // Actualizar Logo
            l.style.opacity = lerp(s.lO, e.lO, eased);
            l.style.transform = `translate(-50%, -50%) scale(${lerp(s.lS, e.lS, eased)})`;
            
            if (p < 1) requestAnimationFrame(animate); else c.remove();
        }
        requestAnimationFrame(animate);
    }, 50);
});
