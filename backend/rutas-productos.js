module.exports = function registrarRutas(app) {
  const { db, rutasSuspension, fs, path, DIRECTORIO_IMAGENES_PRODUCTOS, DIRECTORIO_MODELOS_3D, MAX_MODELO_3D_BYTES, IMAGENES_VECTOR_CATALOGO, imagenProductoDisponible, resolverImagenProducto, modelo3dDisponible, resolverModelo3d, verificarSesion, verificarAdministrador } = require("./contexto-rutas");

  app.get("/api/imagenes-productos", async (req, res) => {
    try {
      const archivos = await fs.promises.readdir(DIRECTORIO_IMAGENES_PRODUCTOS, {
        withFileTypes: true,
      });
      const imagenes = archivos
        .filter(
          (archivo) =>
            archivo.isFile() &&
            (/\.(png|jpe?g|webp|gif)$/i.test(archivo.name) ||
              IMAGENES_VECTOR_CATALOGO.has(archivo.name)),
        )
        .map((archivo) => archivo.name)
        .sort((a, b) => a.localeCompare(b));

      res.json(imagenes);
    } catch (error) {
      console.error("Error al listar imágenes de productos:", error);
      res
        .status(500)
        .json({ mensaje: "No se pudieron consultar las imágenes de productos" });
    }
  });

  // Ruta para subir imagen de producto
  app.post("/api/upload-imagen", (req, res) => {
    const { nombreArchivo, base64Data } = req.body;
    if (!nombreArchivo || !base64Data) {
      return res
        .status(400)
        .json({ mensaje: "Falta el nombre de archivo o los datos de la imagen" });
    }

    try {
      const ext = path.extname(nombreArchivo) || ".png";
      const nombreLimpio = path
        .basename(nombreArchivo, ext)
        .replace(/[^a-zA-Z0-9-_]/g, "");
      const safeName = `${Date.now()}-${nombreLimpio}${ext}`;
      const rutaDestino = path.join(
        __dirname,
        "..",
        "frontend",
        "imagenes",
        "productos",
        safeName,
      );

      const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(cleanBase64, "base64");

      fs.writeFileSync(rutaDestino, buffer);
      res.json({ mensaje: "Imagen subida con éxito", filename: safeName });
    } catch (error) {
      console.error("Error al subir imagen:", error);
      res.status(500).json({ mensaje: "Error interno al guardar la imagen" });
    }
  });

  app.post("/api/upload-modelo-3d", verificarAdministrador, async (req, res) => {
    const { nombreArchivo, base64Data } = req.body || {};
    if (
      typeof nombreArchivo !== "string" ||
      path.basename(nombreArchivo) !== nombreArchivo ||
      !/\.glb$/i.test(nombreArchivo) ||
      typeof base64Data !== "string"
    ) {
      return res.status(400).json({ mensaje: "Selecciona un archivo GLB válido" });
    }

    const encoded = /^data:[^;,]+;base64,([A-Za-z0-9+/]+={0,2})$/.exec(
      base64Data,
    );
    if (!encoded) {
      return res.status(400).json({ mensaje: "El archivo GLB no tiene un formato válido" });
    }

    const buffer = Buffer.from(encoded[1], "base64");
    if (
      buffer.length === 0 ||
      buffer.length > MAX_MODELO_3D_BYTES ||
      buffer.toString("base64") !== encoded[1] ||
      buffer.toString("ascii", 0, 4) !== "glTF" ||
      buffer.length < 12 ||
      buffer.readUInt32LE(4) !== 2 ||
      buffer.readUInt32LE(8) !== buffer.length
    ) {
      return res.status(400).json({
        mensaje: "El archivo debe ser un GLB 2.0 válido de máximo 10 MB",
      });
    }

    const nombreBase = path
      .basename(nombreArchivo, path.extname(nombreArchivo))
      .replace(/[^a-zA-Z0-9-_]/g, "");
    const filename = `${Date.now()}-${nombreBase || "modelo"}.glb`;

    try {
      await fs.promises.mkdir(DIRECTORIO_MODELOS_3D, { recursive: true });
      await fs.promises.writeFile(
        path.join(DIRECTORIO_MODELOS_3D, filename),
        buffer,
        { flag: "wx" },
      );
      res.status(201).json({ mensaje: "Modelo 3D guardado", filename });
    } catch (error) {
      console.error("Error al guardar el modelo 3D:", error);
      res.status(500).json({ mensaje: "No se pudo guardar el modelo 3D" });
    }
  });

  app.get("/api/productos", async (req, res) => {
    const { q: busqueda, categoria, genero, vista } = req.query;

    try {
      await rutasSuspension.asegurarTabla();
      let query = `
        SELECT p.*, c.nombre AS categoria_nombre, m.nombre AS marca_nombre,
          EXISTS (
            SELECT 1
            FROM panel_suspensiones ps
            WHERE BINARY ps.tipo = BINARY 'producto'
            AND BINARY ps.id_registro = BINARY CAST(p.id_producto AS CHAR)
          ) AS suspendido
        FROM producto p
        LEFT JOIN categoria c ON p.id_categoria = c.id_categoria
        LEFT JOIN marca m ON p.id_marca = m.id_marca
        WHERE 1=1
      `;

      if (vista === "publica") {
        query += ` AND p.estado = 'Activo' AND NOT EXISTS (
          SELECT 1
          FROM panel_suspensiones ps
          WHERE BINARY ps.tipo = BINARY 'producto'
          AND BINARY ps.id_registro = BINARY CAST(p.id_producto AS CHAR)
        )`;
      }
      let params = [];

      if (busqueda && busqueda.trim() !== "") {
        query += " AND (p.nombre LIKE ? OR p.descripcion LIKE ?)";
        params.push(`%${busqueda}%`, `%${busqueda}%`);
      }

      if (
        categoria &&
        categoria.trim() !== "" &&
        categoria.toUpperCase() !== "TODOS"
      ) {
        query += " AND (LOWER(c.nombre) = LOWER(?) OR p.id_categoria = ?)";
        params.push(categoria, categoria);
      }

      if (typeof genero === "string" && genero.trim() !== "") {
        query += " AND LOWER(p.genero) = LOWER(?)";
        params.push(genero.trim());
      }

      const [filas] = await db.query(query, params);
      const adaptados = filas.map((p) => ({
        id: p.id_producto,
        id_producto: p.id_producto,
        sku: p.sku,
        nombre: p.nombre,
        descripcion: p.descripcion,
        precio: p.precio,
        imagen: resolverImagenProducto(p.imagen),
        modelo_3d: resolverModelo3d(p.modelo_3d),
        material: p.material,
        color: p.color,
        calibre: p.calibre,
        genero: p.genero,
        existencia_actual: p.existencia_actual,
        existencia_minima: p.existencia_minima,
        stock: p.existencia_actual,
        id_categoria: p.id_categoria,
        id_marca: p.id_marca,
        categoria: p.categoria_nombre || "Gafas",
        marca: p.marca_nombre || "Óptica Visión",
        estado: p.estado,
        suspendido: Number(p.suspendido) === 1,
      }));
      res.json(adaptados);
    } catch (error) {
      console.error("Error al consultar MySQL en /api/productos:", error);
      res.status(500).json({
        error: "Error interno del servidor",
        detalle: error.message,
      });
    }
  });

  // Crear un nuevo producto (POST /api/productos)
  app.post("/api/productos", verificarSesion, async (req, res) => {
    const {
      sku,
      costo_compra,
      nombre,
      descripcion,
      precio,
      imagen,
      modelo_3d,
      material,
      color,
      calibre,
      genero,
      existencia_actual,
      existencia_minima,
      id_categoria,
      id_marca,
      estado,
    } = req.body;

    if (!nombre || !precio || !imagen) {
      return res
        .status(400)
        .json({ mensaje: "Nombre, precio e imagen son obligatorios" });
    }
    if (!imagenProductoDisponible(imagen)) {
      return res.status(400).json({
        mensaje: "Selecciona una imagen existente del catálogo de productos",
      });
    }
    if (modelo_3d && !modelo3dDisponible(modelo_3d)) {
      return res.status(400).json({
        mensaje: "Selecciona un modelo GLB existente en el catálogo",
      });
    }

    try {
      // El SKU es obligatorio y único en la base de datos; si el formulario no lo envía se genera uno
      const skuFinal =
        sku && String(sku).trim()
          ? String(sku).trim()
          : "SKU-" + Date.now().toString(36).toUpperCase();

      const [result] = await db.query(
        `INSERT INTO producto (sku, nombre, descripcion, precio, costo_compra, imagen, modelo_3d, material, color, calibre, genero, existencia_actual, existencia_minima, id_categoria, id_marca, estado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          skuFinal,
          nombre,
          descripcion || "",
          precio,
          costo_compra || 0,
          imagen,
          modelo_3d || null,
          material || "Acetato",
          color || null,
          calibre || null,
          genero || "Unisex",
          existencia_actual !== undefined ? existencia_actual : 10,
          existencia_minima !== undefined ? existencia_minima : 3,
          id_categoria || 1,
          id_marca || 1,
          estado || "Activo",
        ],
      );

      res.status(201).json({
        mensaje: "Producto creado con éxito",
        id_producto: result.insertId,
      });
    } catch (error) {
      console.error("Error al crear producto:", error);
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          mensaje:
            "Ya existe un producto con ese SKU o con ese nombre para la misma marca",
        });
      }
      res
        .status(500)
        .json({ mensaje: "Error al crear el producto", detalle: error.message });
    }
  });

  // Actualizar un producto (PUT /api/productos/:id)
  app.put("/api/productos/:id", async (req, res) => {
    const { id } = req.params;
    const {
      sku,
      costo_compra,
      nombre,
      descripcion,
      precio,
      imagen,
      modelo_3d,
      material,
      color,
      calibre,
      genero,
      existencia_actual,
      existencia_minima,
      id_categoria,
      id_marca,
      estado,
    } = req.body;

    if (
      imagen !== undefined &&
      imagen !== null &&
      !imagenProductoDisponible(imagen)
    ) {
      return res.status(400).json({
        mensaje: "Selecciona una imagen existente del catálogo de productos",
      });
    }
    if (
      modelo_3d !== undefined &&
      modelo_3d !== null &&
      modelo_3d !== "" &&
      !modelo3dDisponible(modelo_3d)
    ) {
      return res.status(400).json({
        mensaje: "Selecciona un modelo GLB existente en el catálogo",
      });
    }

    try {
      await db.query(
        `UPDATE producto SET
           sku = COALESCE(?, sku),
           costo_compra = COALESCE(?, costo_compra),
           nombre = COALESCE(?, nombre),
           descripcion = COALESCE(?, descripcion),
           precio = COALESCE(?, precio),
           imagen = COALESCE(?, imagen),
           modelo_3d = COALESCE(?, modelo_3d),
           material = COALESCE(?, material),
           color = COALESCE(?, color),
           calibre = COALESCE(?, calibre),
           genero = COALESCE(?, genero),
           existencia_actual = COALESCE(?, existencia_actual),
           existencia_minima = COALESCE(?, existencia_minima),
           id_categoria = COALESCE(?, id_categoria),
           id_marca = COALESCE(?, id_marca),
           estado = COALESCE(?, estado)
         WHERE id_producto = ?`,
        [
          sku || null,
          costo_compra,
          nombre,
          descripcion,
          precio,
          imagen,
          modelo_3d,
          material,
          color,
          calibre,
          genero,
          existencia_actual,
          existencia_minima,
          id_categoria,
          id_marca,
          estado,
          id,
        ],
      );

      res.json({ mensaje: "Producto actualizado correctamente" });
    } catch (error) {
      console.error("Error al actualizar producto:", error);
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          mensaje:
            "Ya existe un producto con ese SKU o con ese nombre para la misma marca",
        });
      }
      res.status(500).json({
        mensaje: "Error al actualizar el producto",
        detalle: error.message,
      });
    }
  });

  // Eliminar un producto (DELETE /api/productos/:id)
  app.delete("/api/productos/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await db.query("DELETE FROM producto WHERE id_producto = ?", [id]);
      res.json({ mensaje: "Producto eliminado correctamente" });
    } catch (error) {
      console.error("Error al eliminar producto:", error);
      res.status(500).json({
        mensaje: "Error al eliminar el producto",
        detalle: error.message,
      });
    }
  });

  // Rutas para Marcas
  app.get("/api/productos/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await rutasSuspension.asegurarTabla();
      const [filas] = await db.query(
        `SELECT p.*, c.nombre AS categoria, m.nombre AS marca
         FROM producto p
         LEFT JOIN categoria c ON p.id_categoria = c.id_categoria
         LEFT JOIN marca m ON p.id_marca = m.id_marca
         WHERE p.id_producto = ?
         AND p.estado = 'Activo'
         AND NOT EXISTS (
           SELECT 1
           FROM panel_suspensiones ps
           WHERE BINARY ps.tipo = BINARY 'producto'
           AND BINARY ps.id_registro = BINARY CAST(p.id_producto AS CHAR)
         )`,
        [id],
      );

      if (filas.length === 0) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }

      const p = filas[0];
      res.json({
        id: p.id_producto,
        nombre: p.nombre,
        descripcion: p.descripcion,
        precio: p.precio,
        imagen: resolverImagenProducto(p.imagen),
        modelo_3d: resolverModelo3d(p.modelo_3d),
        material: p.material,
        color: p.color,
        calibre: p.calibre,
        genero: p.genero,
        existencia_actual: p.existencia_actual,
        stock: p.existencia_actual,
        categoria: p.categoria || "Gafas",
        marca: p.marca || "Óptica Visión",
      });
    } catch (error) {
      console.error("Error en GET /api/productos/:id:", error);
      res.status(500).json({
        error: "Error al consultar el producto",
        detalle: error.message,
      });
    }
  });

  // Ruta para agendar cita desde la web (Tabla cita)
};
