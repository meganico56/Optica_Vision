
(function () {
    'use strict';

    const K_CARRITO = 'bv_carrito';
    const K_COMPRA = 'bv_compra';
    const MAX_SIN_STOCK = 99; // tope cuando el producto no trae stock

    function leer() {
        try {
            const datos = JSON.parse(localStorage.getItem(K_CARRITO));
            return Array.isArray(datos) ? datos : [];
        } catch (e) {
            return [];
        }
    }

    function limiteDe(item) {
        const stock = Number(item.stock);
        return Number.isFinite(stock) ? stock : MAX_SIN_STOCK;
    }

    function pintarBadge() {
        const total = Carrito.cantidadTotal();
        const badge = document.getElementById('cartBadge');   // barra pública
        if (badge) {
            badge.textContent = total > 99 ? '99+' : String(total);
            badge.hidden = total === 0;
        }
        const cuenta = document.getElementById('cartCount');  // panel de usuario
        if (cuenta) cuenta.textContent = String(total);
    }

    function guardar(items) {
        try { localStorage.setItem(K_CARRITO, JSON.stringify(items)); } catch (e) { /* almacenamiento lleno o bloqueado */ }
        avisar(items);
    }

    function avisar(items) {
        pintarBadge();
        document.dispatchEvent(new CustomEvent('carrito:cambio', { detail: { items: items || leer() } }));
    }

    function normalizar(p) {
        return {
            id: String(p.id),
            nombre: String(p.nombre || ''),
            marca: String(p.marca || ''),
            precio: Number(p.precio) || 0,
            imagen: String(p.imagen || ''),
            stock: p.stock === undefined || p.stock === null ? undefined : Number(p.stock)
        };
    }

    const Carrito = {
        items: leer,

        cantidadTotal() {
            return leer().reduce((suma, i) => suma + i.cantidad, 0);
        },

        subtotal() {
            return leer().reduce((suma, i) => suma + i.precio * i.cantidad, 0);
        },

        // Devuelve { ok, cantidad, mensaje }
        agregar(producto, cantidad) {
            const n = Math.max(1, parseInt(cantidad, 10) || 1);
            const base = normalizar(producto);
            if (!base.id || base.id === 'undefined') {
                return { ok: false, cantidad: 0, mensaje: 'Producto inválido' };
            }
            if (base.stock !== undefined && base.stock <= 0) {
                return { ok: false, cantidad: 0, mensaje: 'Producto agotado' };
            }

            const items = leer();
            const existente = items.find((i) => i.id === base.id);
            const actual = existente ? existente.cantidad : 0;
            const limite = limiteDe(base);
            const nueva = Math.min(actual + n, limite);

            if (nueva === actual) {
                return { ok: false, cantidad: actual, mensaje: 'Ya tienes todas las unidades disponibles en el carrito' };
            }

            if (existente) {
                existente.cantidad = nueva;
                existente.precio = base.precio;       // refresca por si cambió
                existente.stock = base.stock;
            } else {
                items.push(Object.assign(base, { cantidad: nueva }));
            }
            guardar(items);

            const limitado = actual + n > limite;
            return {
                ok: true,
                cantidad: nueva,
                mensaje: limitado ? 'Solo hay ' + limite + ' unidades disponibles' : 'Agregado al carrito'
            };
        },

        cambiarCantidad(id, cantidad) {
            const n = parseInt(cantidad, 10);
            if (!Number.isFinite(n) || n <= 0) return Carrito.quitar(id);
            const items = leer();
            const item = items.find((i) => i.id === String(id));
            if (!item) return;
            item.cantidad = Math.min(n, limiteDe(item));
            guardar(items);
        },

        quitar(id) {
            guardar(leer().filter((i) => i.id !== String(id)));
        },

        quitarVarios(ids) {
            const fuera = new Set(ids.map(String));
            guardar(leer().filter((i) => !fuera.has(i.id)));
        },

        vaciar() {
            guardar([]);
        },

        // ---------- Compra en curso (carrito -> datos -> pago, o "Comprar ahora") ----------
        // Guarda qué se va a comprar para que formulario-pedido.html lo lea.
        iniciarCompra(items, codigoPromo) {
            const lista = items.map((i) => Object.assign(normalizar(i), { cantidad: Math.max(1, parseInt(i.cantidad, 10) || 1) }));
            sessionStorage.setItem(K_COMPRA, JSON.stringify({ items: lista, codigoPromo: codigoPromo || null }));
        },

        compraActual() {
            try { return JSON.parse(sessionStorage.getItem(K_COMPRA)); } catch (e) { return null; }
        },

        terminarCompra() {
            sessionStorage.removeItem(K_COMPRA);
        }
    };

    window.Carrito = Carrito;

    // Cambios hechos desde otra pestaña
    window.addEventListener('storage', (e) => {
        if (e.key === K_CARRITO) avisar();
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', pintarBadge);
    } else {
        pintarBadge();
    }
  // =============================================
    // 6. Modales de Ayuda del Footer
    // =============================================
    const botonesAyuda = document.querySelectorAll(".ayuda-link");
    const modalesAyuda = document.querySelectorAll(".ayuda-modal");

    botonesAyuda.forEach(boton => {
        boton.addEventListener("click", () => {
            const idModal = boton.dataset.modal;
            const modal = document.getElementById(idModal);
            if (modal) modal.style.display = "flex";
        });
    });

    document.querySelectorAll(".ayuda-cerrar").forEach(boton => {
        boton.addEventListener("click", () => {
            boton.closest(".ayuda-modal").style.display = "none";
        });
    });

    modalesAyuda.forEach(modal => {
        modal.addEventListener("click", (event) => {
            if (event.target === modal) modal.style.display = "none";
        });
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            modalesAyuda.forEach(modal => { modal.style.display = "none"; });
        }
    });

    // =============================================
    // 7. Disco del podio: rotación por arrastre
    // =============================================
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
})();