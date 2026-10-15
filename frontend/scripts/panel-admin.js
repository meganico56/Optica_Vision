// panel-admin.js - Lógica del Panel de Administrador: Usuarios, Productos, Categorías, Marcas y Dashboard.
// Requiere api.js, sesion.js y panel-navegacion.js cargados antes.

(function () {
    'use strict';

    const RUTA_IMAGENES = '../imagenes/productos/';

    // Referencias DOM
    const tbProductos = document.getElementById('tbProductos');
    const tbMarcas = document.getElementById('tbMarcas');
    const tbCategorias = document.getElementById('tbCategorias');
    const tbUsuarios = document.getElementById('tbUsuarios');
    const listaProveedores = document.getElementById('listaProveedores');
    const tbVentas = document.getElementById('tbVentas');
    const tbDevoluciones = document.getElementById('tbDevoluciones');
    const tbCompras = document.getElementById('tbCompras');
    const tbCitas = document.getElementById('tbCitas');
    const tbRecetas = document.getElementById('tbRecetas');
    const gridPromos = document.getElementById('gridPromos');
    const gridReportes = document.getElementById('gridReportes');

    const kpiIngresos = document.getElementById('kpiIngresos');
    const kpiVentas = document.getElementById('kpiVentas');
    const kpiCitas = document.getElementById('kpiCitas');
    const kpiClientes = document.getElementById('kpiClientes');
    const kpiBajoMinimo = document.getElementById('kpiBajoMinimo');
    const kpiProductos = document.getElementById('kpiProductos');
    const kpiBajoMinimo2 = document.getElementById('kpiBajoMinimo2');
    const kpiCategorias = document.getElementById('kpiCategorias');
    const kpiTotalIngresos = document.getElementById('kpiTotalIngresos');
    const kpiVentasCompletadas = document.getElementById('kpiVentasCompletadas');
    const kpiCotizaciones = document.getElementById('kpiCotizaciones');
    const kpiDevoluciones = document.getElementById('kpiDevoluciones');
    const kpiRecetas = document.getElementById('kpiRecetas');

    const modal = document.getElementById('modal');
    const formModal = document.getElementById('formModal');
    const modalTitulo = document.getElementById('modalTitulo');
    const modalCampos = document.getElementById('modalCampos');
    const modalError = document.getElementById('modalError');
    const modalCancelar = document.getElementById('modalCancelar');
    const modalGuardar = document.getElementById('modalGuardar');

    let productosMemoria = [];
    let marcasMemoria = [];
    let categoriasMemoria = [];
    let usuariosMemoria = [];
    let proveedoresMemoria = [];
    let rolesMemoria = [];
    let editandoId = null;
    let tipoModal = null; // 'producto', 'marca', 'categoria', 'usuario'
    let nuevaImagenBase64 = null;
    let nombreNuevaImagen = null;
    let tabActual = 'productos';

    const IMAGENES_DISPONIBLES = [
        'gafas-modelo1.png',
        'gafas-modelo2.png',
        'gafas-modelo3.png',
        'gafas-modelo4.png',
        'gafas-modelo-antiguo.png'
    ];

    // Cargar Lista de Productos
    async function cargarProductos() {
        if (!tbProductos) return;
        try {
            const productos = await Api.get('/api/productos');
            productosMemoria = productos;

            let bajoMinimoCount = 0;
            tbProductos.innerHTML = '';

            if (productos.length === 0) {
                tbProductos.innerHTML = '<tr><td colspan="9" style="text-align:center;">No hay productos registrados.</td></tr>';
            } else {
                productos.forEach((p) => {
                    const esBajoMin = (p.existencia_actual || p.stock || 0) <= (p.existencia_minima || 5);
                    if (esBajoMin) bajoMinimoCount++;

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>#${p.id}</td>
                        <td style="display:flex;align-items:center;gap:10px;">
                            <img src="${RUTA_IMAGENES + (p.imagen || 'gafas-modelo1.png')}" alt="${BV.escapar(p.nombre)}" style="width:42px;height:42px;object-fit:contain;border-radius:6px;background:rgba(255,255,255,0.05);padding:2px;border:1px solid var(--border-color);">
                            <strong>${BV.escapar(p.nombre)}</strong>
                        </td>
                        <td><span class="badge blue">${BV.escapar(p.categoria || 'Gafas')}</span></td>
                        <td>${BV.escapar(p.marca || 'Óptica Visión')}</td>
                        <td><strong>${BV.moneda(p.precio)}</strong></td>
                        <td><span class="badge ${esBajoMin ? 'orange' : 'green'}">${p.stock || p.existencia_actual || 0}</span></td>
                        <td>${p.existencia_minima || 5}</td>
                        <td><span class="badge ${p.estado === 'Activo' ? 'green' : 'red'}">${p.estado || 'Activo'}</span></td>
                        <td>
                            <div style="display:flex;gap:6px;">
                                <button type="button" class="btn-ghost" data-editar-prod="${p.id}" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
                                <button type="button" class="btn-ghost" data-eliminar-prod="${p.id}" title="Eliminar" style="color:var(--red);"><i class="fa-solid fa-trash"></i></button>
                            </div>
                        </td>
                    `;
                    tbProductos.appendChild(tr);
                });
            }

            // Actualizar KPIs
            if (kpiProductos) kpiProductos.textContent = productos.length;
            if (kpiBajoMinimo) kpiBajoMinimo.textContent = bajoMinimoCount;
            if (kpiBajoMinimo2) kpiBajoMinimo2.textContent = bajoMinimoCount;

        } catch (error) {
            console.error('Error al cargar productos en panel admin:', error);
            if (tbProductos) {
                tbProductos.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--red);">Error al cargar productos del servidor.</td></tr>';
            }
        }
    }

    // Cargar Lista de Marcas
    async function cargarMarcas() {
        if (!tbMarcas) return;
        try {
            const marcas = await Api.get('/api/marcas');
            marcasMemoria = marcas;
            tbMarcas.innerHTML = '';

            if (marcas.length === 0) {
                tbMarcas.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay marcas registradas.</td></tr>';
            } else {
                marcas.forEach((m) => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>#${m.id_marca}</td>
                        <td><strong>${BV.escapar(m.nombre)}</strong></td>
                        <td>${BV.escapar(m.pais_origen || 'No especificado')}</td>
                        <td><span class="badge ${m.estado === 'Activo' ? 'green' : 'red'}">${m.estado || 'Activo'}</span></td>
                        <td>
                            <div style="display:flex;gap:6px;">
                                <button type="button" class="btn-ghost" data-editar-marca="${m.id_marca}" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
                                <button type="button" class="btn-ghost" data-eliminar-marca="${m.id_marca}" title="Eliminar" style="color:var(--red);"><i class="fa-solid fa-trash"></i></button>
                            </div>
                        </td>
                    `;
                    tbMarcas.appendChild(tr);
                });
            }
        } catch (error) {
            console.error('Error al cargar marcas:', error);
            if (tbMarcas) {
                tbMarcas.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--red);">Error al cargar marcas.</td></tr>';
            }
        }
    }

    // Cargar Lista de Categorías
    async function cargarCategorias() {
        if (!tbCategorias) return;
        try {
            const categorias = await Api.get('/api/categorias');
            categoriasMemoria = categorias;
            tbCategorias.innerHTML = '';

            if (categorias.length === 0) {
                tbCategorias.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay categorías registradas.</td></tr>';
            } else {
                categorias.forEach((c) => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>#${c.id_categoria}</td>
                        <td><strong>${BV.escapar(c.nombre)}</strong></td>
                        <td>${BV.escapar(c.descripcion || 'Sin descripción')}</td>
                        <td><span class="badge ${c.estado === 'Activo' ? 'green' : 'red'}">${c.estado || 'Activo'}</span></td>
                        <td>
                            <div style="display:flex;gap:6px;">
                                <button type="button" class="btn-ghost" data-editar-cat="${c.id_categoria}" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
                                <button type="button" class="btn-ghost" data-eliminar-cat="${c.id_categoria}" title="Eliminar" style="color:var(--red);"><i class="fa-solid fa-trash"></i></button>
                            </div>
                        </td>
                    `;
                    tbCategorias.appendChild(tr);
                });
            }

            if (kpiCategorias) {
                const activas = categorias.filter(c => c.estado === 'Activo').length;
                kpiCategorias.textContent = activas;
            }
        } catch (error) {
            console.error('Error al cargar categorías:', error);
            if (tbCategorias) {
                tbCategorias.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--red);">Error al cargar categorías.</td></tr>';
            }
        }
    }

    const CLASE_ROL = { Administrador: 'admin', Vendedor: 'vendedor', Cliente: 'cliente' };

    // Cargar Lista de Usuarios
    async function cargarUsuarios() {
        try {
            const usuarios = await Api.get('/api/usuarios');
            // Ordenar del más reciente al más antiguo (ID descendente)
            usuarios.sort((a, b) => (b.id_usuario || 0) - (a.id_usuario || 0));
            usuariosMemoria = usuarios;

            if (kpiClientes) {
                kpiClientes.textContent = usuarios.filter(u => u.rol === 'Cliente').length;
            }

            if (!tbUsuarios) return;
            tbUsuarios.innerHTML = '';

            if (usuarios.length === 0) {
                tbUsuarios.innerHTML = '<tr><td colspan="8" style="text-align:center;">No hay usuarios registrados.</td></tr>';
                return;
            }

            usuarios.forEach((u) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>#${u.id_usuario}</td>
                    <td><strong>${BV.escapar(u.nombre)} ${BV.escapar(u.apellido)}</strong></td>
                    <td>${BV.escapar(u.tipo_documento)} ${BV.escapar(u.num_documento)}</td>
                    <td>${BV.escapar(u.telefono)}</td>
                    <td>${BV.escapar(u.correo || '—')}</td>
                    <td><span class="role-badge ${CLASE_ROL[u.rol] || ''}">${BV.escapar(u.rol || 'Sin rol')}</span></td>
                    <td><span class="badge ${u.estado === 'Activo' ? 'green' : 'red'}">${BV.escapar(u.estado)}</span></td>
                    <td>
                        <div style="display:flex;gap:6px;">
                            <button type="button" class="btn-ghost" data-editar-usuario="${u.id_usuario}" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
                            <button type="button" class="btn-ghost" data-eliminar-usuario="${u.id_usuario}" title="Eliminar" style="color:var(--red);"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                `;
                tbUsuarios.appendChild(tr);
            });
        } catch (error) {
            console.error('Error al cargar usuarios:', error);
            if (tbUsuarios) {
                tbUsuarios.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--red);">Error al cargar usuarios del servidor.</td></tr>';
            }
        }
    }

    async function cargarRoles() {
        if (!tbUsuarios) return;
        try {
            rolesMemoria = await Api.get('/api/roles');
        } catch (error) {
            console.error('Error al cargar roles:', error);
        }
    }

    // Cargar Lista de Proveedores
    async function cargarProveedores() {
        if (!listaProveedores) return;
        try {
            const proveedores = await Api.get('/api/proveedores');
            proveedoresMemoria = proveedores;
            listaProveedores.innerHTML = '';

            if (proveedores.length === 0) {
                listaProveedores.innerHTML = '<li style="text-align:center;color:var(--admin-text-muted);padding:15px;">No hay proveedores registrados.</li>';
                return;
            }

            proveedores.forEach((prov) => {
                const li = document.createElement('li');
                li.className = 'proveedor-item';
                const iniciales = (prov.nombre || 'PR').substring(0, 2).toUpperCase();
                li.innerHTML = `
                    <div class="proveedor-avatar">${BV.escapar(iniciales)}</div>
                    <div class="proveedor-info" style="flex:1;">
                        <h4>${BV.escapar(prov.nombre)}</h4>
                        <p><i class="fa-solid fa-id-card"></i> <strong>NIT:</strong> ${BV.escapar(prov.nit)}</p>
                        <p><i class="fa-solid fa-phone"></i> ${BV.escapar(prov.telefono)} | <i class="fa-solid fa-envelope"></i> <a href="mailto:${BV.escapar(prov.correo)}">${BV.escapar(prov.correo)}</a></p>
                        ${prov.direccion ? `<p><i class="fa-solid fa-location-dot"></i> ${BV.escapar(prov.direccion)}</p>` : ''}
                        <p><span class="badge ${prov.estado === 'Activo' ? 'green' : 'red'}">${BV.escapar(prov.estado || 'Activo')}</span></p>
                    </div>
                    <div style="display:flex;gap:6px;align-items:center;">
                        <button type="button" class="btn-ghost" data-editar-prov="${prov.codigo_proveedor}" title="Editar proveedor"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button type="button" class="btn-ghost" data-eliminar-prov="${prov.codigo_proveedor}" title="Eliminar proveedor" style="color:var(--red);"><i class="fa-solid fa-trash"></i></button>
                    </div>
                `;
                listaProveedores.appendChild(li);
            });
        } catch (error) {
            console.error('Error al cargar proveedores:', error);
            if (listaProveedores) {
                listaProveedores.innerHTML = '<li style="text-align:center;color:var(--red);padding:15px;">Error al cargar proveedores del servidor.</li>';
            }
        }
    }

    // Abrir Modal de Proveedor (Nuevo o Editar)
    function abrirModalProveedor(proveedor = null) {
        tipoModal = 'proveedor';
        editandoId = proveedor ? proveedor.codigo_proveedor : null;

        if (modalTitulo) {
            modalTitulo.innerHTML = proveedor
                ? `<i class="fa-solid fa-building-circle-check"></i> <span>Editar proveedor #${proveedor.codigo_proveedor}</span>`
                : `<i class="fa-solid fa-building"></i> <span>Nuevo proveedor</span>`;
        }
        if (modalError) modalError.hidden = true;

        const p = proveedor || {};

        modalCampos.innerHTML = `
            <div class="form-section-group">
                <div class="form-section-title">
                    <i class="fa-solid fa-building"></i> Información de la empresa
                </div>
                <div class="form-grid-2">
                    <div class="form-field">
                        <label for="mProvNombre">Nombre / Razón Social <span class="req">*</span></label>
                        <div class="input-icon-wrapper">
                            <i class="fa-solid fa-building prefix-icon"></i>
                            <input type="text" id="mProvNombre" class="input-admin" placeholder="Ej. Ópticas Unidas S.A.S." value="${BV.escapar(p.nombre || '')}" required>
                        </div>
                    </div>
                    <div class="form-field">
                        <label for="mProvNit">NIT <span class="req">*</span></label>
                        <div class="input-icon-wrapper">
                            <i class="fa-solid fa-id-card prefix-icon"></i>
                            <input type="text" id="mProvNit" class="input-admin" placeholder="Ej. 900123456-1" value="${BV.escapar(p.nit || '')}" required>
                        </div>
                    </div>
                </div>
                <div class="form-grid-2">
                    <div class="form-field">
                        <label for="mProvTelefono">Teléfono <span class="req">*</span></label>
                        <div class="input-icon-wrapper">
                            <i class="fa-solid fa-phone prefix-icon"></i>
                            <input type="tel" id="mProvTelefono" class="input-admin" placeholder="Ej. 6012345678" value="${BV.escapar(p.telefono || '')}" required>
                        </div>
                    </div>
                    <div class="form-field">
                        <label for="mProvCorreo">Correo electrónico <span class="req">*</span></label>
                        <div class="input-icon-wrapper">
                            <i class="fa-solid fa-envelope prefix-icon"></i>
                            <input type="email" id="mProvCorreo" class="input-admin" placeholder="proveedor@empresa.com" value="${BV.escapar(p.correo || '')}" required>
                        </div>
                    </div>
                </div>
                <div class="form-grid-2">
                    <div class="form-field">
                        <label for="mProvDireccion">Dirección</label>
                        <div class="input-icon-wrapper">
                            <i class="fa-solid fa-location-dot prefix-icon"></i>
                            <input type="text" id="mProvDireccion" class="input-admin" placeholder="Ej. Cra 15 #93-42, Bogotá" value="${BV.escapar(p.direccion || '')}">
                        </div>
                    </div>
                    <div class="form-field">
                        <label for="mProvEstado">Estado</label>
                        <div class="input-icon-wrapper">
                            <i class="fa-solid fa-toggle-on prefix-icon"></i>
                            <select id="mProvEstado" class="input-admin">
                                <option value="Activo" ${p.estado !== 'Inactivo' ? 'selected' : ''}>Activo</option>
                                <option value="Inactivo" ${p.estado === 'Inactivo' ? 'selected' : ''}>Inactivo</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (modalGuardar) modalGuardar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar proveedor';

        if (typeof modal.showModal === 'function') modal.showModal();
        else modal.setAttribute('open', '');
    }

    // Abrir Modal de Usuario (Nuevo o Editar)
    function abrirModalUsuario(usuario = null) {
        tipoModal = 'usuario';
        editandoId = usuario ? usuario.id_usuario : null;

        if (modalTitulo) {
            modalTitulo.innerHTML = usuario
                ? `<i class="fa-solid fa-user-pen"></i> <span>Editar usuario #${usuario.id_usuario}</span>`
                : `<i class="fa-solid fa-user-plus"></i> <span>Nuevo usuario</span>`;
        }
        if (modalError) modalError.hidden = true;

        const u = usuario || {};
        const roles = rolesMemoria.length > 0 ? rolesMemoria : [
            { id_rol: 1, nombre_rol: 'Administrador' },
            { id_rol: 2, nombre_rol: 'Vendedor' },
            { id_rol: 3, nombre_rol: 'Cliente' }
        ];
        const rolSeleccionado = u.id_rol || (roles.find(r => r.nombre_rol === 'Cliente') || roles[0]).id_rol;
        const fechaNac = u.fecha_nacimiento ? String(u.fecha_nacimiento).slice(0, 10) : '';

        modalCampos.innerHTML = `
            <div class="form-section-group">
                <div class="form-section-title">
                    <i class="fa-solid fa-id-card"></i> Datos personales
                </div>
                <div class="form-grid-2">
                    <div class="form-field">
                        <label for="mUsrNombre">Nombre <span class="req">*</span></label>
                        <div class="input-icon-wrapper">
                            <i class="fa-solid fa-user prefix-icon"></i>
                            <input type="text" id="mUsrNombre" class="input-admin" value="${BV.escapar(u.nombre || '')}" required>
                        </div>
                    </div>
                    <div class="form-field">
                        <label for="mUsrApellido">Apellido <span class="req">*</span></label>
                        <div class="input-icon-wrapper">
                            <i class="fa-solid fa-user prefix-icon"></i>
                            <input type="text" id="mUsrApellido" class="input-admin" value="${BV.escapar(u.apellido || '')}" required>
                        </div>
                    </div>
                    <div class="form-field">
                        <label for="mUsrTipoDoc">Tipo de documento <span class="req">*</span></label>
                        <div class="input-icon-wrapper">
                            <i class="fa-solid fa-id-card prefix-icon"></i>
                            <select id="mUsrTipoDoc" class="input-admin">
                                ${['C.C.', 'T.I.', 'C.E.'].map(t => `<option value="${t}" ${u.tipo_documento === t ? 'selected' : ''}>${t}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-field">
                        <label for="mUsrDocumento">Número de documento <span class="req">*</span></label>
                        <div class="input-icon-wrapper">
                            <i class="fa-solid fa-hashtag prefix-icon"></i>
                            <input type="text" id="mUsrDocumento" class="input-admin" value="${BV.escapar(u.num_documento || '')}" required>
                        </div>
                    </div>
                    <div class="form-field">
                        <label for="mUsrTelefono">Teléfono <span class="req">*</span></label>
                        <div class="input-icon-wrapper">
                            <i class="fa-solid fa-phone prefix-icon"></i>
                            <input type="tel" id="mUsrTelefono" class="input-admin" value="${BV.escapar(u.telefono || '')}" required>
                        </div>
                    </div>
                    <div class="form-field">
                        <label for="mUsrFechaNac">Fecha de nacimiento</label>
                        <div class="input-icon-wrapper">
                            <i class="fa-solid fa-cake-candles prefix-icon"></i>
                            <input type="date" id="mUsrFechaNac" class="input-admin" value="${BV.escapar(fechaNac)}">
                        </div>
                    </div>
                    <div class="form-field">
                        <label for="mUsrCorreo">Correo</label>
                        <div class="input-icon-wrapper">
                            <i class="fa-solid fa-envelope prefix-icon"></i>
                            <input type="email" id="mUsrCorreo" class="input-admin" value="${BV.escapar(u.correo || '')}">
                        </div>
                    </div>
                    <div class="form-field">
                        <label for="mUsrDireccion">Dirección</label>
                        <div class="input-icon-wrapper">
                            <i class="fa-solid fa-location-dot prefix-icon"></i>
                            <input type="text" id="mUsrDireccion" class="input-admin" value="${BV.escapar(u.direccion || '')}">
                        </div>
                    </div>
                </div>
            </div>
            <div class="form-section-group">
                <div class="form-section-title">
                    <i class="fa-solid fa-user-shield"></i> Acceso al sistema
                </div>
                <div class="form-grid-3">
                    <div class="form-field">
                        <label for="mUsrRol">Rol <span class="req">*</span></label>
                        <div class="input-icon-wrapper">
                            <i class="fa-solid fa-user-shield prefix-icon"></i>
                            <select id="mUsrRol" class="input-admin">
                                ${roles.map(r => `<option value="${r.id_rol}" ${String(rolSeleccionado) === String(r.id_rol) ? 'selected' : ''}>${BV.escapar(r.nombre_rol)}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-field">
                        <label for="mUsrEstado">Estado</label>
                        <div class="input-icon-wrapper">
                            <i class="fa-solid fa-toggle-on prefix-icon"></i>
                            <select id="mUsrEstado" class="input-admin">
                                <option value="Activo" ${u.estado !== 'Inactivo' ? 'selected' : ''}>Activo</option>
                                <option value="Inactivo" ${u.estado === 'Inactivo' ? 'selected' : ''}>Inactivo</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-field">
                        <label for="mUsrContrasena">${usuario ? 'Nueva contraseña' : 'Contraseña'}</label>
                        <div class="input-icon-wrapper">
                            <i class="fa-solid fa-lock prefix-icon"></i>
                            <input type="password" id="mUsrContrasena" class="input-admin" minlength="8" autocomplete="new-password" placeholder="${usuario ? 'Dejar vacío para no cambiar' : 'Mínimo 8 caracteres'}">
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (modalGuardar) modalGuardar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar usuario';

        if (typeof modal.showModal === 'function') modal.showModal();
        else modal.setAttribute('open', '');
    }

    // Abrir Modal de Producto (Nuevo o Editar)
    function abrirModalProducto(producto = null) {
        tipoModal = 'producto';
        editandoId = producto ? producto.id : null;
        nuevaImagenBase64 = null;
        nombreNuevaImagen = null;

        if (modalTitulo) {
            modalTitulo.innerHTML = producto
                ? `<i class="fa-solid fa-pen-to-square"></i> <span>Editar producto #${producto.id}</span>`
                : `<i class="fa-solid fa-plus-circle"></i> <span>Nuevo producto</span>`;
        }
        if (modalError) modalError.hidden = true;

        const p = producto || {};
        const imagenInicial = p.imagen || 'gafas-modelo1.png';

        modalCampos.innerHTML = `
            <!-- SECCIÓN 1: IDENTIFICACIÓN DEL PRODUCTO -->
            <div class="form-section-group">
                <div class="form-section-title">
                    <i class="fa-solid fa-tag"></i> Información principal
                </div>
                <div class="form-field form-grid-full">
                    <label for="mNombre">Nombre del producto <span class="req">*</span></label>
                    <div class="input-icon-wrapper">
                        <i class="fa-solid fa-glasses prefix-icon"></i>
                        <input type="text" id="mNombre" class="input-admin" placeholder="Ej. Gafas Ray-Ban Aviator Classic" value="${BV.escapar(p.nombre || '')}" required>
                    </div>
                </div>

                <div class="form-field form-grid-full">
                    <label for="mDescripcion">Descripción del producto</label>
                    <textarea id="mDescripcion" class="input-admin" rows="2" placeholder="Detalles de la montura, características, tipo de lente...">${BV.escapar(p.descripcion || '')}</textarea>
                </div>
            </div>

            <!-- SECCIÓN 2: IMAGEN DEL PRODUCTO -->
            <div class="form-section-group">
                <div class="form-section-title">
                    <i class="fa-solid fa-image"></i> Fotografía del producto <span class="req">*</span>
                </div>
                <div class="product-image-uploader">
                    <div class="image-preview-box">
                        <img id="mPreviewImg" src="${RUTA_IMAGENES + imagenInicial}" alt="Vista previa del producto">
                    </div>
                    <div class="image-upload-controls">
                        <div>
                            <span style="font-size:0.78rem;font-weight:600;color:var(--admin-text-muted);display:block;margin-bottom:4px;">Catálogo predeterminado:</span>
                            <div class="input-icon-wrapper">
                                <i class="fa-solid fa-images prefix-icon"></i>
                                <select id="mImagenSelect" class="input-admin">
                                    ${IMAGENES_DISPONIBLES.map(img => `<option value="${img}" ${imagenInicial === img ? 'selected' : ''}>${img}</option>`).join('')}
                                    ${!IMAGENES_DISPONIBLES.includes(imagenInicial) ? `<option value="${imagenInicial}" selected>${imagenInicial}</option>` : ''}
                                </select>
                            </div>
                        </div>
                        <div class="file-input-wrapper">
                            <span style="font-size:0.78rem;font-weight:600;color:var(--admin-text-muted);display:block;margin-bottom:4px;">O cargar archivo personalizado:</span>
                            <input type="file" id="mImagenFile" accept="image/*">
                        </div>
                    </div>
                </div>
            </div>

            <!-- SECCIÓN 3: PRECIO E INVENTARIO -->
            <div class="form-section-group">
                <div class="form-section-title">
                    <i class="fa-solid fa-coins"></i> Precio e Inventario
                </div>
                <div class="form-grid-3">
                    <div class="form-field">
                        <label for="mPrecio">Precio (COP) <span class="req">*</span></label>
                        <div class="input-icon-wrapper">
                            <i class="fa-solid fa-dollar-sign prefix-icon"></i>
                            <input type="number" id="mPrecio" class="input-admin" placeholder="0" value="${p.precio || ''}" required min="0" step="500">
                        </div>
                    </div>
                    <div class="form-field">
                        <label for="mStock">Stock actual <span class="req">*</span></label>
                        <div class="input-icon-wrapper">
                            <i class="fa-solid fa-boxes-stacked prefix-icon"></i>
                            <input type="number" id="mStock" class="input-admin" placeholder="10" value="${p.existencia_actual !== undefined ? p.existencia_actual : (p.stock !== undefined ? p.stock : 10)}" min="0" required>
                        </div>
                    </div>
                    <div class="form-field">
                        <label for="mMinimo">Stock mínimo <span class="req">*</span></label>
                        <div class="input-icon-wrapper">
                            <i class="fa-solid fa-triangle-exclamation prefix-icon"></i>
                            <input type="number" id="mMinimo" class="input-admin" placeholder="3" value="${p.existencia_minima || 3}" min="1" required>
                        </div>
                    </div>
                </div>
            </div>

            <!-- SECCIÓN 4: CLASIFICACIÓN Y ATRIBUTOS -->
            <div class="form-section-group">
                <div class="form-section-title">
                    <i class="fa-solid fa-sliders"></i> Clasificación y Atributos
                </div>
                <div class="form-grid-2">
                    <div class="form-field">
                        <label for="mCategoria">Categoría</label>
                        <div class="input-icon-wrapper">
                            <i class="fa-solid fa-list-check prefix-icon"></i>
                            <select id="mCategoria" class="input-admin">
                                ${categoriasMemoria.length > 0 ?
                                    categoriasMemoria.map(c => `<option value="${c.id_categoria}" ${p.id_categoria == c.id_categoria ? 'selected' : ''}>${BV.escapar(c.nombre)}</option>`).join('') :
                                    `
                                    <option value="1" ${p.id_categoria == 1 ? 'selected' : ''}>Monturas</option>
                                    <option value="2" ${p.id_categoria == 2 ? 'selected' : ''}>Gafas de sol</option>
                                    <option value="3" ${p.id_categoria == 3 ? 'selected' : ''}>Lentes de contacto</option>
                                    <option value="4" ${p.id_categoria == 4 ? 'selected' : ''}>Lentes oftálmicos</option>
                                    <option value="5" ${p.id_categoria == 5 ? 'selected' : ''}>Soluciones de limpieza</option>
                                    <option value="6" ${p.id_categoria == 6 ? 'selected' : ''}>Accesorios</option>
                                    `
                                }
                            </select>
                        </div>
                    </div>
                    <div class="form-field">
                        <label for="mMarca">Marca</label>
                        <div class="input-icon-wrapper">
                            <i class="fa-solid fa-crown prefix-icon"></i>
                            <select id="mMarca" class="input-admin">
                                ${marcasMemoria.length > 0 ?
                                    marcasMemoria.map(m => `<option value="${m.id_marca}" ${p.id_marca == m.id_marca ? 'selected' : ''}>${BV.escapar(m.nombre)}</option>`).join('') :
                                    `
                                    <option value="1" ${p.id_marca == 1 ? 'selected' : ''}>Ray-Ban</option>
                                    <option value="2" ${p.id_marca == 2 ? 'selected' : ''}>Vogue Eyewear</option>
                                    <option value="3" ${p.id_marca == 3 ? 'selected' : ''}>Essilor</option>
                                    <option value="4" ${p.id_marca == 4 ? 'selected' : ''}>Acuvue</option>
                                    <option value="5" ${p.id_marca == 5 ? 'selected' : ''}>Vision Clara (marca propia)</option>
                                    `
                                }
                            </select>
                        </div>
                    </div>
                    <div class="form-field">
                        <label for="mMaterial">Material</label>
                        <div class="input-icon-wrapper">
                            <i class="fa-solid fa-layer-group prefix-icon"></i>
                            <input type="text" id="mMaterial" class="input-admin" placeholder="Ej. Acetato, Titanio, Metal" value="${BV.escapar(p.material || 'Acetato')}">
                        </div>
                    </div>
                    <div class="form-field">
                        <label for="mGenero">Género</label>
                        <div class="input-icon-wrapper">
                            <i class="fa-solid fa-venus-mars prefix-icon"></i>
                            <select id="mGenero" class="input-admin">
                                <option value="Unisex" ${p.genero === 'Unisex' ? 'selected' : ''}>Unisex</option>
                                <option value="Mujer" ${p.genero === 'Mujer' ? 'selected' : ''}>Mujer</option>
                                <option value="Hombre" ${p.genero === 'Hombre' ? 'selected' : ''}>Hombre</option>
                                <option value="Infantil" ${p.genero === 'Infantil' ? 'selected' : ''}>Infantil</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const selectImg = document.getElementById('mImagenSelect');
        const fileImg = document.getElementById('mImagenFile');
        const previewImg = document.getElementById('mPreviewImg');

        if (selectImg) {
            selectImg.addEventListener('change', () => {
                previewImg.src = RUTA_IMAGENES + selectImg.value;
                nuevaImagenBase64 = null;
                nombreNuevaImagen = null;
                if (fileImg) fileImg.value = '';
            });
        }

        if (fileImg) {
            fileImg.addEventListener('change', (e) => {
                const archivo = e.target.files[0];
                if (!archivo) return;

                const lector = new FileReader();
                lector.onload = (evt) => {
                    nuevaImagenBase64 = evt.target.result;
                    nombreNuevaImagen = archivo.name;
                    previewImg.src = nuevaImagenBase64;
                };
                lector.readAsDataURL(archivo);
            });
        }

        if (modalGuardar) modalGuardar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar producto';

        if (typeof modal.showModal === 'function') {
            modal.showModal();
        } else {
            modal.setAttribute('open', '');
        }
    }

    // Abrir Modal de Categoría
    function abrirModalCategoria(categoria = null) {
        tipoModal = 'categoria';
        editandoId = categoria ? categoria.id_categoria : null;

        if (modalTitulo) {
            modalTitulo.innerHTML = categoria
                ? `<i class="fa-solid fa-pen-to-square"></i> <span>Editar categoría #${categoria.id_categoria}</span>`
                : `<i class="fa-solid fa-plus-circle"></i> <span>Nueva categoría</span>`;
        }
        if (modalError) modalError.hidden = true;

        const c = categoria || {};

        modalCampos.innerHTML = `
            <div class="form-section-group">
                <div class="form-section-title">
                    <i class="fa-solid fa-tag"></i> Datos de la categoría
                </div>
                <div class="form-field form-grid-full">
                    <label for="mCatNombre">Nombre de la categoría <span class="req">*</span></label>
                    <div class="input-icon-wrapper">
                        <i class="fa-solid fa-tag prefix-icon"></i>
                        <input type="text" id="mCatNombre" class="input-admin" placeholder="Ej. Lentes de contacto" value="${BV.escapar(c.nombre || '')}" required>
                    </div>
                </div>
                <div class="form-field form-grid-full">
                    <label for="mCatDescripcion">Descripción</label>
                    <textarea id="mCatDescripcion" class="input-admin" rows="3" placeholder="Descripción breve de la categoría">${BV.escapar(c.descripcion || '')}</textarea>
                </div>
                <div class="form-field form-grid-full">
                    <label for="mCatEstado">Estado</label>
                    <div class="input-icon-wrapper">
                        <i class="fa-solid fa-toggle-on prefix-icon"></i>
                        <select id="mCatEstado" class="input-admin">
                            <option value="Activo" ${c.estado !== 'Inactivo' ? 'selected' : ''}>Activo</option>
                            <option value="Inactivo" ${c.estado === 'Inactivo' ? 'selected' : ''}>Inactivo</option>
                        </select>
                    </div>
                </div>
            </div>
        `;

        if (modalGuardar) modalGuardar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar categoría';

        if (typeof modal.showModal === 'function') modal.showModal();
        else modal.setAttribute('open', '');
    }

    // Abrir Modal de Marca
    function abrirModalMarca(marca = null) {
        tipoModal = 'marca';
        editandoId = marca ? marca.id_marca : null;

        if (modalTitulo) {
            modalTitulo.innerHTML = marca
                ? `<i class="fa-solid fa-pen-to-square"></i> <span>Editar marca #${marca.id_marca}</span>`
                : `<i class="fa-solid fa-plus-circle"></i> <span>Nueva marca</span>`;
        }
        if (modalError) modalError.hidden = true;

        const m = marca || {};

        modalCampos.innerHTML = `
            <div class="form-section-group">
                <div class="form-section-title">
                    <i class="fa-solid fa-copyright"></i> Datos de la marca
                </div>
                <div class="form-field form-grid-full">
                    <label for="mMarcaNombre">Nombre de la marca <span class="req">*</span></label>
                    <div class="input-icon-wrapper">
                        <i class="fa-solid fa-copyright prefix-icon"></i>
                        <input type="text" id="mMarcaNombre" class="input-admin" placeholder="Ej. Ray-Ban" value="${BV.escapar(m.nombre || '')}" required>
                    </div>
                </div>
                <div class="form-field form-grid-full">
                    <label for="mMarcaPais">País de origen</label>
                    <div class="input-icon-wrapper">
                        <i class="fa-solid fa-earth-americas prefix-icon"></i>
                        <input type="text" id="mMarcaPais" class="input-admin" placeholder="Ej. Italia" value="${BV.escapar(m.pais_origen || '')}">
                    </div>
                </div>
                <div class="form-field form-grid-full">
                    <label for="mMarcaEstado">Estado</label>
                    <div class="input-icon-wrapper">
                        <i class="fa-solid fa-toggle-on prefix-icon"></i>
                        <select id="mMarcaEstado" class="input-admin">
                            <option value="Activo" ${m.estado !== 'Inactivo' ? 'selected' : ''}>Activo</option>
                            <option value="Inactivo" ${m.estado === 'Inactivo' ? 'selected' : ''}>Inactivo</option>
                        </select>
                    </div>
                </div>
            </div>
        `;

        if (modalGuardar) modalGuardar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar marca';

        if (typeof modal.showModal === 'function') modal.showModal();
        else modal.setAttribute('open', '');
    }

    // Guardar cambios del Formulario del Modal
    if (formModal) {
        formModal.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (modalError) modalError.hidden = true;

            if (tipoModal === 'producto') {
                const nombre = document.getElementById('mNombre').value.trim();
                const descripcion = document.getElementById('mDescripcion').value.trim();
                const precio = parseFloat(document.getElementById('mPrecio').value);
                const existencia_actual = parseInt(document.getElementById('mStock').value, 10);
                const existencia_minima = parseInt(document.getElementById('mMinimo').value, 10);
                const id_categoria = parseInt(document.getElementById('mCategoria').value, 10);
                const id_marca = parseInt(document.getElementById('mMarca').value, 10);
                const material = document.getElementById('mMaterial').value.trim();
                const genero = document.getElementById('mGenero').value;
                let imagenFinal = document.getElementById('mImagenSelect').value;

                if (!nombre || isNaN(precio)) {
                    if (modalError) {
                        modalError.textContent = 'Por favor completa todos los campos obligatorios.';
                        modalError.hidden = false;
                    }
                    return;
                }

                try {
                    if (nuevaImagenBase64 && nombreNuevaImagen) {
                        const resUpload = await Api.post('/api/upload-imagen', {
                            nombreArchivo: nombreNuevaImagen,
                            base64Data: nuevaImagenBase64
                        });
                        imagenFinal = resUpload.filename;
                    }

                    const datos = {
                        nombre,
                        descripcion,
                        precio,
                        imagen: imagenFinal,
                        existencia_actual,
                        existencia_minima,
                        id_categoria,
                        id_marca,
                        material,
                        genero,
                        estado: 'Activo'
                    };

                    if (editandoId) {
                        await Api.put('/api/productos/' + editandoId, datos);
                    } else {
                        await Api.post('/api/productos', datos);
                    }
                    modal.close();
                    cargarProductos();
                } catch (err) {
                    if (modalError) {
                        modalError.textContent = err.message || 'Error al guardar el producto.';
                        modalError.hidden = false;
                    }
                }
            } else if (tipoModal === 'categoria') {
                const nombre = document.getElementById('mCatNombre').value.trim();
                const descripcion = document.getElementById('mCatDescripcion').value.trim();
                const estado = document.getElementById('mCatEstado').value;

                if (!nombre) {
                    if (modalError) {
                        modalError.textContent = 'El nombre de la categoría es obligatorio.';
                        modalError.hidden = false;
                    }
                    return;
                }

                try {
                    const datos = { nombre, descripcion, estado };
                    if (editandoId) {
                        await Api.put('/api/categorias/' + editandoId, datos);
                    } else {
                        await Api.post('/api/categorias', datos);
                    }
                    modal.close();
                    cargarCategorias();
                } catch (err) {
                    if (modalError) {
                        modalError.textContent = err.message || 'Error al guardar la categoría.';
                        modalError.hidden = false;
                    }
                }
            } else if (tipoModal === 'marca') {
                const nombre = document.getElementById('mMarcaNombre').value.trim();
                const pais_origen = document.getElementById('mMarcaPais').value.trim();
                const estado = document.getElementById('mMarcaEstado').value;

                if (!nombre) {
                    if (modalError) {
                        modalError.textContent = 'El nombre de la marca es obligatorio.';
                        modalError.hidden = false;
                    }
                    return;
                }

                try {
                    const datos = { nombre, pais_origen, estado };
                    if (editandoId) {
                        await Api.put('/api/marcas/' + editandoId, datos);
                    } else {
                        await Api.post('/api/marcas', datos);
                    }
                    modal.close();
                    cargarMarcas();
                } catch (err) {
                    if (modalError) {
                        modalError.textContent = err.message || 'Error al guardar la marca.';
                        modalError.hidden = false;
                    }
                }
            } else if (tipoModal === 'usuario') {
                const valor = (id) => document.getElementById(id).value.trim();
                const datos = {
                    nombre: valor('mUsrNombre'),
                    apellido: valor('mUsrApellido'),
                    tipo_documento: valor('mUsrTipoDoc'),
                    num_documento: valor('mUsrDocumento'),
                    telefono: valor('mUsrTelefono'),
                    correo: valor('mUsrCorreo'),
                    direccion: valor('mUsrDireccion'),
                    fecha_nacimiento: valor('mUsrFechaNac'),
                    id_rol: parseInt(valor('mUsrRol'), 10),
                    estado: valor('mUsrEstado')
                };
                const contrasena = document.getElementById('mUsrContrasena').value;
                if (contrasena) datos.contrasena = contrasena;

                let errorValidacion = null;
                if (!datos.nombre || !datos.apellido || !datos.num_documento || !datos.telefono) {
                    errorValidacion = 'Por favor completa todos los campos obligatorios.';
                } else if (contrasena && contrasena.length < 8) {
                    errorValidacion = 'La contraseña debe tener al menos 8 caracteres.';
                }
                if (errorValidacion) {
                    if (modalError) {
                        modalError.textContent = errorValidacion;
                        modalError.hidden = false;
                    }
                    return;
                }

                try {
                    if (editandoId) {
                        await Api.put('/api/usuarios/' + editandoId, datos);
                    } else {
                        await Api.post('/api/usuarios', datos);
                    }
                    modal.close();
                    cargarUsuarios();
                } catch (err) {
                    if (modalError) {
                        modalError.textContent = err.message || 'Error al guardar el usuario.';
                        modalError.hidden = false;
                    }
                }
            } else if (tipoModal === 'proveedor') {
                const nombre = document.getElementById('mProvNombre').value.trim();
                const nit = document.getElementById('mProvNit').value.trim();
                const telefono = document.getElementById('mProvTelefono').value.trim();
                const correo = document.getElementById('mProvCorreo').value.trim();
                const direccion = document.getElementById('mProvDireccion').value.trim();
                const estado = document.getElementById('mProvEstado').value;

                if (!nombre || !nit || !telefono || !correo) {
                    if (modalError) {
                        modalError.textContent = 'Nombre, NIT, teléfono y correo son obligatorios.';
                        modalError.hidden = false;
                    }
                    return;
                }

                try {
                    const datos = { nombre, nit, telefono, correo, direccion, estado };
                    if (editandoId) {
                        await Api.put('/api/proveedores/' + editandoId, datos);
                    } else {
                        await Api.post('/api/proveedores', datos);
                    }
                    modal.close();
                    cargarProveedores();
                } catch (err) {
                    if (modalError) {
                        modalError.textContent = err.message || 'Error al guardar el proveedor.';
                        modalError.hidden = false;
                    }
                }
            } else if (tipoModal === 'promocion') {
                const nombre = document.getElementById('mPromoNombre').value.trim();
                const descripcion = document.getElementById('mPromoDesc').value.trim();
                const tipo_descuento = document.getElementById('mPromoTipo').value;
                const valor_descuento = parseFloat(document.getElementById('mPromoValor').value);
                const fecha_inicio = document.getElementById('mPromoInicio').value || null;
                const fecha_fin = document.getElementById('mPromoFin').value || null;
                const estado = document.getElementById('mPromoEstado').value;

                if (!nombre || isNaN(valor_descuento)) {
                    if (modalError) {
                        modalError.textContent = 'Nombre y valor del descuento son obligatorios.';
                        modalError.hidden = false;
                    }
                    return;
                }

                try {
                    const datos = { nombre, descripcion, tipo_descuento, valor_descuento, fecha_inicio, fecha_fin, estado };
                    if (editandoId) {
                        await Api.put('/api/promociones/' + editandoId, datos);
                    } else {
                        await Api.post('/api/promociones', datos);
                    }
                    modal.close();
                    cargarPromociones();
                } catch (err) {
                    if (modalError) {
                        modalError.textContent = err.message || 'Error al guardar la promoción.';
                        modalError.hidden = false;
                    }
                }
            } else {
                modal.close();
            }
        });
    }

    // Botón Cancelar y Cerrar (X) del Modal
    function cerrarModal() {
        if (typeof modal.close === 'function') modal.close();
        else modal.removeAttribute('open');
    }

    if (modalCancelar) modalCancelar.addEventListener('click', cerrarModal);

    const modalCloseBtn = document.getElementById('modalCloseBtn');
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', cerrarModal);

    // Cerrar al hacer clic en el backdrop fuera del modal
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) cerrarModal();
        });
    }

    // Función para cambiar de pestaña en el inventario
    function cambiarTabInventario(tab) {
        tabActual = tab;
        document.querySelectorAll('.inv-tab').forEach(b => {
            b.classList.toggle('active', b.dataset.invTab === tab);
        });
        document.querySelectorAll('.inv-panel').forEach(p => {
            p.classList.toggle('active', p.id === `invPanel-${tab}`);
        });

        // Actualizar botón de acción principal de la cabecera
        const btnNuevo = document.getElementById('btnNuevoInventario');
        if (btnNuevo) {
            if (tab === 'productos') {
                btnNuevo.setAttribute('data-nuevo', 'producto');
                btnNuevo.innerHTML = '<i class="fa-solid fa-plus"></i> Nuevo producto';
            } else if (tab === 'marcas') {
                btnNuevo.setAttribute('data-nuevo', 'marca');
                btnNuevo.innerHTML = '<i class="fa-solid fa-plus"></i> Nueva marca';
            } else if (tab === 'categorias') {
                btnNuevo.setAttribute('data-nuevo', 'categoria');
                btnNuevo.innerHTML = '<i class="fa-solid fa-plus"></i> Nueva categoría';
            }
        }
    }

    // Delegación de eventos para clicks en botones, tabs y tablas
    document.addEventListener('click', async (e) => {
        // Clic en pestaña de inventario
        const tabBtn = e.target.closest('.inv-tab');
        if (tabBtn) {
            e.preventDefault();
            cambiarTabInventario(tabBtn.dataset.invTab);
            return;
        }

        // Nuevo Usuario
        const btnNuevoUsuario = e.target.closest('[data-nuevo="usuario"]');
        if (btnNuevoUsuario) {
            e.preventDefault();
            abrirModalUsuario();
            return;
        }

        // Editar Usuario
        const btnEditUsuario = e.target.closest('[data-editar-usuario]');
        if (btnEditUsuario) {
            e.preventDefault();
            const id = btnEditUsuario.dataset.editarUsuario;
            const usuario = usuariosMemoria.find(u => String(u.id_usuario) === String(id));
            if (usuario) abrirModalUsuario(usuario);
            return;
        }

        // Eliminar Usuario
        const btnDelUsuario = e.target.closest('[data-eliminar-usuario]');
        if (btnDelUsuario) {
            e.preventDefault();
            const id = btnDelUsuario.dataset.eliminarUsuario;
            if (confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
                try {
                    await Api.del('/api/usuarios/' + id);
                    cargarUsuarios();
                } catch (err) {
                    alert('Error al eliminar el usuario: ' + err.message);
                }
            }
            return;
        }

        // Nuevo Producto
        const btnNuevoProd = e.target.closest('[data-nuevo="producto"]');
        if (btnNuevoProd) {
            e.preventDefault();
            abrirModalProducto();
            return;
        }

        // Nueva Categoría
        const btnNuevoCat = e.target.closest('[data-nuevo="categoria"]');
        if (btnNuevoCat) {
            e.preventDefault();
            abrirModalCategoria();
            return;
        }

        // Nueva Marca
        const btnNuevoMarca = e.target.closest('[data-nuevo="marca"]');
        if (btnNuevoMarca) {
            e.preventDefault();
            abrirModalMarca();
            return;
        }

        // Editar Producto
        const btnEditProd = e.target.closest('[data-editar-prod]');
        if (btnEditProd) {
            e.preventDefault();
            const id = btnEditProd.dataset.editarProd;
            const producto = productosMemoria.find(p => String(p.id) === String(id));
            if (producto) abrirModalProducto(producto);
            return;
        }

        // Eliminar Producto
        const btnDelProd = e.target.closest('[data-eliminar-prod]');
        if (btnDelProd) {
            e.preventDefault();
            const id = btnDelProd.dataset.eliminarProd;
            if (confirm('¿Estás seguro de que deseas eliminar este producto?')) {
                try {
                    await Api.del('/api/productos/' + id);
                    cargarProductos();
                } catch (err) {
                    alert('Error al eliminar el producto: ' + err.message);
                }
            }
            return;
        }

        // Editar Categoría
        const btnEditCat = e.target.closest('[data-editar-cat]');
        if (btnEditCat) {
            e.preventDefault();
            const id = btnEditCat.dataset.editarCat;
            const cat = categoriasMemoria.find(c => String(c.id_categoria) === String(id));
            if (cat) abrirModalCategoria(cat);
            return;
        }

        // Eliminar Categoría
        const btnDelCat = e.target.closest('[data-eliminar-cat]');
        if (btnDelCat) {
            e.preventDefault();
            const id = btnDelCat.dataset.eliminarCat;
            if (confirm('¿Estás seguro de que deseas eliminar esta categoría?')) {
                try {
                    await Api.del('/api/categorias/' + id);
                    cargarCategorias();
                } catch (err) {
                    alert('Error al eliminar la categoría: ' + err.message);
                }
            }
            return;
        }

        // Editar Marca
        const btnEditMarca = e.target.closest('[data-editar-marca]');
        if (btnEditMarca) {
            e.preventDefault();
            const id = btnEditMarca.dataset.editarMarca;
            const marca = marcasMemoria.find(m => String(m.id_marca) === String(id));
            if (marca) abrirModalMarca(marca);
            return;
        }

        // Eliminar Marca
        const btnDelMarca = e.target.closest('[data-eliminar-marca]');
        if (btnDelMarca) {
            e.preventDefault();
            const id = btnDelMarca.dataset.eliminarMarca;
            if (confirm('¿Estás seguro de que deseas eliminar esta marca?')) {
                try {
                    await Api.del('/api/marcas/' + id);
                    cargarMarcas();
                } catch (err) {
                    alert('Error al eliminar la marca: ' + err.message);
                }
            }
            return;
        }

        // Nuevo Proveedor
        const btnNuevoProv = e.target.closest('[data-nuevo="proveedor"]');
        if (btnNuevoProv) {
            e.preventDefault();
            abrirModalProveedor();
            return;
        }

        // Editar Proveedor
        const btnEditProv = e.target.closest('[data-editar-prov]');
        if (btnEditProv) {
            e.preventDefault();
            const id = btnEditProv.dataset.editarProv;
            const prov = proveedoresMemoria.find(p => String(p.codigo_proveedor) === String(id));
            if (prov) abrirModalProveedor(prov);
            return;
        }

        // Eliminar Proveedor
        const btnDelProv = e.target.closest('[data-eliminar-prov]');
        if (btnDelProv) {
            e.preventDefault();
            const id = btnDelProv.dataset.eliminarProv;
            if (confirm('¿Estás seguro de que deseas eliminar este proveedor?')) {
                try {
                    await Api.del('/api/proveedores/' + id);
                    cargarProveedores();
                } catch (err) {
                    alert('Error al eliminar el proveedor: ' + err.message);
                }
            }
            return;
        }
    });

    // Delegación secundaria para ventas, citas, recetas y promociones
    document.addEventListener('click', async (e) => {
        // Nuevo promo
        const btnNuevoPromo = e.target.closest('[data-nuevo="promocion"]');
        if (btnNuevoPromo) { e.preventDefault(); abrirModalPromocion(); return; }

        // Editar promo
        const btnEditPromo = e.target.closest('[data-editar-promo]');
        if (btnEditPromo) {
            e.preventDefault();
            const promo = promosMemoria.find(p => String(p.codigo_promocion) === String(btnEditPromo.dataset.editarPromo));
            if (promo) abrirModalPromocion(promo);
            return;
        }

        // Eliminar promo
        const btnDelPromo = e.target.closest('[data-eliminar-promo]');
        if (btnDelPromo) {
            e.preventDefault();
            if (confirm('¿Eliminar esta promoción?')) {
                try { await Api.del('/api/promociones/' + btnDelPromo.dataset.eliminarPromo); cargarPromociones(); }
                catch (err) { alert('Error: ' + err.message); }
            }
            return;
        }

        // Eliminar venta
        const btnDelVenta = e.target.closest('[data-eliminar-venta]');
        if (btnDelVenta) {
            e.preventDefault();
            if (confirm('¿Eliminar esta venta?')) {
                try { await Api.del('/api/ventas/' + btnDelVenta.dataset.eliminarVenta); cargarVentas(); }
                catch (err) { alert('Error: ' + err.message); }
            }
            return;
        }

        // Cambiar estado venta
        const btnCambiarVenta = e.target.closest('[data-cambiar-venta]');
        if (btnCambiarVenta) {
            e.preventDefault();
            const estados = ['Pendiente', 'Completada', 'Cancelada'];
            const nuevoEstado = prompt('Cambiar estado de la venta a:\n1. Pendiente\n2. Completada\n3. Cancelada\n(escribe el nombre exacto)');
            if (nuevoEstado && estados.includes(nuevoEstado)) {
                try {
                    await Api.put('/api/ventas/' + btnCambiarVenta.dataset.cambiarVenta, { estado: nuevoEstado });
                    cargarVentas();
                } catch (err) { alert('Error: ' + err.message); }
            }
            return;
        }

        // Eliminar cita
        const btnDelCita = e.target.closest('[data-eliminar-cita]');
        if (btnDelCita) {
            e.preventDefault();
            if (confirm('¿Eliminar esta cita?')) {
                try { await Api.del('/api/citas/' + btnDelCita.dataset.eliminarCita); cargarCitas(); }
                catch (err) { alert('Error: ' + err.message); }
            }
            return;
        }

        // Eliminar receta
        const btnDelReceta = e.target.closest('[data-eliminar-receta]');
        if (btnDelReceta) {
            e.preventDefault();
            if (confirm('¿Eliminar esta receta óptica?')) {
                try { await Api.del('/api/recetas/' + btnDelReceta.dataset.eliminarReceta); cargarRecetas(); }
                catch (err) { alert('Error: ' + err.message); }
            }
            return;
        }
    });

    // ── Ventas ──────────────────────────────────────────────────
    const ESTADO_VENTA_CLASE = { Completada: 'green', Pendiente: 'orange', Cancelada: 'red', Cotización: 'blue' };

    async function cargarVentas() {
        if (!tbVentas) return;
        try {
            const ventas = await Api.get('/api/ventas');
            let ingresos = 0, completadas = 0, cotizaciones = 0;
            tbVentas.innerHTML = '';
            if (ventas.length === 0) {
                tbVentas.innerHTML = '<tr><td colspan="9" style="text-align:center;">No hay ventas registradas.</td></tr>';
            } else {
                ventas.forEach(v => {
                    const esCotiz = v.es_cotizacion == 1;
                    if (!esCotiz && v.estado === 'Completada') { ingresos += parseFloat(v.total || 0); completadas++; }
                    if (esCotiz) cotizaciones++;
                    const estadoDisplay = esCotiz ? 'Cotización' : v.estado;
                    const clase = ESTADO_VENTA_CLASE[estadoDisplay] || 'blue';
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><strong>#${v.codigo_venta}</strong></td>
                        <td>${BV.escapar(v.cliente || '—')}</td>
                        <td>${v.fecha ? v.fecha.split(' ')[0] : '—'}</td>
                        <td><strong>${BV.moneda(v.total)}</strong></td>
                        <td>${v.es_cotizacion ? '<span class="badge blue">Sí</span>' : '<span class="badge" style="background:rgba(100,100,100,0.15)">No</span>'}</td>
                        <td>${v.codigo_promocion ? `<span class="badge purple">#${v.codigo_promocion}</span>` : '—'}</td>
                        <td>${v.id_receta ? `<span class="badge teal">#${v.id_receta}</span>` : '—'}</td>
                        <td><span class="badge ${clase}">${BV.escapar(estadoDisplay)}</span></td>
                        <td>
                            <div style="display:flex;gap:6px;">
                                <button type="button" class="btn-ghost" data-cambiar-venta="${v.codigo_venta}" title="Cambiar estado"><i class="fa-solid fa-pen-to-square"></i></button>
                                <button type="button" class="btn-ghost" data-eliminar-venta="${v.codigo_venta}" title="Eliminar" style="color:var(--red);"><i class="fa-solid fa-trash"></i></button>
                            </div>
                        </td>
                    `;
                    tbVentas.appendChild(tr);
                });
            }
            if (kpiTotalIngresos) kpiTotalIngresos.textContent = BV.moneda(ingresos);
            if (kpiVentasCompletadas) kpiVentasCompletadas.textContent = completadas;
            if (kpiCotizaciones) kpiCotizaciones.textContent = cotizaciones;
            // Actualizar KPIs del dashboard
            if (kpiIngresos) kpiIngresos.textContent = BV.moneda(ingresos);
            if (kpiVentas) kpiVentas.textContent = completadas;
        } catch (e) {
            console.error('Error al cargar ventas:', e);
            if (tbVentas) tbVentas.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--red);">Error al cargar ventas del servidor.</td></tr>';
        }
    }

    // ── Devoluciones ─────────────────────────────────────────────
    async function cargarDevoluciones() {
        if (!tbDevoluciones) return;
        try {
            const devs = await Api.get('/api/devoluciones');
            if (kpiDevoluciones) kpiDevoluciones.textContent = devs.length;
            tbDevoluciones.innerHTML = '';
            if (devs.length === 0) {
                tbDevoluciones.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay devoluciones registradas.</td></tr>';
                return;
            }
            devs.forEach(d => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>#${d.id_devolucion}</strong></td>
                    <td>${BV.escapar(d.motivo || '—')}</td>
                    <td>${d.cantidad}</td>
                    <td>${BV.escapar(d.observaciones || '—')}</td>
                    <td>${d.codigo_venta ? '#' + d.codigo_venta : '—'}</td>
                    <td>${BV.escapar(d.registrado_por || '—')}</td>
                `;
                tbDevoluciones.appendChild(tr);
            });
        } catch (e) {
            console.error('Error al cargar devoluciones:', e);
            if (tbDevoluciones) tbDevoluciones.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--red);">Error al cargar devoluciones.</td></tr>';
        }
    }

    // ── Compras ──────────────────────────────────────────────────
    async function cargarCompras() {
        if (!tbCompras) return;
        try {
            const compras = await Api.get('/api/compras');
            tbCompras.innerHTML = '';
            if (compras.length === 0) {
                tbCompras.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay órdenes de compra registradas.</td></tr>';
                return;
            }
            compras.forEach(c => {
                const estadoClase = { Recibida: 'green', Pendiente: 'orange', Cancelada: 'red', 'En tránsito': 'blue' }[c.estado] || 'blue';
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>#${c.numero_compra}</strong></td>
                    <td>${BV.escapar(c.numero_comprobante || '—')}</td>
                    <td>${BV.escapar(c.proveedor || '—')}</td>
                    <td>${c.fecha ? c.fecha.split(' ')[0] : '—'}</td>
                    <td><strong>${BV.moneda(c.total)}</strong></td>
                    <td><span class="badge ${estadoClase}">${BV.escapar(c.estado || '—')}</span></td>
                    <td>—</td>
                `;
                tbCompras.appendChild(tr);
            });
        } catch (e) {
            console.error('Error al cargar compras:', e);
            if (tbCompras) tbCompras.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--red);">Error al cargar compras.</td></tr>';
        }
    }

    // ── Citas ────────────────────────────────────────────────────
    const ESTADO_CITA_CLASE = { Programada: 'blue', Atendida: 'green', Cancelada: 'red', 'No asistió': 'orange' };

    async function cargarCitas() {
        if (!tbCitas) return;
        try {
            const citas = await Api.get('/api/citas');
            if (kpiCitas) kpiCitas.textContent = citas.filter(c => c.estado === 'Programada').length;
            tbCitas.innerHTML = '';
            if (citas.length === 0) {
                tbCitas.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay citas registradas.</td></tr>';
                return;
            }
            citas.forEach(c => {
                const clase = ESTADO_CITA_CLASE[c.estado] || 'blue';
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>#${c.id_cita}</strong></td>
                    <td>${BV.escapar(c.cliente || '—')}</td>
                    <td>${c.fecha_hora ? c.fecha_hora.replace('T', ' ').substring(0, 16) : '—'}</td>
                    <td>${BV.escapar(c.motivo || '—')}</td>
                    <td>${BV.escapar(c.atiende || '—')}</td>
                    <td><span class="badge ${clase}">${BV.escapar(c.estado)}</span></td>
                    <td>
                        <button type="button" class="btn-ghost" data-eliminar-cita="${c.id_cita}" title="Eliminar" style="color:var(--red);"><i class="fa-solid fa-trash"></i></button>
                    </td>
                `;
                tbCitas.appendChild(tr);
            });
        } catch (e) {
            console.error('Error al cargar citas:', e);
            if (tbCitas) tbCitas.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--red);">Error al cargar citas.</td></tr>';
        }
    }

    // ── Recetas ──────────────────────────────────────────────────
    async function cargarRecetas() {
        if (!tbRecetas) return;
        try {
            const recetas = await Api.get('/api/recetas');
            if (kpiRecetas) kpiRecetas.textContent = recetas.length;
            tbRecetas.innerHTML = '';
            if (recetas.length === 0) {
                tbRecetas.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay recetas registradas.</td></tr>';
                return;
            }
            const hoy = new Date();
            recetas.forEach(r => {
                const vence = r.fecha_vencimiento ? new Date(r.fecha_vencimiento) : null;
                const vigente = vence ? vence >= hoy : true;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>#${r.id_receta}</strong></td>
                    <td>${BV.escapar(r.cliente || '—')}</td>
                    <td>${r.fecha_emision || '—'}</td>
                    <td>${r.fecha_vencimiento || '—'}</td>
                    <td>${BV.escapar(r.diagnostico || '—')}</td>
                    <td><span class="badge ${vigente ? 'green' : 'red'}">${vigente ? 'Vigente' : 'Vencida'}</span></td>
                    <td>
                        <button type="button" class="btn-ghost" data-eliminar-receta="${r.id_receta}" title="Eliminar" style="color:var(--red);"><i class="fa-solid fa-trash"></i></button>
                    </td>
                `;
                tbRecetas.appendChild(tr);
            });
        } catch (e) {
            console.error('Error al cargar recetas:', e);
            if (tbRecetas) tbRecetas.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--red);">Error al cargar recetas.</td></tr>';
        }
    }

    // ── Promociones ──────────────────────────────────────────────
    let promosMemoria = [];

    async function cargarPromociones() {
        if (!gridPromos) return;
        try {
            const promos = await Api.get('/api/promociones');
            promosMemoria = promos;
            gridPromos.innerHTML = '';
            if (promos.length === 0) {
                gridPromos.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--admin-text-muted);">No hay promociones registradas.</p>';
                return;
            }
            promos.forEach(p => {
                const activa = p.estado === 'Activo';
                const descuento = p.tipo_descuento === 'porcentaje' ? `${p.valor_descuento}%` : BV.moneda(p.valor_descuento);
                const card = document.createElement('div');
                card.className = 'promo-card';
                card.innerHTML = `
                    <div class="promo-header">
                        <span class="promo-badge ${activa ? 'green' : 'red'}">${activa ? 'Activa' : 'Inactiva'}</span>
                        <div style="display:flex;gap:6px;">
                            <button type="button" class="btn-ghost" data-editar-promo="${p.codigo_promocion}" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
                            <button type="button" class="btn-ghost" data-eliminar-promo="${p.codigo_promocion}" title="Eliminar" style="color:var(--red);"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                    <h3 class="promo-nombre">${BV.escapar(p.nombre)}</h3>
                    <p class="promo-desc">${BV.escapar(p.descripcion || '—')}</p>
                    <div class="promo-descuento"><i class="fa-solid fa-percent"></i> ${descuento} de descuento</div>
                    <div class="promo-fechas">
                        <span><i class="fa-regular fa-calendar"></i> ${p.fecha_inicio || '—'} → ${p.fecha_fin || '—'}</span>
                    </div>
                `;
                gridPromos.appendChild(card);
            });
        } catch (e) {
            console.error('Error al cargar promociones:', e);
            if (gridPromos) gridPromos.innerHTML = '<p style="text-align:center;color:var(--red);">Error al cargar promociones.</p>';
        }
    }

    function abrirModalPromocion(promo = null) {
        tipoModal = 'promocion';
        editandoId = promo ? promo.codigo_promocion : null;
        if (modalTitulo) modalTitulo.innerHTML = promo
            ? `<i class="fa-solid fa-tags"></i> <span>Editar promoción #${promo.codigo_promocion}</span>`
            : `<i class="fa-solid fa-tags"></i> <span>Nueva promoción</span>`;
        if (modalError) modalError.hidden = true;
        const p = promo || {};
        modalCampos.innerHTML = `
            <div class="form-section-group">
                <div class="form-section-title"><i class="fa-solid fa-tags"></i> Datos de la promoción</div>
                <div class="form-grid-2">
                    <div class="form-field">
                        <label for="mPromoNombre">Nombre <span class="req">*</span></label>
                        <input type="text" id="mPromoNombre" class="input-admin" value="${BV.escapar(p.nombre || '')}" required>
                    </div>
                    <div class="form-field">
                        <label for="mPromoEstado">Estado</label>
                        <select id="mPromoEstado" class="input-admin">
                            <option value="Activo" ${p.estado !== 'Inactivo' ? 'selected' : ''}>Activo</option>
                            <option value="Inactivo" ${p.estado === 'Inactivo' ? 'selected' : ''}>Inactivo</option>
                        </select>
                    </div>
                </div>
                <div class="form-field form-grid-full">
                    <label for="mPromoDesc">Descripción</label>
                    <textarea id="mPromoDesc" class="input-admin" rows="2">${BV.escapar(p.descripcion || '')}</textarea>
                </div>
                <div class="form-grid-2">
                    <div class="form-field">
                        <label for="mPromoTipo">Tipo descuento <span class="req">*</span></label>
                        <select id="mPromoTipo" class="input-admin">
                            <option value="porcentaje" ${p.tipo_descuento === 'porcentaje' ? 'selected' : ''}>Porcentaje (%)</option>
                            <option value="valor" ${p.tipo_descuento === 'valor' ? 'selected' : ''}>Valor fijo ($)</option>
                        </select>
                    </div>
                    <div class="form-field">
                        <label for="mPromoValor">Valor descuento <span class="req">*</span></label>
                        <input type="number" id="mPromoValor" class="input-admin" value="${p.valor_descuento || ''}" min="0" step="0.01" required>
                    </div>
                </div>
                <div class="form-grid-2">
                    <div class="form-field">
                        <label for="mPromoInicio">Fecha inicio</label>
                        <input type="date" id="mPromoInicio" class="input-admin" value="${p.fecha_inicio || ''}">
                    </div>
                    <div class="form-field">
                        <label for="mPromoFin">Fecha fin</label>
                        <input type="date" id="mPromoFin" class="input-admin" value="${p.fecha_fin || ''}">
                    </div>
                </div>
            </div>
        `;
        if (modalGuardar) modalGuardar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar promoción';
        if (typeof modal.showModal === 'function') modal.showModal();
        else modal.setAttribute('open', '');
    }

    // ── Reportes ─────────────────────────────────────────────────
    const TIPO_REPORTE_CLASE = { Ventas: 'green', Inventario: 'blue', Clientes: 'purple', Compras: 'orange', General: 'teal' };

    async function cargarReportes() {
        if (!gridReportes) return;
        try {
            const reportes = await Api.get('/api/reportes');
            gridReportes.innerHTML = '';
            if (reportes.length === 0) {
                gridReportes.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--admin-text-muted);">No hay reportes generados.</p>';
                return;
            }
            reportes.forEach(r => {
                const clase = TIPO_REPORTE_CLASE[r.tipo_reporte] || 'blue';
                const card = document.createElement('div');
                card.className = 'reporte-card';
                card.innerHTML = `
                    <div class="reporte-header">
                        <span class="badge ${clase}">${BV.escapar(r.tipo_reporte || 'General')}</span>
                        <span style="font-size:0.75rem;color:var(--admin-text-muted);">${r.fecha_generacion ? r.fecha_generacion.split(' ')[0] : '—'}</span>
                    </div>
                    <h3 class="reporte-titulo">${BV.escapar(r.titulo)}</h3>
                    <p class="reporte-desc">${BV.escapar(r.descripcion || '—')}</p>
                    <p style="font-size:0.78rem;color:var(--admin-text-muted);margin-top:8px;">
                        <i class="fa-solid fa-user"></i> ${BV.escapar(r.generado_por || '—')}
                    </p>
                `;
                gridReportes.appendChild(card);
            });
        } catch (e) {
            console.error('Error al cargar reportes:', e);
            if (gridReportes) gridReportes.innerHTML = '<p style="text-align:center;color:var(--red);">Error al cargar reportes.</p>';
        }
    }

    // Cargar todos los datos del inventario y administración
    async function inicializarInventario() {
        await Promise.all([
            cargarProductos(),
            cargarMarcas(),
            cargarCategorias(),
            cargarUsuarios(),
            cargarRoles(),
            cargarProveedores(),
            cargarVentas(),
            cargarDevoluciones(),
            cargarCompras(),
            cargarCitas(),
            cargarRecetas(),
            cargarPromociones(),
            cargarReportes()
        ]);
    }

    // Recargar la sección correspondiente cuando el usuario cambia de pestaña
    if (window.PanelNav && typeof window.PanelNav.alCambiar === 'function') {
        window.PanelNav.alCambiar((seccion) => {
            if (seccion === 'ventas') { cargarVentas(); cargarDevoluciones(); }
            else if (seccion === 'compras') { cargarCompras(); cargarProveedores(); }
            else if (seccion === 'citas') { cargarCitas(); cargarRecetas(); }
            else if (seccion === 'promociones') { cargarPromociones(); }
            else if (seccion === 'reportes') { cargarReportes(); }
            else if (seccion === 'catalogo') { cargarProductos(); cargarMarcas(); cargarCategorias(); }
            else if (seccion === 'usuarios') { cargarUsuarios(); cargarRoles(); }
        });
    }

    // Iniciar carga al estar listo el DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicializarInventario);
    } else {
        inicializarInventario();
    }
})();
