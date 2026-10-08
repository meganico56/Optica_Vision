// catalogo.js - Catálogo que consume GET /api/productos.
// Requiere api.js, sesion.js y carrito.js cargados antes.
// El menú hamburguesa de la barra lo maneja el CSS (checkbox #menu-toggle), aquí no hace falta JS.

(function () {
    'use strict';

    // Ruta de las imágenes respecto a /paginas/ (la BD solo guarda el nombre del archivo).
    const RUTA_IMAGENES = '../imagenes/productos/';

    const lista = document.getElementById('listaProductos');
    const estado = document.getElementById('estadoLista');
    const resumen = document.getElementById('resumenBusqueda');
    const filtros = document.getElementById('filtros');
    const plantilla = document.getElementById('tplProducto');

    const busqueda = (new URLSearchParams(location.search).get('q') || '').trim();
    const productosPorId = new Map();
    let filtroActual = 'todos';
    let ultimaPeticion = 0;

    function aItemCarrito(p) {
        return {
            id: p.id,
            nombre: p.nombre,
            marca: p.marca,
            precio: p.precio,
            imagen: RUTA_IMAGENES + p.imagen,
            stock: p.stock
        };
    }

    function mostrarEstado(texto) {
        estado.textContent = texto;
        estado.hidden = false;
    }

    function pintar(productos) {
        lista.innerHTML = '';
        productosPorId.clear();

        if (productos.length === 0) {
            mostrarEstado(busqueda ? 'No encontramos productos para tu búsqueda.' : 'No hay productos en esta categoría.');
            return;
        }
        estado.hidden = true;

        const fragmento = document.createDocumentFragment();
        productos.forEach((p) => {
            productosPorId.set(String(p.id), p);

            const tarjeta = plantilla.content.firstElementChild.cloneNode(true);
            tarjeta.dataset.id = p.id;

            const url = 'visualizador-producto.html?id=' + encodeURIComponent(p.id);
            tarjeta.querySelectorAll('.enlace-producto').forEach((a) => { a.href = url; });

            const img = tarjeta.querySelector('.img-producto');
            img.src = RUTA_IMAGENES + p.imagen;
            img.alt = p.nombre;

            tarjeta.querySelector('.nombre-producto').textContent = p.nombre;
            tarjeta.querySelector('.precio').textContent = BV.moneda(p.precio);

            const agotado = p.stock <= 0;
            tarjeta.querySelector('.badge-agotado').hidden = !agotado;
            tarjeta.querySelectorAll('button[data-accion]').forEach((b) => { b.disabled = agotado; });

            fragmento.appendChild(tarjeta);
        });
        lista.appendChild(fragmento);
    }

    async function cargar() {
        const peticion = ++ultimaPeticion;
        const params = { q: busqueda };

        // "genero:Mujer" / "categoria:Accesorios" -> ?genero=Mujer / ?categoria=Accesorios
        if (filtroActual !== 'todos') {
            const [campo, valor] = filtroActual.split(':');
            params[campo] = valor;
        }

        lista.innerHTML = '';
        mostrarEstado('Cargando productos…');

        try {
            const productos = await Api.get('/api/productos', params);
            if (peticion !== ultimaPeticion) return; // llegó una respuesta más nueva
            pintar(productos);
        } catch (error) {
            if (peticion !== ultimaPeticion) return;
            mostrarEstado('No se pudieron cargar los productos. ' + error.message);
        }
    }

    // Filtros
    filtros.addEventListener('click', (e) => {
        const enlace = e.target.closest('a[data-filtro]');
        if (!enlace) return;
        e.preventDefault();

        filtros.querySelectorAll('a').forEach((a) => a.classList.remove('activo'));
        enlace.classList.add('activo');
        filtroActual = enlace.dataset.filtro;
        cargar();
    });

    // Botones de cada tarjeta
    lista.addEventListener('click', (e) => {
        const boton = e.target.closest('button[data-accion]');
        if (!boton) return;

        const producto = productosPorId.get(boton.closest('.producto-card').dataset.id);
        if (!producto) return;

        const item = aItemCarrito(producto);

        if (boton.dataset.accion === 'agregar') {
            const resultado = Carrito.agregar(item, 1);
            if (!resultado.ok) alert(resultado.mensaje);
        } else if (boton.dataset.accion === 'comprar') {
            // formulario-pedido.html pide iniciar sesión si hace falta y vuelve a esa página.
            Carrito.iniciarCompra([Object.assign({}, item, { cantidad: 1 })]);
            location.href = 'formulario-pedido.html';
        }
    });

    if (busqueda) {
        resumen.textContent = 'Resultados para “' + busqueda + '”';
        resumen.hidden = false;
    }

    cargar();
})();