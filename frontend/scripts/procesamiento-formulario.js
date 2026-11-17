

document.addEventListener('DOMContentLoaded', function () {
    // Comprar exige cuenta. Sesion.irALogin() recuerda esta página para volver después.
    if (!Sesion.estaLogueado()) {
        Sesion.irALogin();
        return;
    }

    const compra = Carrito.compraActual();
    if (!compra || !compra.items || compra.items.length === 0) {
        location.replace('catalogo.html');
        return;
    }

    const form = document.getElementById('purchaseForm');
    const confirmation = document.getElementById('confirmation');
    const tieneFormulaRadios = document.getElementsByName('tieneFormula');
    const prescriptionBlock = document.getElementById('prescriptionBlock');
    const formulaFile = document.getElementById('formulaFile');
    const formulaFileName = document.getElementById('formulaFileName');
    const botonEnviar = form.querySelector('.submit-btn');

    // ---------- Resumen del pedido (antes estaba fijo en el HTML) ----------
    const items = compra.items;
    const idProductoOrigen = items[0] && items[0].id;
    const urlVolver = idProductoOrigen
        ? 'visualizador-producto.html?id=' + encodeURIComponent(idProductoOrigen)
        : 'catalogo.html';
    document.querySelectorAll('[data-return-to-product]').forEach((link) => {
        link.href = urlVolver;
    });

    const total = items.reduce((suma, i) => suma + i.precio * i.cantidad, 0);
    const unico = items.length === 1;
    const nombresModelo = items.map((i) => i.nombre).join(', ');

    function poner(id, texto) {
        const el = document.getElementById(id);
        if (el) el.textContent = texto;
    }

    poner('summaryName', unico ? items[0].nombre : items.length + ' productos');
    poner('summaryCollection', unico ? items[0].marca : '');
    poner('summaryWatermark', unico ? items[0].marca : '');
    poner('summaryDesc', items.map((i) => i.cantidad + ' × ' + i.nombre).join(' · '));
    poner('summaryPrice', BV.moneda(total) + ' COP');

    const imagen = document.getElementById('summaryImage');
    if (imagen && items[0].imagen) {
        imagen.src = items[0].imagen;
    }

    // ---------- Fórmula óptica ----------
    tieneFormulaRadios.forEach((radio) => {
        radio.addEventListener('change', function () {
            prescriptionBlock.style.display = this.value === 'no' ? 'none' : 'block';
        });
    });

    formulaFile.addEventListener('change', function () {
        formulaFileName.textContent = (this.files && this.files.length > 0)
            ? this.files[0].name
            : 'Ningún archivo seleccionado';
    });

    // ---------- Envío ----------
    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const nombre = new FormData(form).get('nombre');
        const textoBoton = botonEnviar.innerHTML;
        botonEnviar.disabled = true;

        try {
            const usuario = Sesion.usuario();
            if (!usuario || !usuario.id) {
                Sesion.irALogin();
                return;
            }

            const datos = new FormData(form);
            const observaciones = [
                'Pedido web',
                'Nombre: ' + datos.get('nombre'),
                'Documento: ' + datos.get('documento'),
                'Correo: ' + datos.get('correo'),
                'Teléfono: ' + datos.get('telefono'),
                'Dirección: ' + datos.get('direccion'),
                'Ciudad: ' + datos.get('ciudad'),
                'Departamento: ' + datos.get('departamento'),
                'Indicaciones: ' + (datos.get('indicaciones') || 'Ninguna'),
                'Fórmula: ' + (datos.get('tieneFormula') === 'si' ? 'Sí' : 'No, requiere asesoría'),
                'Pago preferido: ' + datos.get('pago')
            ].join(' | ');

            // El servidor valida precio y existencias; recibe el identificador de producto de la API.
            const respuesta = await Api.post('/api/ventas', {
                id_cliente: usuario.id,
                canal: 'Web',
                codigo_promocion: compra.codigoPromo,
                observaciones,
                items: items.map((i) => ({ id_producto: i.id, cantidad: i.cantidad }))
            });

            document.getElementById('confirmName').textContent = nombre;
            document.getElementById('confirmModel').textContent = nombresModelo;
            document.getElementById('confirmOrderId').textContent = '#' + respuesta.codigo_venta;

            Carrito.quitarVarios(items.map((i) => i.id));
            Carrito.terminarCompra();

            form.style.display = 'none';
            confirmation.hidden = false;
        } catch (error) {
            alert(error.message);
            botonEnviar.disabled = false;
            botonEnviar.innerHTML = textoBoton;
        }
    });
});