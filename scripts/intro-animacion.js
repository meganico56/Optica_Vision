// intro-animacion.js — Version optimizada para rendimiento maximo
// El ojo solo es visible dentro del circulo (overflow:hidden).
// Optimizaciones clave:
//   - El circulo se mueve con transform:translate (GPU, sin reflow)
//   - La mascara del blur usa coordenadas redondeadas (menos rebuilds de string)
//   - Getphase inlineado sin bucle
//   - Todos los valores de posicion pre-calculados como enteros
//   - will-change: transform en el circulo (compositor thread exclusivo)
//   - RAF unico, dirty-checking en todos los setters
//   - En panel de administrador siempre se muestra, en otras páginas solo al recargar

document.addEventListener('DOMContentLoaded', () => {
    // Detectar si estamos en el panel de administrador (cualquier sección)
    const currentPath = window.location.pathname;
    const isAdminPanel = currentPath.includes('panel-admin.html') || currentPath.includes('panel-admin');

    // Verificar si ya se mostró la animación en esta sesión (solo para páginas no-admin)
    if (!isAdminPanel) {
        const introShown = sessionStorage.getItem('introAnimationShown');
        if (introShown) {
            return; // No mostrar animación si ya se mostró en esta sesión
        }
    } else {
        // En panel de administrador, siempre limpiar el flag para asegurar que se muestre
        sessionStorage.removeItem('introAnimationShown');
    }

    // En panel de administrador, detectar la sección activa
    let targetContainer = document.body;
    if (isAdminPanel) {
        const activeSection = document.querySelector('.section-content.active');
        if (activeSection) {
            targetContainer = activeSection;
        }
    }

    const isLight = document.documentElement.classList.contains('light-mode');
    const bgColor = isLight ? 'rgba(240,235,220,0.65)' : 'rgba(15,15,15,0.70)';
    const lidBg   = isLight ? '#f0ebdc'                : '#0c0c0c';
    const logoSrc = isLight
        ? '../imagenes/logos/logo-boutique.png'
        : '../imagenes/logos/Logo_modo_oscuro.png';
    const gold  = 'rgba(204,164,59,1)';
    const goldG = 'rgba(204,164,59,0.35)';

    // --- HTML ---
    // El circulo usa position:absolute con left/top FIJOS en el centro de su
    // trayectoria inicial; el movimiento se hace con transform:translate
    // para que quede en el compositor thread (sin layout, sin paint).
    // En panel de administrador, se inserta en la sección activa; en otras páginas, en el body
    targetContainer.insertAdjacentHTML('afterbegin', `
        <div id="iv-wrap" aria-hidden="true"
             style="position:fixed;inset:0;z-index:99999;pointer-events:all;overflow:hidden;">

            <div id="iv-blur"
                 style="position:absolute;inset:0;
                        background:${bgColor};
                        backdrop-filter:blur(20px);
                        -webkit-backdrop-filter:blur(20px);
                        will-change:mask-image,-webkit-mask-image;">
            </div>

            <!-- Anclado en top:0 left:0; se mueve con transform:translate -->
            <div id="iv-circle"
                 style="position:absolute;top:0;left:0;
                        border-radius:50%;overflow:hidden;
                        border:2px solid ${gold};
                        box-shadow:0 0 28px ${goldG},inset 0 0 18px ${goldG};
                        will-change:transform,width,height;">

                <div id="iv-lid-t"
                     style="position:absolute;top:0;left:0;width:100%;z-index:1;
                            background:${lidBg};will-change:height;">
                </div>
                <div id="iv-lid-b"
                     style="position:absolute;bottom:0;left:0;width:100%;z-index:1;
                            background:${lidBg};will-change:height;">
                </div>

                <div id="iv-eye"
                     style="position:absolute;top:50%;left:50%;z-index:2;
                            transform:translate(-50%,-50%);
                            will-change:opacity;">

                    <div id="iv-iris"
                         style="position:absolute;inset:0;border-radius:50%;overflow:hidden;
                                background:radial-gradient(circle at 38% 38%,
                                    #0a2a4a 0%,#1a5a8a 30%,#0d3d6b 60%,#071e38 100%);
                                box-shadow:0 0 0 2px ${gold},0 0 18px rgba(30,100,200,0.5);">

                        <div id="iv-pupil"
                             style="position:absolute;top:50%;left:50%;border-radius:50%;
                                    background:radial-gradient(circle at 35% 35%,
                                        #2a2a2a 0%,#000 60%,#111 100%);
                                    box-shadow:0 0 10px rgba(0,0,0,0.8);
                                    will-change:transform;">
                        </div>

                        <div style="position:absolute;border-radius:50%;
                                    width:18%;height:18%;top:15%;left:55%;
                                    background:radial-gradient(circle,
                                        rgba(255,255,255,0.9) 0%,
                                        rgba(255,255,255,0.3) 50%,
                                        transparent 100%);
                                    pointer-events:none;">
                        </div>
                    </div>
                </div>

            </div>

            <div id="iv-logo"
                 style="position:absolute;top:50%;left:50%;
                        transform:translate(-50%,-50%) scale(0.85);
                        opacity:0;will-change:transform,opacity;">
                <img src="${logoSrc}" alt="Logo Optix"
                     style="height:72px;filter:drop-shadow(0 4px 14px rgba(0,0,0,0.4));">
            </div>
        </div>
    `);

    // --- Referencias DOM ---
    const wrap   = document.getElementById('iv-wrap');
    const blur   = document.getElementById('iv-blur');
    const circle = document.getElementById('iv-circle');
    const eye    = document.getElementById('iv-eye');
    const iris   = document.getElementById('iv-iris');
    const pupil  = document.getElementById('iv-pupil');
    const lidT   = document.getElementById('iv-lid-t');
    const lidB   = document.getElementById('iv-lid-b');
    const logo   = document.getElementById('iv-logo');

    // --- Dimensiones (enteros donde sea posible, cero lecturas en el loop) ---
    const VW      = window.innerWidth  | 0;
    const VH      = window.innerHeight | 0;
    const maxR    = Math.hypot(VW, VH);
    const circleR = Math.min(VW, VH) * 0.22;
    const circleD = circleR * 2;
    const irisR   = circleR * 0.68;
    const irisD   = irisR   * 2;
    const pupilD  = irisR;              // pupilR * 2 = irisR * 0.5 * 2 = irisR
    const lookOff = irisR * 0.45;

    // Posiciones pre-calculadas como enteros (evita .toFixed en el loop)
    // Círculo siempre en el centro de la pantalla
    const pAx = (VW * 0.50) | 0,  pAy = (VH * 0.50) | 0;
    const pBx = (VW * 0.50) | 0,  pBy = (VH * 0.50) | 0;
    const pCx = (VW * 0.50) | 0,  pCy = (VH * 0.50) | 0;

    // Aplicar tamanos fijos una sola vez (sin tocar en el loop)
    circle.style.width  = circleD + 'px';
    circle.style.height = circleD + 'px';

    eye.style.width  = irisD + 'px';
    eye.style.height = irisD + 'px';
    iris.style.width  = iris.style.height = '100%';

    pupil.style.width  = pupilD + 'px';
    pupil.style.height = pupilD + 'px';
    pupil.style.transform = 'translate(-50%,-50%)';

    // --- Easing (funciones puras, sin closures innecesarias) ---
    function lerp(a, b, t)      { return a + (b - a) * t; }
    function easeOutCubic(x)    { return 1 - (1-x)*(1-x)*(1-x); }
    function easeInOutSine(x)   { return -(Math.cos(Math.PI * x) - 1) * 0.5; }
    function easeInOutQuart(x)  {
        return x < 0.5 ? 8*x*x*x*x : 1 - ((-2*x+2)*(-2*x+2)*(-2*x+2)*(-2*x+2)) * 0.5;
    }
    function easeOutElastic(x) {
        if (x === 0 || x === 1) return x;
        return Math.pow(2, -10*x) * Math.sin((x*10 - 0.75) * 2.0944) + 1; // 2*PI/3 pre-calc
    }

    // --- Timeline (timestamps en ms) ---
    //  Fase 0 (0-500):    Circulo crece en posA; ojo se abre
    //  Fase 1 (500-1050): posA->posB;  ojo mira IZQUIERDA
    //  Fase 2 (1050-1600):posB->posC;  ojo mira DERECHA
    //  Fase 3 (1600-2050):posC;        parpadeo suave
    //  Fase 4 (2050-2500):ojo -> logo
    //  Fase 5 (2500-3250):circulo se expande -> revela pagina

    // --- Dirty-checking: guardamos el ultimo valor aplicado ---
    // Usamos variables numéricas directas (mas rapido que string keys para circulos)
    let pTX = 1e9, pTY = 1e9, pR = -1;   // posicion/radio del circulo
    let pLid = -1, pPupil = 1e9;
    let pEye = -1, pLogoOp = -1, pLogoSc = -1;
    let pMaskCX = -1, pMaskCY = -1, pMaskR = -1; // mascara blur

    // Mueve el circulo con transform (GPU only, sin reflow).
    // cx/cy = centro del circulo en pantalla.
    function applyCircle(cx, cy, r) {
        // Redondear a 0.5px — suficiente para la animacion, mucho menos string building
        const tx = (cx - circleR + 0.5) | 0;
        const ty = (cy - circleR + 0.5) | 0;
        const ri = r | 0;

        if (tx === pTX && ty === pTY && ri === pR) return;
        pTX = tx; pTY = ty; pR = ri;

        // Mover con translate (compositor, no reflow)
        circle.style.transform = 'translate(' + tx + 'px,' + ty + 'px)';

        // Actualizar mascara del blur solo si la posicion o radio cambio en 1px
        const mcx = cx | 0, mcy = cy | 0, mr = ri;
        if (mcx !== pMaskCX || mcy !== pMaskCY || mr !== pMaskR) {
            pMaskCX = mcx; pMaskCY = mcy; pMaskR = mr;
            if (mr <= 1) {
                blur.style.webkitMaskImage = '';
                blur.style.maskImage       = '';
            } else {
                // Construir string una sola vez por frame de cambio real
                blur.style.webkitMaskImage =
                blur.style.maskImage =
                    'radial-gradient(circle at ' + mcx + 'px ' + mcy + 'px,transparent ' + mr + 'px,black ' + (mr+1) + 'px)';
            }
        }
    }

    function applyLids(open, r) {
        // Redondear a 0.5px para reducir escrituras
        const h = ((r * (1 - (open < 0 ? 0 : open > 1 ? 1 : open))) * 2 + 0.5 | 0) * 0.5;
        if (h === pLid) return;
        pLid = h;
        lidT.style.height = lidB.style.height = h + 'px';
    }

    function applyPupil(offsetPx) {
        // Redondear offset a 0.25px — precision mas que suficiente visualmente
        const o = (offsetPx * 4 + 0.5 | 0) * 0.25;
        if (o === pPupil) return;
        pPupil = o;
        // Usar translate en px (evita division/% recalculo cada vez)
        pupil.style.transform = 'translate(calc(-50% + ' + o + 'px),-50%)';
    }

    function applyEye(op) {
        const v = (op * 1000 + 0.5 | 0) / 1000;
        if (v === pEye) return;
        pEye = v;
        eye.style.opacity = v;
    }

    function applyLogo(op, sc) {
        const ov = (op * 1000 + 0.5 | 0) / 1000;
        const sv = (sc * 1000 + 0.5 | 0) / 1000;
        if (ov === pLogoOp && sv === pLogoSc) return;
        pLogoOp = ov; pLogoSc = sv;
        logo.style.opacity   = ov;
        logo.style.transform = 'translate(-50%,-50%) scale(' + sv + ')';
    }

    // --- Estado inicial (sin flash) ---
    applyCircle(pAx, pAy, 0);
    applyLids(0, circleR);
    applyEye(0);
    applyLogo(0, 0.85);

    // --- Loop principal ---
    let t0 = 0, done = false;

    function frame(ts) {
        if (done) return;
        if (!t0) { t0 = ts; requestAnimationFrame(frame); return; }

        const ms = ts - t0;

        // getPhase inlineado — sin bucle, sin objeto temporal
        let phase, t;
        if      (ms < 500)  { phase = 0; t = ms / 500; }
        else if (ms < 1050) { phase = 1; t = (ms - 500)  / 550; }
        else if (ms < 1600) { phase = 2; t = (ms - 1050) / 550; }
        else if (ms < 2050) { phase = 3; t = (ms - 1600) / 450; }
        else if (ms < 2500) { phase = 4; t = (ms - 2050) / 450; }
        else                { phase = 5; t = (ms - 2500) / 750; if (t > 1) t = 1; }

        // Variables de salida (defaults = circulo en centro, ojo abierto)
        let cx = pCx, cy = pCy, r = circleR;
        let open = 1, pupX = 0, eyeOp = 1, logoOp = 0, logoSc = 0.85;

        if (phase === 0) {
            cx = pAx; cy = pAy;
            const e = easeOutCubic(t);
            r     = circleR * e;
            open  = e;
            eyeOp = e > 0.2 ? easeOutCubic((e - 0.2) * 1.25) : 0;

        } else if (phase === 1) {
            const e = easeInOutSine(t);
            cx = (pAx + (pBx - pAx) * e) | 0;
            cy = (pAy + (pBy - pAy) * e) | 0;
            pupX = t < 0.35 ? -lookOff * easeInOutSine(t * 2.857)
                 : t < 0.65 ? -lookOff
                 :            -lookOff * easeInOutSine((1 - t) * 2.857);

        } else if (phase === 2) {
            const e = easeInOutSine(t);
            cx = (pBx + (pCx - pBx) * e) | 0;
            cy = (pBy + (pCy - pBy) * e) | 0;
            pupX = t < 0.35 ?  lookOff * easeInOutSine(t * 2.857)
                 : t < 0.65 ?  lookOff
                 :              lookOff * easeInOutSine((1 - t) * 2.857);

        } else if (phase === 3) {
            cx = pCx; cy = pCy;
            open = t < 0.35 ? 1
                 : t < 0.50 ? 1 - easeInOutSine((t - 0.35) * 6.667)
                 : t < 0.65 ?     easeInOutSine((t - 0.50) * 6.667)
                 : 1;
            eyeOp = open;

        } else if (phase === 4) {
            cx = pCx; cy = pCy;
            eyeOp  = 1 - easeInOutQuart(t);
            const li = t > 0.2 ? easeOutCubic((t - 0.2) * 1.25) : 0;
            logoOp = li;
            logoSc = lerp(0.85, 1.02, easeOutElastic(t < 0.833 ? t * 1.2 : 1));

        } else { // phase 5
            cx = pCx; cy = pCy;
            r      = lerp(circleR, maxR, easeInOutQuart(t));
            open   = 1;
            eyeOp  = 0;
            logoOp = t < 0.6 ? 1 : 1 - easeOutCubic((t - 0.6) * 2.5);
            logoSc = lerp(1.02, 1.12, t);

            if (t >= 1) {
                done = true;
                wrap.style.transition = 'opacity 0.2s ease';
                wrap.style.opacity    = '0';
                // Marcar que la animación se mostró en esta sesión
                sessionStorage.setItem('introAnimationShown', 'true');
                setTimeout(function() { if (wrap.parentNode) wrap.remove(); }, 220);
                return;
            }
        }

        applyCircle(cx, cy, r);
        applyLids(open, r);
        applyPupil(pupX);
        applyEye(eyeOp);
        applyLogo(logoOp, logoSc);

        requestAnimationFrame(frame);
    }

    setTimeout(function() { requestAnimationFrame(frame); }, 60);
});
