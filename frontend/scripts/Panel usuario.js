// panel-usuario.js - Datos del panel del cliente (perfil, compras, citas y recetas).
// Usa Api y BV de api.js. La navegación entre secciones está en panel-navegacion.js.

(function () {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

    // ---------- Quién es el cliente ----------
    // El login guarda el token "session-<id>" en localStorage (clave bv_token, ver api.js).
    // Si el equipo cambia el formato del token, solo hay que tocar esta función.
    function idUsuario() {
        let token = '';
        try { token = localStorage.getItem('bv_token') || ''; } catch (e) { /* sin acceso */ }
        const id = Number(token.replace('session-', ''));
        return Number.isInteger(id) && id > 0 ? id : null;
    }

    const ID = idUsuario();
    if (!ID) {
        window.location.href = 'inicio-sesion.html';
        return;
    }

    // ---------- Ayudas ----------
    // "2026-08-01 10:00:00" -> "01/08/2026" (se corta el texto para evitar problemas de zona horaria)
    function fechaCorta(texto) {
        return texto ? String(texto).slice(0, 10).split('-').reverse().join('/') : '–';
    }

    function hoy() {
        const d = new Date();
        const dos = (n) => String(n).padStart(2, '0');
        return d.getFullYear() + '-' + dos(d.getMonth() + 1) + '-' + dos(d.getDate());
    }

    function clonar(idPlantilla) {
        return $(idPlantilla).content.firstElementChild.cloneNode(true);
    }

    function mensajeVacio(contenedor, texto) {
        contenedor.innerHTML = '<p class="page-subtitle">' + BV.escapar(texto) + '</p>';
    }

    // Valor de una medida de la receta: vacío -> "–"; esfera, cilindro y adición con 2 decimales y signo (+1.25);
    // el eje va en grados, sin signo ni decimales
    function medida(campo, valor) {
        if (valor === null || valor === undefined || valor === '') return '–';
        const n = Number(valor);
        if (Number.isNaN(n)) return String(valor);
        if (campo === 'eje') return n + '°';
        return (n > 0 ? '+' : '') + n.toFixed(2);
    }

    // ---------- Perfil ----------
    let perfil = {};

    function pintarPerfil(p) {
        perfil = p;
        $('profileNombre').value = p.nombre || '';
        $('profileApellido').value = p.apellido || '';
        $('profileTipoDoc').innerHTML = '<option>' + BV.escapar(p.tipo_documento) + '</option>';
        $('profileDocumento').value = p.num_documento || '';
        $('profileTelefono').value = p.telefono || '';
        $('profileCorreo').value = p.correo || '';
        $('profileDireccion').value = p.direccion || '';
        $('profileFechaNacimiento').value = p.fecha_nacimiento || '';
        if ($('profileCiudad')) $('profileCiudad').value = p.ciudad || '';

        const inicial = (p.nombre || '?').charAt(0).toUpperCase();
        $('userName').textContent = p.nombre || '';
        $('userAvatar').textContent = inicial;
        $('profileAvatarLarge').textContent = inicial;
    }

    function avisoPerfil(texto) {
        const aviso = $('mensajePerfil');
        aviso.textContent = texto;
        aviso.hidden = false;
    }

    async function cargarPerfil() {
        try {
            pintarPerfil(await Api.get('/api/perfil/' + ID));
        } catch (e) {
            avisoPerfil(e.message);
        }
    }

    $('formPerfil').addEventListener('submit', async (e) => {
        e.preventDefault();
        $('mensajePerfil').hidden = true;

        const datos = {
            nombre: $('profileNombre').value.trim(),
            apellido: $('profileApellido').value.trim(),
            telefono: $('profileTelefono').value.trim(),
            correo: $('profileCorreo').value.trim(),
            direccion: $('profileDireccion').value.trim(),
            // Si el formulario no tiene el campo ciudad, se conserva la que ya tenía el cliente
            ciudad: $('profileCiudad') ? $('profileCiudad').value.trim() : perfil.ciudad,
            fecha_nacimiento: $('profileFechaNacimiento').value
        };

        if (!datos.nombre || !datos.apellido || !datos.telefono || !datos.correo) {
            avisoPerfil('Nombre, apellido, teléfono y correo son obligatorios.');
            return;
        }

        try {
            const r = await Api.put('/api/perfil/' + ID, datos);
            pintarPerfil(Object.assign({}, perfil, datos));
            avisoPerfil(r.mensaje || 'Perfil actualizado correctamente');
        } catch (err) {
            avisoPerfil(err.message);
        }
    });

    // ---------- Compras ----------
    // venta.estado de la BD: Pendiente / Pagada / Anulada (las clases del CSS son completada / pendiente / anulada)
    const CLASE_VENTA = { Pagada: 'completada', Pendiente: 'pendiente', Anulada: 'anulada' };

    function tarjetaCompra(venta, detalles, pedido) {
        const tarjeta = clonar('tplCompra');
        tarjeta.querySelector('.order-id').textContent = 'Compra #' + venta.codigo_venta;
        tarjeta.querySelector('.order-date').textContent = fechaCorta(venta.fecha);

        const estado = tarjeta.querySelector('.order-status');
        estado.textContent = venta.estado;
        estado.classList.add(CLASE_VENTA[venta.estado] || 'pendiente');

        tarjeta.querySelector('.total-amount').textContent = BV.moneda(venta.total);

        const lista = tarjeta.querySelector('.order-products');
        lista.innerHTML = detalles.length
            ? detalles.map((d) =>
                '<div class="order-product">' +
                '<img src="../imagenes/productos/' + BV.escapar(d.imagen) + '" alt="' + BV.escapar(d.nombre) + '">' +
                '<div class="product-details"><h4>' + BV.escapar(d.nombre) + '</h4>' +
                '<p>Cantidad: ' + d.cantidad + ' · ' + BV.moneda(d.precio_unitario) + ' c/u</p>' +
                '<p class="price">' + BV.moneda(d.subtotal) + '</p></div></div>').join('')
            : '<p class="page-subtitle">Sin detalle de productos.</p>';
        lista.hidden = true;

        // Estado del pedido de lentes en laboratorio (si esta compra tiene uno)
        if (pedido) {
            const lab = document.createElement('p');
            lab.className = 'page-subtitle';
            lab.textContent = 'Lentes: ' + pedido.estado + ' · Fecha prometida: ' + fechaCorta(pedido.fecha_promesa);
            lista.after(lab);
        }

        const boton = tarjeta.querySelector('[data-accion="detalle"]');
        boton.addEventListener('click', () => {
            lista.hidden = !lista.hidden;
            boton.textContent = lista.hidden ? 'Ver detalle' : 'Ocultar detalle';
        });
        return tarjeta;
    }

    async function cargarCompras() {
        const listaCompleta = $('listaCompras');
        const recientes = $('comprasRecientes');
        try {
            const [ventas, pedidos] = await Promise.all([
                Api.get('/api/ventas', { id_cliente: ID }),
                Api.get('/api/pedidos', { id_cliente: ID })
            ]);
            const detalles = await Promise.all(
                ventas.map((v) => Api.get('/api/ventas/' + v.codigo_venta + '/detalles'))
            );

            listaCompleta.innerHTML = '';
            recientes.innerHTML = '';
            ventas.forEach((v, i) => {
                const pedido = pedidos.find((p) => p.id_venta === v.codigo_venta);
                listaCompleta.appendChild(tarjetaCompra(v, detalles[i], pedido));
                if (i < 3) recientes.appendChild(tarjetaCompra(v, detalles[i], pedido));
            });

            if (ventas.length === 0) {
                mensajeVacio(listaCompleta, 'Aún no tienes compras.');
                mensajeVacio(recientes, 'Aún no tienes compras.');
            }
            $('totalCompras').textContent = ventas.filter((v) => v.estado === 'Pagada').length;
        } catch (e) {
            mensajeVacio(listaCompleta, e.message);
            mensajeVacio(recientes, e.message);
        }
    }

    // ---------- Citas ----------
    // cita.estado de la BD: Programada / Confirmada / Completada / Cancelada / No asistio
    const CLASE_CITA = {
        'Programada': 'programada', 'Confirmada': 'confirmada', 'Completada': 'completada',
        'Cancelada': 'cancelada', 'No asistio': 'no-asistio'
    };

    function tarjetaCita(cita) {
        const tarjeta = clonar('tplCita');
        const [anio, mes, dia] = cita.fecha_hora.slice(0, 10).split('-');

        tarjeta.querySelector('.date-day').textContent = dia;
        tarjeta.querySelector('.date-month').textContent = MESES[Number(mes) - 1];
        tarjeta.querySelector('.date-year').textContent = anio;
        tarjeta.querySelector('h4').textContent = cita.motivo;
        tarjeta.querySelector('.cita-hora span').textContent = cita.fecha_hora.slice(11, 16);
        tarjeta.querySelector('.cita-atiende span').textContent = cita.atiende || 'Por asignar';

        const estado = tarjeta.querySelector('.appointment-status');
        estado.textContent = cita.estado;
        estado.classList.add(CLASE_CITA[cita.estado] || 'programada');

        const activa = (cita.estado === 'Programada' || cita.estado === 'Confirmada') &&
            cita.fecha_hora.slice(0, 10) >= hoy();
        const boton = tarjeta.querySelector('[data-accion="cancelar"]');

        if (activa) {
            boton.addEventListener('click', async () => {
                if (!window.confirm('¿Seguro que quieres cancelar esta cita?')) return;
                boton.disabled = true;
                try {
                    await Api.put('/api/citas/' + cita.id_cita, { estado: 'Cancelada' });
                    cargarCitas();
                } catch (e) {
                    window.alert(e.message);
                    boton.disabled = false;
                }
            });
        } else {
            boton.remove();
            tarjeta.classList.add('inactiva');
        }
        return tarjeta;
    }

    async function cargarCitas() {
        const lista = $('listaCitas');
        try {
            const citas = await Api.get('/api/citas', { id_cliente: ID });
            lista.innerHTML = '';
            citas.forEach((c) => lista.appendChild(tarjetaCita(c)));
            if (citas.length === 0) mensajeVacio(lista, 'Aún no tienes citas.');

            // Próxima cita: la activa más cercana desde hoy
            const proximas = citas
                .filter((c) => (c.estado === 'Programada' || c.estado === 'Confirmada') && c.fecha_hora.slice(0, 10) >= hoy())
                .sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora));
            $('proximaCita').textContent = proximas.length
                ? Number(proximas[0].fecha_hora.slice(8, 10)) + ' ' + MESES[Number(proximas[0].fecha_hora.slice(5, 7)) - 1]
                : 'Ninguna';
        } catch (e) {
            mensajeVacio(lista, e.message);
        }
    }

    // ---------- Recetas (historial de fórmulas) ----------
    function tarjetaReceta(r) {
        const tarjeta = clonar('tplReceta');
        const vigente = r.fecha_vencimiento >= hoy();

        tarjeta.querySelector('h4').textContent = 'Fórmula #' + r.id_receta + ' · ' + r.tipo_receta;
        tarjeta.querySelector('.rec-emision').textContent = 'Emitida: ' + fechaCorta(r.fecha_emision);
        tarjeta.querySelector('.rec-vence').textContent = 'Vence: ' + fechaCorta(r.fecha_vencimiento);

        const estado = tarjeta.querySelector('.prescription-status');
        estado.textContent = vigente ? 'Vigente' : 'Vencida';
        estado.classList.add(vigente ? 'vigente' : 'vencida');

        ['od', 'oi'].forEach((ojo) => {
            ['esfera', 'cilindro', 'eje', 'adicion'].forEach((campo) => {
                tarjeta.querySelector('[data-ojo="' + ojo + '"] [data-campo="' + campo + '"]').textContent =
                    medida(campo, r[ojo + '_' + campo]);
            });
        });

        const extras = [];
        if (r.diagnostico) extras.push('Diagnóstico: ' + r.diagnostico);
        if (r.distancia_pupilar) extras.push('Distancia pupilar: ' + r.distancia_pupilar + ' mm');
        if (r.nombre_optometra_externo) extras.push('Optómetra: ' + r.nombre_optometra_externo);
        if (r.entidad_examinadora) extras.push('Entidad: ' + r.entidad_examinadora);
        if (r.observaciones) extras.push('Observaciones: ' + r.observaciones);
        tarjeta.querySelector('.rec-extra').textContent = extras.join(' · ');

        return tarjeta;
    }

    async function cargarRecetas() {
        const lista = $('listaRecetas');
        try {
            const recetas = await Api.get('/api/recetas', { id_cliente: ID });
            lista.innerHTML = '';
            recetas.forEach((r) => lista.appendChild(tarjetaReceta(r)));
            if (recetas.length === 0) mensajeVacio(lista, 'Aún no tienes fórmulas registradas.');
            $('recetasActivas').textContent = recetas.filter((r) => r.fecha_vencimiento >= hoy()).length;
        } catch (e) {
            mensajeVacio(lista, e.message);
        }
    }

    // ---------- Arranque ----------
    cargarPerfil();
    cargarCompras();
    cargarCitas();
    cargarRecetas();
})();