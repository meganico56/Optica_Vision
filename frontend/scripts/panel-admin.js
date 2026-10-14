// panel-admin.js - Lógica del Panel de Administrador: Productos, Categorías, Marcas y Dashboard.
// Requiere api.js, sesion.js y panel-navegacion.js cargados antes.

(function () {
    'use strict';

    const RUTA_IMAGENES = '../imagenes/productos/';

    // Referencias DOM
    const tbProductos = document.getElementById('tbProductos');
    const tbMarcas = document.getElementById('tbMarcas');
    const tbCategorias = document.getElementById('tbCategorias');

    const kpiIngresos = document.getElementById('kpiIngresos');
    const kpiVentas = document.getElementById('kpiVentas');
    const kpiCitas = document.getElementById('kpiCitas');
    const kpiClientes = document.getElementById('kpiClientes');
    const kpiBajoMinimo = document.getElementById('kpiBajoMinimo');
    const kpiProductos = document.getElementById('kpiProductos');
    const kpiBajoMinimo2 = document.getElementById('kpiBajoMinimo2');
    const kpiCategorias = document.getElementById('kpiCategorias');

    const modal = document.getElementById('modal');
    const formModal = document.getElementById('formModal');
    const modalTitulo = document.getElementById('modalTitulo');
    const modalCampos = document.getElementById('modalCampos');
    const modalError = document.getElementById('modalError');
    const modalCancelar = document.getElementById('modalCancelar');

    let productosMemoria = [];
    let marcasMemoria = [];
    let categoriasMemoria = [];
    let editandoId = null;
    let tipoModal = null; // 'producto', 'marca', 'categoria'
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
    });

    // Cargar todos los datos del inventario
    async function inicializarInventario() {
        await Promise.all([cargarProductos(), cargarMarcas(), cargarCategorias()]);
    }

    // Iniciar carga al estar listo el DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicializarInventario);
    } else {
        inicializarInventario();
    }
})();
