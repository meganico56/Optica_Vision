(function () {
    'use strict';

    const lista = document.getElementById('listaCarrito');
    const vacio = document.getElementById('carritoVacio');
    const plantilla = document.getElementById('tplItemCarrito');
    const subtotalEl = document.getElementById('subtotal');
    const descuentoEl = document.getElementById('descuento');
    const totalEl = document.getElementById('total');
    const filaDescuento = document.getElementById('filaDescuento');
    const codigoPromo = document.getElementById('codigoPromo');
    const btnPromo = document.getElementById('btnPromo');
    const mensajePromo = document.getElementById('mensajePromo');
    const btnCheckout = document.getElementById('btnCheckout');
    const imagenPredeterminada = '../imagenes/productos/gafas-modelo1.png';

    let promocionActual = null;

    function moneda(valor) {
        return BV.moneda(valor);
    }

    function mostrarMensajePromo(texto, correcto) {
        mensajePromo.textContent = texto;
        mensajePromo.classList.toggle('ok', Boolean(correcto));
        mensajePromo.hidden = !texto;
    }

    function imagenDe(item) {
        const imagen = String(item.imagen || '');
        if (!imagen) return imagenPredeterminada;
        return /^(https?:|data:|\/|\.\.\/)/i.test(imagen)
            ? imagen
            : '../imagenes/productos/' + imagen;
    }

    function calcularDescuento(subtotal) {
        if (!promocionActual) return 0;
        const valor = Number(promocionActual.valor_descuento) || 0;
        const esPorcentaje = String(promocionActual.tipo_descuento).toLowerCase() === 'porcentaje';
        const descuento = esPorcentaje ? Math.round(subtotal * valor) / 100 : valor;
        return Math.min(Math.max(descuento, 0), subtotal);
    }

    function pintarResumen(items) {
        const subtotal = items.reduce((suma, item) => suma + item.precio * item.cantidad, 0);
        const descuento = calcularDescuento(subtotal);
        subtotalEl.textContent = moneda(subtotal);
        descuentoEl.textContent = '-' + moneda(descuento);
        totalEl.textContent = moneda(subtotal - descuento);
        filaDescuento.hidden = descuento <= 0;
        btnCheckout.disabled = items.length === 0;
        vacio.hidden = items.length > 0;
    }

    function pintar() {
        const items = Carrito.items();
        const fragmento = document.createDocumentFragment();

        items.forEach((item) => {
            const tarjeta = plantilla.content.firstElementChild.cloneNode(true);
            const imagen = tarjeta.querySelector('.item-image-wrapper img');
            const cantidad = tarjeta.querySelector('.qty-input');
            const limite = Number.isFinite(Number(item.stock))
                ? Number(item.stock)
                : 99;

            tarjeta.dataset.id = item.id;
            imagen.src = imagenDe(item);
            imagen.alt = item.nombre || 'Producto del carrito';
            imagen.onerror = () => {
                imagen.onerror = null;
                imagen.src = imagenPredeterminada;
            };
            tarjeta.querySelector('.item-info h3').textContent = item.nombre || 'Producto';
            tarjeta.querySelector('.item-marca').textContent = item.marca || '';
            cantidad.value = String(item.cantidad);
            tarjeta.querySelector('.item-price').textContent = moneda(item.precio * item.cantidad);

            const menos = tarjeta.querySelector('[data-accion="menos"]');
            const mas = tarjeta.querySelector('[data-accion="mas"]');
            menos.disabled = item.cantidad <= 1;
            mas.disabled = item.cantidad >= limite;
            fragmento.appendChild(tarjeta);
        });

        lista.replaceChildren(fragmento);
        pintarResumen(items);
    }

    function fechaHoy() {
        const ahora = new Date();
        const mes = String(ahora.getMonth() + 1).padStart(2, '0');
        const dia = String(ahora.getDate()).padStart(2, '0');
        return ahora.getFullYear() + '-' + mes + '-' + dia;
    }

    btnPromo.addEventListener('click', async () => {
        const codigo = codigoPromo.value.trim();
        if (!codigo) {
            promocionActual = null;
            mostrarMensajePromo('Escribe el código de descuento.', false);
            pintar();
            return;
        }

        btnPromo.disabled = true;
        mostrarMensajePromo('Validando código…', false);
        try {
            const promociones = await Api.get('/api/promociones');
            const hoy = fechaHoy();
            const promo = promociones.find((item) =>
                String(item.codigo_promocion) === codigo &&
                item.estado === 'Activo' &&
                String(item.fecha_inicio).slice(0, 10) <= hoy &&
                String(item.fecha_fin).slice(0, 10) >= hoy
            );

            if (!promo) {
                promocionActual = null;
                mostrarMensajePromo('El código no existe o no está vigente.', false);
                pintar();
                return;
            }

            promocionActual = promo;
            mostrarMensajePromo('Código aplicado correctamente.', true);
            pintar();
        } catch (error) {
            promocionActual = null;
            mostrarMensajePromo('No se pudo validar el código: ' + error.message, false);
            pintar();
        } finally {
            btnPromo.disabled = false;
        }
    });

    codigoPromo.addEventListener('input', () => {
        if (promocionActual && codigoPromo.value.trim() !== String(promocionActual.codigo_promocion)) {
            promocionActual = null;
            mostrarMensajePromo('', false);
            pintar();
        }
    });

    lista.addEventListener('click', (evento) => {
        const boton = evento.target.closest('button[data-accion]');
        if (!boton) return;

        const tarjeta = boton.closest('.cart-item');
        if (!tarjeta) return;
        const id = tarjeta.dataset.id;
        const item = Carrito.items().find((producto) => producto.id === id);
        if (!item) return;

        if (boton.dataset.accion === 'eliminar') {
            Carrito.quitar(id);
        } else if (boton.dataset.accion === 'menos') {
            Carrito.cambiarCantidad(id, item.cantidad - 1);
        } else if (boton.dataset.accion === 'mas') {
            Carrito.cambiarCantidad(id, item.cantidad + 1);
        }
    });

    btnCheckout.addEventListener('click', () => {
        const items = Carrito.items();
        if (items.length === 0) return;
        Carrito.iniciarCompra(
            items,
            promocionActual ? promocionActual.codigo_promocion : null
        );
        location.href = 'formulario-pedido.html';
    });

    document.addEventListener('carrito:cambio', pintar);

    let sincronizandoProductos = false;
    async function retirarProductosNoDisponibles() {
        if (sincronizandoProductos) return;
        sincronizandoProductos = true;
        try {
            if (Carrito.items().length === 0) return;
            const productosDisponibles = await Api.get('/api/productos', {
                vista: 'publica'
            });
            const idsDisponibles = new Set(
                productosDisponibles.map((producto) => String(producto.id))
            );
            const idsNoDisponibles = Carrito.items()
                .filter((producto) => !idsDisponibles.has(String(producto.id)))
                .map((producto) => producto.id);
            if (idsNoDisponibles.length > 0) {
                Carrito.quitarVarios(idsNoDisponibles);
            }
        } catch (error) {
            console.error('No se pudo validar la disponibilidad del carrito:', error);
        } finally {
            sincronizandoProductos = false;
        }
    }

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) void retirarProductosNoDisponibles();
    });
    window.addEventListener('focus', () => {
        void retirarProductosNoDisponibles();
    });
    window.setInterval(() => {
        if (!document.hidden) void retirarProductosNoDisponibles();
    }, 15000);

    void retirarProductosNoDisponibles().finally(pintar);
})();
