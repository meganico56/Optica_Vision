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
    let editandoId = null;
    let tipoModal = null; // 'producto', 'marca', 'categoria'
    let nuevaImagenBase64 = null;
    let nombreNuevaImagen = null;

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

    // Abrir Modal de Producto (Nuevo o Editar)
    function abrirModalProducto(producto = null) {
        tipoModal = 'producto';
        editandoId = producto ? producto.id : null;
        nuevaImagenBase64 = null;
        nombreNuevaImagen = null;

        if (modalTitulo) modalTitulo.textContent = producto ? 'Editar producto' : 'Nuevo producto';
        if (modalError) modalError.hidden = true;

        const p = producto || {};
        const imagenInicial = p.imagen || 'gafas-modelo1.png';

        modalCampos.innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div style="grid-column:1/-1;">
                    <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--text-muted);">Nombre del producto *</label>
                    <input type="text" id="mNombre" class="input-admin" value="${BV.escapar(p.nombre || '')}" required style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid var(--border-color);background:var(--bg-input);color:var(--text-main);">
                </div>

                <div style="grid-column:1/-1;background:rgba(255,255,255,0.03);padding:12px;border-radius:8px;border:1px dashed var(--border-color);">
                    <label style="display:block;margin-bottom:8px;font-size:0.85rem;color:var(--gold);font-weight:600;"><i class="fa-solid fa-image"></i> Imagen del Producto *</label>
                    <div style="display:flex;gap:15px;align-items:center;">
                        <img id="mPreviewImg" src="${RUTA_IMAGENES + imagenInicial}" alt="Vista previa" style="width:65px;height:65px;object-fit:contain;background:#000;border-radius:6px;border:1px solid var(--border-color);padding:3px;">
                        <div style="flex:1;">
                            <div style="margin-bottom:6px;">
                                <span style="font-size:0.75rem;color:var(--text-muted);">Seleccionar existente:</span>
                                <select id="mImagenSelect" class="input-admin" style="width:100%;padding:6px 10px;border-radius:6px;border:1px solid var(--border-color);background:var(--bg-input);color:var(--text-main);font-size:0.85rem;">
                                    ${IMAGENES_DISPONIBLES.map(img => `<option value="${img}" ${imagenInicial === img ? 'selected' : ''}>${img}</option>`).join('')}
                                    ${!IMAGENES_DISPONIBLES.includes(imagenInicial) ? `<option value="${imagenInicial}" selected>${imagenInicial}</option>` : ''}
                                </select>
                            </div>
                            <div>
                                <span style="font-size:0.75rem;color:var(--text-muted);">o Subir nueva imagen desde tu equipo:</span>
                                <input type="file" id="mImagenFile" accept="image/*" style="width:100%;font-size:0.8rem;color:var(--text-muted);margin-top:2px;">
                            </div>
                        </div>
                    </div>
                </div>

                <div style="grid-column:1/-1;">
                    <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--text-muted);">Descripción</label>
                    <textarea id="mDescripcion" class="input-admin" rows="2" style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid var(--border-color);background:var(--bg-input);color:var(--text-main);">${BV.escapar(p.descripcion || '')}</textarea>
                </div>
                <div>
                    <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--text-muted);">Precio (COP) *</label>
                    <input type="number" id="mPrecio" class="input-admin" value="${p.precio || ''}" required min="0" step="1000" style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid var(--border-color);background:var(--bg-input);color:var(--text-main);">
                </div>
                <div>
                    <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--text-muted);">Stock actual *</label>
                    <input type="number" id="mStock" class="input-admin" value="${p.existencia_actual !== undefined ? p.existencia_actual : (p.stock !== undefined ? p.stock : 10)}" min="0" required style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid var(--border-color);background:var(--bg-input);color:var(--text-main);">
                </div>
                <div>
                    <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--text-muted);">Stock mínimo *</label>
                    <input type="number" id="mMinimo" class="input-admin" value="${p.existencia_minima || 3}" min="1" required style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid var(--border-color);background:var(--bg-input);color:var(--text-main);">
                </div>
                <div>
                    <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--text-muted);">Categoría</label>
                    <select id="mCategoria" class="input-admin" style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid var(--border-color);background:var(--bg-input);color:var(--text-main);">
                        <option value="1" ${p.id_categoria == 1 ? 'selected' : ''}>Monturas</option>
                        <option value="2" ${p.id_categoria == 2 ? 'selected' : ''}>Gafas de sol</option>
                        <option value="3" ${p.id_categoria == 3 ? 'selected' : ''}>Lentes de contacto</option>
                        <option value="4" ${p.id_categoria == 4 ? 'selected' : ''}>Lentes oftalmicos</option>
                        <option value="5" ${p.id_categoria == 5 ? 'selected' : ''}>Soluciones de limpieza</option>
                        <option value="6" ${p.id_categoria == 6 ? 'selected' : ''}>Accesorios</option>
                    </select>
                </div>
                <div>
                    <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--text-muted);">Marca</label>
                    <select id="mMarca" class="input-admin" style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid var(--border-color);background:var(--bg-input);color:var(--text-main);">
                        <option value="1" ${p.id_marca == 1 ? 'selected' : ''}>Ray-Ban</option>
                        <option value="2" ${p.id_marca == 2 ? 'selected' : ''}>Vogue Eyewear</option>
                        <option value="3" ${p.id_marca == 3 ? 'selected' : ''}>Essilor</option>
                        <option value="4" ${p.id_marca == 4 ? 'selected' : ''}>Acuvue</option>
                        <option value="5" ${p.id_marca == 5 ? 'selected' : ''}>Vision Clara (marca propia)</option>
                    </select>
                </div>
                <div>
                    <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--text-muted);">Material</label>
                    <input type="text" id="mMaterial" class="input-admin" value="${BV.escapar(p.material || 'Acetato')}" style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid var(--border-color);background:var(--bg-input);color:var(--text-main);">
                </div>
                <div>
                    <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--text-muted);">Género</label>
                    <select id="mGenero" class="input-admin" style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid var(--border-color);background:var(--bg-input);color:var(--text-main);">
                        <option value="Unisex" ${p.genero === 'Unisex' ? 'selected' : ''}>Unisex</option>
                        <option value="Mujer" ${p.genero === 'Mujer' ? 'selected' : ''}>Mujer</option>
                        <option value="Hombre" ${p.genero === 'Hombre' ? 'selected' : ''}>Hombre</option>
                        <option value="Infantil" ${p.genero === 'Infantil' ? 'selected' : ''}>Infantil</option>
                    </select>
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
                    // Si se seleccionó un archivo nuevo desde el equipo, subirlo primero
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
            } else {
                modal.close();
            }
        });
    }

    // Botón Cancelar del Modal
    if (modalCancelar) {
        modalCancelar.addEventListener('click', () => {
            if (typeof modal.close === 'function') modal.close();
            else modal.removeAttribute('open');
        });
    }

    // Delegación de eventos para editar/eliminar producto y nuevo producto
    document.addEventListener('click', async (e) => {
        const btnNuevoProd = e.target.closest('[data-nuevo="producto"]');
        if (btnNuevoProd) {
            e.preventDefault();
            abrirModalProducto();
            return;
        }

        const btnEdit = e.target.closest('[data-editar-prod]');
        if (btnEdit) {
            e.preventDefault();
            const id = btnEdit.dataset.editarProd;
            const producto = productosMemoria.find(p => String(p.id) === String(id));
            if (producto) abrirModalProducto(producto);
            return;
        }

        const btnDel = e.target.closest('[data-eliminar-prod]');
        if (btnDel) {
            e.preventDefault();
            const id = btnDel.dataset.eliminarProd;
            if (confirm('¿Estás seguro de que deseas eliminar este producto?')) {
                try {
                    await Api.del('/api/productos/' + id);
                    cargarProductos();
                } catch (err) {
                    alert('Error al eliminar el producto: ' + err.message);
                }
            }
        }
    });

    // Iniciar carga al estar listo el DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', cargarProductos);
    } else {
        cargarProductos();
    }
})();
