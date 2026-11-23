// inicio.js — Optimizado para rendimiento
// Comportamiento de la página de Inicio: animaciones, carruseles,
// navbar scroll, modales de ayuda y rotación del podio.

document.addEventListener("DOMContentLoaded", () => {
    const movimientoReducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Animación de entrada del hero 
    const elementosAnimados = document.querySelectorAll(".fade-in-up");
    elementosAnimados.forEach((el, index) => {
        setTimeout(() => el.classList.add("visible"), 150 * index);
    });


    // Carrusel de Servicios

    const slides = [
        document.getElementById("slide1"),
        document.getElementById("slide2"),
        document.getElementById("slide3")
    ].filter(Boolean);

    const btnPrev = document.getElementById("servicioPrev");
    const btnNext = document.getElementById("servicioNext");
    const contenedorServicios = document.querySelector(".servicios-contenedor");

    let indiceActual = 0;
    let temporizador = null;
    const INTERVALO = 5000;

    function obtenerIndiceActivo() {
        const idx = slides.findIndex(radio => radio.checked);
        return idx !== -1 ? idx : 0;
    }

    function mostrarSlide(idx) {
        indiceActual = (idx + slides.length) % slides.length;
        if (slides[indiceActual]) {
            slides[indiceActual].checked = true;
        }
    }

    function siguienteSlide() {
        indiceActual = obtenerIndiceActivo();
        mostrarSlide(indiceActual + 1);
    }

    function anteriorSlide() {
        indiceActual = obtenerIndiceActivo();
        mostrarSlide(indiceActual - 1);
    }

    function iniciarRotacion() {
        detenerRotacion();
        if (!movimientoReducido && !document.hidden) {
            temporizador = setInterval(siguienteSlide, INTERVALO);
        }
    }

    function detenerRotacion() {
        if (temporizador) {
            clearInterval(temporizador);
            temporizador = null;
        }
    }

    if (slides.length > 0) {
        iniciarRotacion();

        if (btnNext) {
            btnNext.addEventListener("click", () => {
                siguienteSlide();
                iniciarRotacion();
            });
        }

        if (btnPrev) {
            btnPrev.addEventListener("click", () => {
                anteriorSlide();
                iniciarRotacion();
            });
        }

        if (contenedorServicios) {
            contenedorServicios.addEventListener("mouseenter", detenerRotacion);
            contenedorServicios.addEventListener("mouseleave", iniciarRotacion);
        }

        document.addEventListener("visibilitychange", () => {
            if (document.hidden) detenerRotacion();
            else iniciarRotacion();
        });

        document.querySelectorAll(".carrusel-puntos label").forEach((label, i) => {
            label.addEventListener("click", () => {
                indiceActual = i;
                iniciarRotacion();
            });
        });
    }


    // Galería de fotos de "Quiénes somos"

    const nosotrosCarrusel = document.getElementById("nosotrosCarrusel");
    const nosotrosTrack = document.getElementById("nosotrosCarruselTrack");
    const nosotrosFotos = nosotrosTrack ? Array.from(nosotrosTrack.querySelectorAll("img")) : [];
    const fotoAnterior = document.getElementById("nosotrosFotoAnterior");
    const fotoSiguiente = document.getElementById("nosotrosFotoSiguiente");
    const dash = nosotrosCarrusel ? nosotrosCarrusel.querySelector(".nosotros-carrusel-dash") : null;
    let indiceFoto = 0;
    let temporizadorFotos = null;
    let dashFrame = null;

    function mostrarFoto(indice) {
        indiceFoto = (indice + nosotrosFotos.length) % nosotrosFotos.length;
        nosotrosTrack.style.transform = `translateX(-${indiceFoto * (100 / nosotrosFotos.length)}%)`;
        nosotrosFotos.forEach((foto, i) => {
            foto.setAttribute("aria-hidden", i === indiceFoto ? "false" : "true");
        });

        if (dash) {
            dash.classList.remove("is-activo");
            if (dashFrame) cancelAnimationFrame(dashFrame);
            dashFrame = requestAnimationFrame(() => {
                dash.classList.add("is-activo");
                dashFrame = null;
            });
        }
    }

    function detenerRotacionFotos() {
        if (temporizadorFotos) {
            clearInterval(temporizadorFotos);
            temporizadorFotos = null;
        }
    }

    function iniciarRotacionFotos() {
        detenerRotacionFotos();
        if (!movimientoReducido && !document.hidden && nosotrosFotos.length > 1) {
            temporizadorFotos = setInterval(() => mostrarFoto(indiceFoto + 1), 4000);
        }
    }

    if (nosotrosCarrusel && nosotrosFotos.length > 1) {
        if (fotoSiguiente) {
            fotoSiguiente.addEventListener("click", () => {
                mostrarFoto(indiceFoto + 1);
                iniciarRotacionFotos();
            });
        }

        if (fotoAnterior) {
            fotoAnterior.addEventListener("click", () => {
                mostrarFoto(indiceFoto - 1);
                iniciarRotacionFotos();
            });
        }

        document.addEventListener("visibilitychange", iniciarRotacionFotos);
        iniciarRotacionFotos();
    }


    // Carrusel de Reseñas (con IntersectionObserver)

    const resenasWrapper = document.querySelector(".resenas-carrusel-wrapper");
    const resenasTrack = document.getElementById("resenasTrack");

    if (resenasWrapper && resenasTrack) {
        const originalCards = Array.from(resenasTrack.children);
        originalCards.forEach(card => {
            resenasTrack.appendChild(card.cloneNode(true));
        });

        let posX = 0;
        let isDown = false;
        let startX = 0;
        let scrollStart = 0;
        const speed = 0.8;
        let resenasVisible = false;
        let rafId = null;

        function obtenerAnchoMitad() {
            return resenasTrack.scrollWidth / 2;
        }

        function animar() {
            if (!resenasVisible) { rafId = null; return; }
            if (!isDown) {
                posX -= speed;
                const mitad = obtenerAnchoMitad();
                if (Math.abs(posX) >= mitad) {
                    posX = 0;
                }
                resenasTrack.style.transform = `translateX(${posX}px)`;
            }
            rafId = requestAnimationFrame(animar);
        }

        // IntersectionObserver: solo anima cuando es visible
        const resenasObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                resenasVisible = entry.isIntersecting && !movimientoReducido && !document.hidden;
                if (resenasVisible && !rafId) {
                    rafId = requestAnimationFrame(animar);
                }
                if (!resenasVisible && rafId) {
                    cancelAnimationFrame(rafId);
                    rafId = null;
                }
            });
        }, { threshold: 0.1 });

        resenasObserver.observe(resenasWrapper);

        document.addEventListener("visibilitychange", () => {
            if (document.hidden && rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
                resenasVisible = false;
            } else if (!document.hidden && !movimientoReducido) {
                resenasVisible = true;
                if (!rafId) rafId = requestAnimationFrame(animar);
            }
        });

        // Eventos de arrastre: registrar mousemove/touchmove solo cuando se necesitan
        function onMouseMove(e) {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - resenasWrapper.offsetLeft;
            const walk = (x - startX) * 1.3;
            posX = scrollStart + walk;
            resenasTrack.style.transform = `translateX(${posX}px)`;
        }

        function onMouseUp() {
            if (!isDown) return;
            isDown = false;
            resenasWrapper.style.cursor = "grab";
            const mitad = obtenerAnchoMitad();
            if (posX > 0) posX = -mitad + (posX % mitad);
            if (Math.abs(posX) >= mitad) posX = -(Math.abs(posX) % mitad);
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        }

        resenasWrapper.addEventListener("mousedown", (e) => {
            isDown = true;
            startX = e.pageX - resenasWrapper.offsetLeft;
            scrollStart = posX;
            resenasWrapper.style.cursor = "grabbing";
            window.addEventListener("mousemove", onMouseMove);
            window.addEventListener("mouseup", onMouseUp);
        });

        // Eventos táctiles
        function onTouchMove(e) {
            if (!isDown) return;
            const x = e.touches[0].pageX - resenasWrapper.offsetLeft;
            const walk = (x - startX) * 1.3;
            posX = scrollStart + walk;
            resenasTrack.style.transform = `translateX(${posX}px)`;
        }

        function onTouchEnd() {
            if (!isDown) return;
            isDown = false;
            const mitad = obtenerAnchoMitad();
            if (posX > 0) posX = -mitad + (posX % mitad);
            if (Math.abs(posX) >= mitad) posX = -(Math.abs(posX) % mitad);
            window.removeEventListener("touchmove", onTouchMove);
            window.removeEventListener("touchend", onTouchEnd);
        }

        resenasWrapper.addEventListener("touchstart", (e) => {
            isDown = true;
            startX = e.touches[0].pageX - resenasWrapper.offsetLeft;
            scrollStart = posX;
            window.addEventListener("touchmove", onTouchMove, { passive: true });
            window.addEventListener("touchend", onTouchEnd);
        }, { passive: true });
    }


    // Disco del podio: rotación por arrastre

    const discoPodio = document.querySelector(".podium-tapa");
    const gafasPodio = document.querySelector(".glasses-model");

    if (discoPodio) {
        const ANIMACIONES_GIRO = ["podioDestello", "rotateGlasses", "podioSombra"];
        const agarres = [discoPodio, gafasPodio].filter(Boolean);
        let arrastrando = false;
        let ultimoX = 0;
        let ultimoT = 0;
        let velocidad = 0;
        let inercia = null;

        const animacionesGiro = () => document.getAnimations()
            .filter(a => ANIMACIONES_GIRO.includes(a.animationName));

        const msPorPixel = () => 12000 / (discoPodio.offsetWidth * 2);

        function moverGiro(deltaMs) {
            animacionesGiro().forEach(a => {
                const duracion = a.effect.getTiming().duration;
                const actual = Number(a.currentTime) || 0;
                a.currentTime = (((actual + deltaMs) % duracion) + duracion) % duracion;
            });
        }

        function soltarDisco(e) {
            if (!arrastrando) return;
            arrastrando = false;
            document.body.classList.remove("disco-arrastrando");

            let v = e.timeStamp - ultimoT > 100 ? 0 : velocidad;
            const frenar = () => {
                if (Math.abs(v) < 0.05) {
                    inercia = null;
                    animacionesGiro().forEach(a => a.play());
                    return;
                }
                moverGiro(v * 16);
                v *= 0.94;
                inercia = requestAnimationFrame(frenar);
            };
            inercia = requestAnimationFrame(frenar);
        }

        agarres.forEach(el => {
            el.addEventListener("pointerdown", e => {
                if (e.button !== 0) return;
                e.preventDefault();
                cancelAnimationFrame(inercia);
                arrastrando = true;
                ultimoX = e.clientX;
                ultimoT = e.timeStamp;
                velocidad = 0;
                el.setPointerCapture(e.pointerId);
                animacionesGiro().forEach(a => a.pause());
                document.body.classList.add("disco-arrastrando");
            });

            el.addEventListener("pointermove", e => {
                if (!arrastrando) return;
                const deltaMs = (e.clientX - ultimoX) * msPorPixel();
                const dt = e.timeStamp - ultimoT;
                if (dt > 0) velocidad = deltaMs / dt;
                moverGiro(deltaMs);
                ultimoX = e.clientX;
                ultimoT = e.timeStamp;
            });

            el.addEventListener("pointerup", soltarDisco);
            el.addEventListener("pointercancel", soltarDisco);
            el.addEventListener("dragstart", e => e.preventDefault());
        });
    }

});