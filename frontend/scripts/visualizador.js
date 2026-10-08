// visualizador.js — Consume GET /api/productos/:id para el visualizador de producto.
// Requiere api.js, sesion.js y carrito.js cargados antes.

(function () {
    'use strict';

    const RUTA_IMAGENES = '../imagenes/productos/';

    const estado = document.getElementById('estadoProducto');
    const noEncontrado = document.getElementById('productoNoEncontrado');
    const vista = document.getElementById('vistaProducto');

    const bcCategoria = document.getElementById('bcCategoria');
    const bcProducto = document.getElementById('bcProducto');

    const mainImage = document.getElementById('mainImage');
    const marca = document.getElementById('marca');
    const nombreProducto = document.getElementById('nombreProducto');
    const precio = document.getElementById('precio');
    const descripcion = document.getElementById('descripcion');
    const material = document.getElementById('material');
    const genero = document.getElementById('genero');
    const categoria = document.getElementById('categoria');
    const disponibilidad = document.getElementById('disponibilidad');

    const qtyInput = document.getElementById('qtyInput');
    const minusBtn = document.getElementById('minusBtn');
    const plusBtn = document.getElementById('plusBtn');

    const addToCartBtn = document.getElementById('addToCartBtn');
    const buyNowBtn = document.getElementById('buyNowBtn');

    const idProducto = new URLSearchParams(location.search).get('id');
    let productoActual = null;
    let cargado = false;

    function mostrarError() {
        if (estado) estado.hidden = true;
        if (vista) vista.hidden = true;
        if (noEncontrado) noEncontrado.hidden = false;
    }

    function aItemCarrito(p) {
        return {
            id: p.id,
            nombre: p.nombre,
            marca: p.marca,
            precio: p.precio,
            imagen: RUTA_IMAGENES + (p.imagen || 'montura-clasica-negro.png'),
            stock: p.stock
        };
    }

    async function cargarProducto() {
        if (cargado) return;
        if (!idProducto) {
            mostrarError();
            return;
        }

        try {
            const producto = await Api.get('/api/productos/' + encodeURIComponent(idProducto));
            productoActual = producto;
            cargado = true;

            if (estado) estado.hidden = true;
            if (noEncontrado) noEncontrado.hidden = true;
            if (vista) vista.hidden = false;

            // Rellenar datos en la interfaz
            if (bcCategoria) bcCategoria.textContent = producto.categoria || 'Catálogo';
            if (bcProducto) bcProducto.textContent = producto.nombre || 'Producto';

            if (mainImage) {
                mainImage.src = RUTA_IMAGENES + (producto.imagen || 'montura-clasica-negro.png');
                mainImage.alt = producto.nombre || '';
            }

            if (marca) marca.textContent = producto.marca || 'Óptica Visión';
            if (nombreProducto) nombreProducto.textContent = producto.nombre || '';
            if (precio) precio.textContent = (window.BV && window.BV.moneda) ? window.BV.moneda(producto.precio) : ('$' + producto.precio);
            if (descripcion) descripcion.textContent = producto.descripcion || 'Sin descripción disponible.';
            if (material) material.textContent = producto.material || 'N/A';
            if (genero) genero.textContent = producto.genero || 'Unisex';
            if (categoria) categoria.textContent = producto.categoria || 'Gafas';

            const stock = Number(producto.stock || producto.existencia_actual || 0);
            if (disponibilidad) {
                if (stock > 0) {
                    disponibilidad.textContent = `En stock (${stock} disponible${stock > 1 ? 's' : ''})`;
                    disponibilidad.style.color = '#2ecc71';
                } else {
                    disponibilidad.textContent = 'Agotado';
                    disponibilidad.style.color = '#e74c3c';
                }
            }

            if (qtyInput) {
                qtyInput.max = stock > 0 ? stock : 1;
                qtyInput.value = stock > 0 ? 1 : 0;
                qtyInput.disabled = stock <= 0;
            }

            if (addToCartBtn) addToCartBtn.disabled = stock <= 0;
            if (buyNowBtn) buyNowBtn.disabled = stock <= 0;

        } catch (error) {
            console.error('Error al cargar producto:', error);
            mostrarError();
        }
    }

    // Controles de cantidad
    if (minusBtn && qtyInput) {
        minusBtn.addEventListener('click', () => {
            let val = parseInt(qtyInput.value, 10) || 1;
            if (val > 1) qtyInput.value = val - 1;
        });
    }

    if (plusBtn && qtyInput) {
        plusBtn.addEventListener('click', () => {
            let val = parseInt(qtyInput.value, 10) || 1;
            let max = parseInt(qtyInput.max, 10) || 99;
            if (val < max) qtyInput.value = val + 1;
        });
    }

    // Botón Agregar al Carrito
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', () => {
            if (!productoActual) return;
            const cant = parseInt(qtyInput ? qtyInput.value : 1, 10) || 1;
            const item = aItemCarrito(productoActual);
            if (window.Carrito) {
                const res = window.Carrito.agregar(item, cant);
                if (!res.ok) alert(res.mensaje);
            }
        });
    }

    // Botón Comprar Ahora
    if (buyNowBtn) {
        buyNowBtn.addEventListener('click', () => {
            if (!productoActual) return;
            const cant = parseInt(qtyInput ? qtyInput.value : 1, 10) || 1;
            const item = aItemCarrito(productoActual);
            if (window.Carrito) {
                window.Carrito.iniciarCompra([Object.assign({}, item, { cantidad: cant })]);
                location.href = 'formulario-pedido.html';
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', cargarProducto);
    } else {
        cargarProducto();
    }
})();
