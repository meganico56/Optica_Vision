// ScriptInicio.js
// Comportamiento básico de la página de Inicio: animación de entrada
// y navbar que cambia de aspecto al hacer scroll.

document.addEventListener("DOMContentLoaded", () => {

    // 1. Animación de entrada del hero (texto y visor de gafas)
    const elementosAnimados = document.querySelectorAll(".fade-in-up");

    elementosAnimados.forEach((el, index) => {
        // pequeño retraso escalonado para que no aparezcan todos a la vez
        setTimeout(() => {
            el.classList.add("visible");
        }, 150 * index);
    });

    // 2. Navbar que se compacta al hacer scroll
    const navbar = document.querySelector(".navbar");

    function actualizarNavbar() {
        if (window.scrollY > 40) {
            navbar.classList.add("scrolled");
        } else {
            navbar.classList.remove("scrolled");
        }
    }

    // estado inicial (por si la página carga ya con scroll, ej. al recargar)
    actualizarNavbar();

    window.addEventListener("scroll", actualizarNavbar);

    // 3. Carrusel de Servicios: rotación automática y botones anterior / siguiente
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
    const INTERVALO = 5000; // cambia cada 5 segundos

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
        temporizador = setInterval(siguienteSlide, INTERVALO);
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

        // Pausar si el usuario pasa el mouse por encima
        if (contenedorServicios) {
            contenedorServicios.addEventListener("mouseenter", detenerRotacion);
            contenedorServicios.addEventListener("mouseleave", iniciarRotacion);
        }

        // Si el usuario hace clic directamente en los puntos inferiores
        document.querySelectorAll(".carrusel-puntos label").forEach((label, i) => {
            label.addEventListener("click", () => {
                indiceActual = i;
                iniciarRotacion();
            });
        });
    }

    // Galería de fotos de "Quiénes somos": avance rápido cada 4 segundos.
    const nosotrosCarrusel = document.getElementById("nosotrosCarrusel");
    const nosotrosTrack = document.getElementById("nosotrosCarruselTrack");
    const nosotrosFotos = nosotrosTrack ? Array.from(nosotrosTrack.querySelectorAll("img")) : [];
    const fotoAnterior = document.getElementById("nosotrosFotoAnterior");
    const fotoSiguiente = document.getElementById("nosotrosFotoSiguiente");
    const dash = nosotrosCarrusel ? nosotrosCarrusel.querySelector(".nosotros-carrusel-dash") : null;
    const movimientoReducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

    // 4. Carrusel de Reseñas: Avance automático continuo y arrastre por clic sostenido (drag & touch)
    const resenasWrapper = document.querySelector(".resenas-carrusel-wrapper");
    const resenasTrack = document.getElementById("resenasTrack");

    if (resenasWrapper && resenasTrack) {
        // Clonar las tarjetas para permitir un scroll infinito y continuo
        const originalCards = Array.from(resenasTrack.children);
        originalCards.forEach(card => {
            const clon = card.cloneNode(true);
            resenasTrack.appendChild(clon);
        });

        let posX = 0;
        let isDown = false;
        let startX = 0;
        let scrollStart = 0;
        const speed = 0.8; // Velocidad del desplazamiento automático continuo

        function obtenerAnchoMitad() {
            return resenasTrack.scrollWidth / 2;
        }

        function animar() {
            if (!isDown) {
                posX -= speed;
                const mitad = obtenerAnchoMitad();
                if (Math.abs(posX) >= mitad) {
                    posX = 0;
                }
                resenasTrack.style.transform = `translateX(${posX}px)`;
            }
            requestAnimationFrame(animar);
        }

        // Eventos de Mouse (clic sostenido para arrastrar)
        resenasWrapper.addEventListener("mousedown", (e) => {
            isDown = true;
            startX = e.pageX - resenasWrapper.offsetLeft;
            scrollStart = posX;
            resenasWrapper.style.cursor = "grabbing";
        });

        window.addEventListener("mouseup", () => {
            if (isDown) {
                isDown = false;
                resenasWrapper.style.cursor = "grab";
                const mitad = obtenerAnchoMitad();
                if (posX > 0) posX = -mitad + (posX % mitad);
                if (Math.abs(posX) >= mitad) posX = -(Math.abs(posX) % mitad);
            }
        });

        window.addEventListener("mousemove", (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - resenasWrapper.offsetLeft;
            const walk = (x - startX) * 1.3; // Factor de arrastre
            posX = scrollStart + walk;
            resenasTrack.style.transform = `translateX(${posX}px)`;
        });

        // Eventos táctiles para móviles
        resenasWrapper.addEventListener("touchstart", (e) => {
            isDown = true;
            startX = e.touches[0].pageX - resenasWrapper.offsetLeft;
            scrollStart = posX;
        }, { passive: true });

        window.addEventListener("touchend", () => {
            if (isDown) {
                isDown = false;
                const mitad = obtenerAnchoMitad();
                if (posX > 0) posX = -mitad + (posX % mitad);
                if (Math.abs(posX) >= mitad) posX = -(Math.abs(posX) % mitad);
            }
        });

        window.addEventListener("touchmove", (e) => {
            if (!isDown) return;
            const x = e.touches[0].pageX - resenasWrapper.offsetLeft;
            const walk = (x - startX) * 1.3;
            posX = scrollStart + walk;
            resenasTrack.style.transform = `translateX(${posX}px)`;
        }, { passive: true });

        // Iniciar el bucle de animación continua
        requestAnimationFrame(animar);
    }

});

const abrir = document.getElementById("abrirModal");
const cerrar = document.getElementById("cerrarModal");
const modal = document.getElementById("miModal");

// =====================================
// MODALES DE AYUDA DEL FOOTER
// =====================================

document.addEventListener("DOMContentLoaded", () => {

    const botonesAyuda = document.querySelectorAll(".ayuda-link");
    const modalesAyuda = document.querySelectorAll(".ayuda-modal");

    // Abrir modal correspondiente
    botonesAyuda.forEach(boton => {

        boton.addEventListener("click", () => {

            const idModal = boton.dataset.modal;
            const modal = document.getElementById(idModal);

            if (modal) {
                modal.style.display = "flex";
            }

        });

    });

    // Cerrar con la X
    document.querySelectorAll(".ayuda-cerrar").forEach(boton => {

        boton.addEventListener("click", () => {

            const modal = boton.closest(".ayuda-modal");

            modal.style.display = "none";

        });

    });

    // Cerrar al hacer clic fuera del contenido
    modalesAyuda.forEach(modal => {

        modal.addEventListener("click", (event) => {

            if (event.target === modal) {
                modal.style.display = "none";
            }

        });

    });

    // Cerrar presionando ESC
    document.addEventListener("keydown", (event) => {

        if (event.key === "Escape") {

            modalesAyuda.forEach(modal => {
                modal.style.display = "none";
            });

        }

    });

    // Disco del podio: se gira arrastrando con clic sostenido (las gafas giran con él)
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

        // una vuelta completa cada vez que se arrastra el doble del ancho del disco
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

            // si se soltó con impulso, el disco sigue girando y frena poco a poco
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