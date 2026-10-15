const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const db = require("./db");

const fs = require("fs");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json({ limit: "15mb" }));

// Sirve el frontend para que el panel pueda abrirse desde el mismo puerto de la API
app.use(express.static(path.join(__dirname, "../frontend")));

// Ruta para subir imagen de producto
app.post("/api/upload-imagen", (req, res) => {
  const { nombreArchivo, base64Data } = req.body;
  if (!nombreArchivo || !base64Data) {
    return res.status(400).json({ mensaje: "Falta el nombre de archivo o los datos de la imagen" });
  }

  try {
    const ext = path.extname(nombreArchivo) || '.png';
    const nombreLimpio = path.basename(nombreArchivo, ext).replace(/[^a-zA-Z0-9-_]/g, '');
    const safeName = `${Date.now()}-${nombreLimpio}${ext}`;
    const rutaDestino = path.join(__dirname, "..", "frontend", "imagenes", "productos", safeName);

    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");

    fs.writeFileSync(rutaDestino, buffer);
    res.json({ mensaje: "Imagen subida con éxito", filename: safeName });
  } catch (error) {
    console.error("Error al subir imagen:", error);
    res.status(500).json({ mensaje: "Error interno al guardar la imagen" });
  }
});

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("API de Óptica Visión funcionando correctamente");
});

// Ruta para obtener productos (soporta filtro por categoria ?categoria= y búsqueda ?q=)
app.get("/api/productos", async (req, res) => {
  const { q: busqueda, categoria } = req.query;

  try {
    let query = `
      SELECT p.*, c.nombre AS categoria_nombre, m.nombre AS marca_nombre
      FROM producto p
      LEFT JOIN categoria c ON p.id_categoria = c.id_categoria
      LEFT JOIN marca m ON p.id_marca = m.id_marca
      WHERE 1=1
    `;
    let params = [];

    if (busqueda && busqueda.trim() !== "") {
      query += " AND (p.nombre LIKE ? OR p.descripcion LIKE ?)";
      params.push(`%${busqueda}%`, `%${busqueda}%`);
    }

    if (categoria && categoria.trim() !== "" && categoria.toUpperCase() !== "TODOS") {
      query += " AND (LOWER(c.nombre) = LOWER(?) OR p.id_categoria = ?)";
      params.push(categoria, categoria);
    }

    const [filas] = await db.query(query, params);
    const adaptados = filas.map(p => ({
      id: p.id_producto,
      id_producto: p.id_producto,
      nombre: p.nombre,
      descripcion: p.descripcion,
      precio: p.precio,
      imagen: p.imagen,
      material: p.material,
      genero: p.genero,
      existencia_actual: p.existencia_actual,
      existencia_minima: p.existencia_minima,
      stock: p.existencia_actual,
      id_categoria: p.id_categoria,
      id_marca: p.id_marca,
      categoria: p.categoria_nombre || "Gafas",
      marca: p.marca_nombre || "Óptica Visión",
      estado: p.estado
    }));
    res.json(adaptados);
  } catch (error) {
    console.error("Error al consultar MySQL en /api/productos:", error);
    res.status(500).json({
      error: "Error interno del servidor",
      detalle: error.message
    });
  }
});

// Crear un nuevo producto (POST /api/productos)
app.post("/api/productos", async (req, res) => {
  const { nombre, descripcion, precio, imagen, material, genero, existencia_actual, existencia_minima, id_categoria, id_marca, estado } = req.body;

  if (!nombre || !precio || !imagen) {
    return res.status(400).json({ mensaje: "Nombre, precio e imagen son obligatorios" });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO producto (nombre, descripcion, precio, imagen, material, genero, existencia_actual, existencia_minima, id_categoria, id_marca, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre,
        descripcion || '',
        precio,
        imagen,
        material || 'Acetato',
        genero || 'Unisex',
        existencia_actual !== undefined ? existencia_actual : 10,
        existencia_minima !== undefined ? existencia_minima : 3,
        id_categoria || 1,
        id_marca || 1,
        estado || 'Activo'
      ]
    );

    res.status(201).json({ mensaje: "Producto creado con éxito", id_producto: result.insertId });
  } catch (error) {
    console.error("Error al crear producto:", error);
    res.status(500).json({ mensaje: "Error al crear el producto", detalle: error.message });
  }
});

// Actualizar un producto (PUT /api/productos/:id)
app.put("/api/productos/:id", async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, precio, imagen, material, genero, existencia_actual, existencia_minima, id_categoria, id_marca, estado } = req.body;

  try {
    await db.query(
      `UPDATE producto SET 
         nombre = COALESCE(?, nombre),
         descripcion = COALESCE(?, descripcion),
         precio = COALESCE(?, precio),
         imagen = COALESCE(?, imagen),
         material = COALESCE(?, material),
         genero = COALESCE(?, genero),
         existencia_actual = COALESCE(?, existencia_actual),
         existencia_minima = COALESCE(?, existencia_minima),
         id_categoria = COALESCE(?, id_categoria),
         id_marca = COALESCE(?, id_marca),
         estado = COALESCE(?, estado)
       WHERE id_producto = ?`,
      [nombre, descripcion, precio, imagen, material, genero, existencia_actual, existencia_minima, id_categoria, id_marca, estado, id]
    );

    res.json({ mensaje: "Producto actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    res.status(500).json({ mensaje: "Error al actualizar el producto", detalle: error.message });
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
    res.status(500).json({ mensaje: "Error al eliminar el producto", detalle: error.message });
  }
});

// Rutas para Marcas
app.get("/api/marcas", async (req, res) => {
  try {
    const [marcas] = await db.query("SELECT * FROM marca ORDER BY nombre ASC");
    res.json(marcas);
  } catch (error) {
    console.error("Error al obtener marcas:", error);
    res.status(500).json({ error: "Error al obtener marcas" });
  }
});

app.post("/api/marcas", async (req, res) => {
  const { nombre, pais_origen, estado } = req.body;
  if (!nombre) {
    return res.status(400).json({ error: "El nombre de la marca es obligatorio" });
  }
  try {
    const [resultado] = await db.query(
      "INSERT INTO marca (nombre, pais_origen, estado) VALUES (?, ?, ?)",
      [nombre, pais_origen || null, estado || "Activo"]
    );
    res.status(201).json({ mensaje: "Marca creada con éxito", id_marca: resultado.insertId });
  } catch (error) {
    console.error("Error al crear marca:", error);
    res.status(500).json({ error: "Error al crear la marca", detalle: error.message });
  }
});

app.put("/api/marcas/:id", async (req, res) => {
  const { id } = req.params;
  const { nombre, pais_origen, estado } = req.body;
  try {
    await db.query(
      "UPDATE marca SET nombre = COALESCE(?, nombre), pais_origen = COALESCE(?, pais_origen), estado = COALESCE(?, estado) WHERE id_marca = ?",
      [nombre, pais_origen, estado, id]
    );
    res.json({ mensaje: "Marca actualizada con éxito" });
  } catch (error) {
    console.error("Error al actualizar marca:", error);
    res.status(500).json({ error: "Error al actualizar la marca" });
  }
});

app.delete("/api/marcas/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM marca WHERE id_marca = ?", [id]);
    res.json({ mensaje: "Marca eliminada con éxito" });
  } catch (error) {
    console.error("Error al eliminar marca:", error);
    res.status(500).json({ error: "No se puede eliminar la marca porque tiene productos asociados o ocurrió un error." });
  }
});

// Rutas para Categorías
app.get("/api/categorias", async (req, res) => {
  try {
    const [categorias] = await db.query("SELECT * FROM categoria ORDER BY nombre ASC");
    res.json(categorias);
  } catch (error) {
    console.error("Error al obtener categorías:", error);
    res.status(500).json({ error: "Error al obtener categorías" });
  }
});

app.post("/api/categorias", async (req, res) => {
  const { nombre, descripcion, estado } = req.body;
  if (!nombre) {
    return res.status(400).json({ error: "El nombre de la categoría es obligatorio" });
  }
  try {
    const [resultado] = await db.query(
      "INSERT INTO categoria (nombre, descripcion, estado) VALUES (?, ?, ?)",
      [nombre, descripcion || null, estado || "Activo"]
    );
    res.status(201).json({ mensaje: "Categoría creada con éxito", id_categoria: resultado.insertId });
  } catch (error) {
    console.error("Error al crear categoría:", error);
    res.status(500).json({ error: "Error al crear la categoría", detalle: error.message });
  }
});

app.put("/api/categorias/:id", async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, estado } = req.body;
  try {
    await db.query(
      "UPDATE categoria SET nombre = COALESCE(?, nombre), descripcion = COALESCE(?, descripcion), estado = COALESCE(?, estado) WHERE id_categoria = ?",
      [nombre, descripcion, estado, id]
    );
    res.json({ mensaje: "Categoría actualizada con éxito" });
  } catch (error) {
    console.error("Error al actualizar categoría:", error);
    res.status(500).json({ error: "Error al actualizar la categoría" });
  }
});

app.delete("/api/categorias/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM categoria WHERE id_categoria = ?", [id]);
    res.json({ mensaje: "Categoría eliminada con éxito" });
  } catch (error) {
    console.error("Error al eliminar categoría:", error);
    res.status(500).json({ error: "No se puede eliminar la categoría porque tiene productos asociados o ocurrió un error." });
  }
});



// Ruta para obtener un producto por su ID
app.get("/api/productos/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [filas] = await db.query(
      `SELECT p.*, c.nombre AS categoria, m.nombre AS marca 
       FROM producto p 
       LEFT JOIN categoria c ON p.id_categoria = c.id_categoria 
       LEFT JOIN marca m ON p.id_marca = m.id_marca 
       WHERE p.id_producto = ?`,
      [id]
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
      imagen: p.imagen,
      material: p.material,
      genero: p.genero,
      existencia_actual: p.existencia_actual,
      stock: p.existencia_actual,
      categoria: p.categoria || "Gafas",
      marca: p.marca || "Óptica Visión"
    });
  } catch (error) {
    console.error("Error en GET /api/productos/:id:", error);
    res.status(500).json({ error: "Error al consultar el producto", detalle: error.message });
  }
});

// Ruta para agendar cita (Tabla cita)
app.post("/api/citas", async (req, res) => {
  const { id_usuario, fecha_cita, hora_cita, motivo, estado } = req.body;

  if (!fecha_cita || !hora_cita) {
    return res.status(400).json({ error: "La fecha y la hora de la cita son obligatorias" });
  }

  try {
    const [resultado] = await db.query(
      "INSERT INTO cita (id_usuario, fecha_cita, hora_cita, motivo, estado) VALUES (?, ?, ?, ?, ?)",
      [
        id_usuario || null,
        fecha_cita,
        hora_cita,
        motivo || "Examen visual",
        estado || "Pendiente",
      ]
    );

    res.status(201).json({
      mensaje: "Cita agendada con éxito",
      id_cita: resultado.insertId,
    });
  } catch (error) {
    console.error("Error al agendar cita:", error);
    res.status(500).json({ error: "Error al registrar la cita" });
  }
});

// Ruta de autenticación / Login
app.post("/api/login", async (req, res) => {
  const { correo, contrasena } = req.body;

  if (!correo || !contrasena) {
    return res.status(400).json({ mensaje: "Por favor ingresa correo y contraseña" });
  }

  try {
    // 1. Buscar usuario solo por correo (la contraseña está hasheada con bcrypt)
    const [usuarios] = await db.query(
      "SELECT u.*, r.nombre_rol AS rol FROM usuario u LEFT JOIN rol r ON u.id_rol = r.id_rol WHERE u.correo = ?",
      [correo],
    );

    if (usuarios.length === 0) {
      return res.status(401).json({ mensaje: "Credenciales inválidas" });
    }

    const usuario = usuarios[0];

    // 2. Verificar la contraseña con bcrypt.compare()
    const contrasenaValida = await bcrypt.compare(contrasena, usuario.contrasena);
    if (!contrasenaValida) {
      return res.status(401).json({ mensaje: "Credenciales inválidas" });
    }

    res.json({
      mensaje: "Inicio de sesión exitoso",
      token: "session-" + usuario.id_usuario,   // token simple para compatibilidad con sesion.js
      usuario: {
        id: usuario.id_usuario,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// Ruta de registro de nuevo usuario (rol Cliente por defecto)
app.post("/api/registro", async (req, res) => {
  const { nombre, apellido, tipo_documento, num_documento, telefono, correo, direccion, fecha_nacimiento, contrasena } = req.body;

  if (!nombre || !apellido || !tipo_documento || !num_documento || !telefono || !correo || !fecha_nacimiento || !contrasena) {
    return res.status(400).json({ mensaje: "Todos los campos obligatorios deben estar completos" });
  }

  if (contrasena.length < 8) {
    return res.status(400).json({ mensaje: "La contraseña debe tener al menos 8 caracteres" });
  }

  try {
    // Verificar que no exista otro usuario con ese correo o documento
    const [existentes] = await db.query(
      "SELECT id_usuario FROM usuario WHERE correo = ? OR num_documento = ?",
      [correo, num_documento]
    );
    if (existentes.length > 0) {
      return res.status(409).json({ mensaje: "Ya existe una cuenta con ese correo o número de documento" });
    }

    // Obtener id del rol Cliente
    const [roles] = await db.query("SELECT id_rol FROM rol WHERE nombre_rol = 'Cliente'");
    if (roles.length === 0) {
      return res.status(500).json({ mensaje: "No se encontró el rol de Cliente en el sistema" });
    }
    const id_rol = roles[0].id_rol;

    const hash = await bcrypt.hash(contrasena, 10);

    await db.query(
      `INSERT INTO usuario (nombre, apellido, tipo_documento, num_documento, telefono, correo, direccion, fecha_nacimiento, contrasena, estado, id_rol)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Activo', ?)`,
      [nombre, apellido, tipo_documento, num_documento, telefono, correo, direccion || null, fecha_nacimiento, hash, id_rol]
    );

    res.status(201).json({ mensaje: "Cuenta creada con éxito" });
  } catch (error) {
    console.error("Error en /api/registro:", error);
    res.status(500).json({ mensaje: "Error interno al crear la cuenta" });
  }
});

// Rutas para Usuarios (panel de administrador)
const CAMPOS_USUARIO = `u.id_usuario, u.nombre, u.apellido, u.tipo_documento, u.num_documento, u.telefono,
  u.correo, u.direccion, u.fecha_nacimiento, u.estado, u.id_rol, r.nombre_rol AS rol`;

app.get("/api/roles", async (req, res) => {
  try {
    const [roles] = await db.query("SELECT id_rol, nombre_rol, descripcion FROM rol ORDER BY id_rol ASC");
    res.json(roles);
  } catch (error) {
    console.error("Error al obtener roles:", error);
    res.status(500).json({ error: "Error al obtener roles" });
  }
});

app.get("/api/usuarios", async (req, res) => {
  try {
    const [usuarios] = await db.query({
      sql: `SELECT ${CAMPOS_USUARIO} FROM usuario u LEFT JOIN rol r ON u.id_rol = r.id_rol ORDER BY u.id_usuario DESC`,
      dateStrings: true
    });
    res.json(usuarios);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({ error: "Error al obtener usuarios", detalle: error.message });
  }
});

app.post("/api/usuarios", async (req, res) => {
  const { nombre, apellido, tipo_documento, num_documento, telefono, correo, direccion, fecha_nacimiento, contrasena, estado, id_rol } = req.body;

  if (!nombre || !apellido || !tipo_documento || !num_documento || !telefono || !id_rol) {
    return res.status(400).json({ mensaje: "Nombre, apellido, documento, teléfono y rol son obligatorios" });
  }
  if (contrasena && contrasena.length < 8) {
    return res.status(400).json({ mensaje: "La contraseña debe tener al menos 8 caracteres" });
  }

  try {
    const hash = contrasena ? await bcrypt.hash(contrasena, 10) : null;
    const [resultado] = await db.query(
      `INSERT INTO usuario (nombre, apellido, tipo_documento, num_documento, telefono, correo, direccion, fecha_nacimiento, contrasena, estado, id_rol)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, apellido, tipo_documento, num_documento, telefono, correo || null, direccion || null, fecha_nacimiento || null, hash, estado || "Activo", id_rol]
    );
    res.status(201).json({ mensaje: "Usuario creado con éxito", id_usuario: resultado.insertId });
  } catch (error) {
    console.error("Error al crear usuario:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ mensaje: "Ya existe un usuario con ese correo o número de documento" });
    }
    res.status(500).json({ mensaje: "Error al crear el usuario", detalle: error.message });
  }
});

app.put("/api/usuarios/:id", async (req, res) => {
  const { id } = req.params;
  const { nombre, apellido, tipo_documento, num_documento, telefono, correo, direccion, fecha_nacimiento, contrasena, estado, id_rol } = req.body;

  if (contrasena && contrasena.length < 8) {
    return res.status(400).json({ mensaje: "La contraseña debe tener al menos 8 caracteres" });
  }

  try {
    const hash = contrasena ? await bcrypt.hash(contrasena, 10) : null;
    const [resultado] = await db.query(
      `UPDATE usuario SET
         nombre = COALESCE(?, nombre),
         apellido = COALESCE(?, apellido),
         tipo_documento = COALESCE(?, tipo_documento),
         num_documento = COALESCE(?, num_documento),
         telefono = COALESCE(?, telefono),
         correo = COALESCE(?, correo),
         direccion = COALESCE(?, direccion),
         fecha_nacimiento = COALESCE(?, fecha_nacimiento),
         contrasena = COALESCE(?, contrasena),
         estado = COALESCE(?, estado),
         id_rol = COALESCE(?, id_rol)
       WHERE id_usuario = ?`,
      [nombre, apellido, tipo_documento, num_documento, telefono, correo || null, direccion || null, fecha_nacimiento || null, hash, estado, id_rol, id]
    );
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }
    res.json({ mensaje: "Usuario actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ mensaje: "Ya existe un usuario con ese correo o número de documento" });
    }
    res.status(500).json({ mensaje: "Error al actualizar el usuario", detalle: error.message });
  }
});

app.delete("/api/usuarios/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM usuario WHERE id_usuario = ?", [id]);
    res.json({ mensaje: "Usuario eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    res.status(500).json({ mensaje: "No se puede eliminar el usuario porque tiene registros asociados (ventas, citas, etc.). Puedes marcarlo como Inactivo." });
  }
});

// Rutas para Proveedores (panel de administrador)
app.get("/api/proveedores", async (req, res) => {
  try {
    const [proveedores] = await db.query(
      "SELECT codigo_proveedor, nombre, nit, telefono, correo, direccion, estado FROM proveedor ORDER BY codigo_proveedor DESC"
    );
    res.json(proveedores);
  } catch (error) {
    console.error("Error al obtener proveedores:", error);
    res.status(500).json({ error: "Error al obtener proveedores", detalle: error.message });
  }
});

app.post("/api/proveedores", async (req, res) => {
  const { nombre, nit, telefono, correo, direccion, estado } = req.body;
  if (!nombre || !nit || !telefono || !correo) {
    return res.status(400).json({ mensaje: "Nombre, NIT, teléfono y correo son obligatorios" });
  }

  try {
    const [resultado] = await db.query(
      "INSERT INTO proveedor (nombre, nit, telefono, correo, direccion, estado) VALUES (?, ?, ?, ?, ?, ?)",
      [nombre, nit, telefono, correo, direccion || "", estado || "Activo"]
    );
    res.status(201).json({ mensaje: "Proveedor creado con éxito", codigo_proveedor: resultado.insertId });
  } catch (error) {
    console.error("Error al crear proveedor:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ mensaje: "Ya existe un proveedor con ese NIT" });
    }
    res.status(500).json({ mensaje: "Error al crear el proveedor", detalle: error.message });
  }
});

app.put("/api/proveedores/:id", async (req, res) => {
  const { id } = req.params;
  const { nombre, nit, telefono, correo, direccion, estado } = req.body;

  try {
    const [resultado] = await db.query(
      `UPDATE proveedor SET 
         nombre = COALESCE(?, nombre),
         nit = COALESCE(?, nit),
         telefono = COALESCE(?, telefono),
         correo = COALESCE(?, correo),
         direccion = COALESCE(?, direccion),
         estado = COALESCE(?, estado)
       WHERE codigo_proveedor = ?`,
      [nombre, nit, telefono, correo, direccion, estado, id]
    );
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: "Proveedor no encontrado" });
    }
    res.json({ mensaje: "Proveedor actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar proveedor:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ mensaje: "Ya existe un proveedor con ese NIT" });
    }
    res.status(500).json({ mensaje: "Error al actualizar el proveedor", detalle: error.message });
  }
});

app.delete("/api/proveedores/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM proveedor WHERE codigo_proveedor = ?", [id]);
    res.json({ mensaje: "Proveedor eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar proveedor:", error);
    res.status(500).json({ mensaje: "No se puede eliminar el proveedor porque tiene compras asociadas. Puedes cambiar su estado a Inactivo." });
  }
});

// ─────────────────────── VENTAS ───────────────────────
app.get("/api/ventas", async (req, res) => {
  try {
    const [rows] = await db.query({
      sql: `SELECT v.codigo_venta, v.fecha, v.total, v.estado, v.es_cotizacion,
               v.codigo_promocion, v.id_receta,
               CONCAT(u.nombre,' ',u.apellido) AS cliente,
               v.id_cliente
            FROM venta v
            LEFT JOIN usuario u ON v.id_cliente = u.id_usuario
            ORDER BY v.codigo_venta DESC`,
      dateStrings: true
    });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/ventas", async (req, res) => {
  const { id_cliente, total, estado, es_cotizacion, codigo_promocion, id_receta } = req.body;
  if (!id_cliente || !total) return res.status(400).json({ mensaje: "Cliente y total son obligatorios" });
  try {
    const [r] = await db.query(
      `INSERT INTO venta (fecha, total, estado, es_cotizacion, id_cliente, codigo_promocion, id_receta, id_usuario)
       VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?)`,
      [total, estado || "Pendiente", es_cotizacion || 0, id_cliente, codigo_promocion || null, id_receta || null, id_cliente]
    );
    res.status(201).json({ mensaje: "Venta registrada", codigo_venta: r.insertId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put("/api/ventas/:id", async (req, res) => {
  const { id } = req.params;
  const { total, estado, es_cotizacion, codigo_promocion, id_receta } = req.body;
  try {
    await db.query(
      `UPDATE venta SET total=COALESCE(?,total), estado=COALESCE(?,estado),
       es_cotizacion=COALESCE(?,es_cotizacion), codigo_promocion=COALESCE(?,codigo_promocion),
       id_receta=COALESCE(?,id_receta) WHERE codigo_venta=?`,
      [total, estado, es_cotizacion, codigo_promocion, id_receta, id]
    );
    res.json({ mensaje: "Venta actualizada" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/ventas/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM venta WHERE codigo_venta=?", [req.params.id]);
    res.json({ mensaje: "Venta eliminada" });
  } catch (e) { res.status(500).json({ mensaje: "No se puede eliminar, tiene registros asociados." }); }
});

// ─────────────────────── DEVOLUCIONES ───────────────────────
app.get("/api/devoluciones", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT d.id_devolucion, d.motivo, d.cantidad, d.observaciones,
             dv.codigo_venta,
             CONCAT(u.nombre,' ',u.apellido) AS registrado_por
      FROM devolucion d
      LEFT JOIN detalle_venta dv ON d.codigo_detalle_venta = dv.codigo_detalle_venta
      LEFT JOIN usuario u ON d.id_usuario = u.id_usuario
      ORDER BY d.id_devolucion DESC`);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────── COMPRAS ───────────────────────
app.get("/api/compras", async (req, res) => {
  try {
    const [rows] = await db.query({
      sql: `SELECT c.numero_compra, c.fecha, c.numero_comprobante, c.total, c.estado,
               p.nombre AS proveedor
            FROM compra c
            LEFT JOIN proveedor p ON c.codigo_proveedor = p.codigo_proveedor
            ORDER BY c.numero_compra DESC`,
      dateStrings: true
    });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────── CITAS ───────────────────────
app.get("/api/citas", async (req, res) => {
  try {
    const [rows] = await db.query({
      sql: `SELECT c.id_cita, c.fecha_hora, c.motivo, c.estado, c.observaciones,
               CONCAT(cl.nombre,' ',cl.apellido) AS cliente,
               CONCAT(at.nombre,' ',at.apellido) AS atiende
            FROM cita c
            LEFT JOIN usuario cl ON c.id_cliente = cl.id_usuario
            LEFT JOIN usuario at ON c.id_usuario_atiende = at.id_usuario
            ORDER BY c.fecha_hora DESC`,
      dateStrings: true
    });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put("/api/citas/:id", async (req, res) => {
  const { id } = req.params;
  const { estado, observaciones } = req.body;
  try {
    await db.query(
      "UPDATE cita SET estado=COALESCE(?,estado), observaciones=COALESCE(?,observaciones) WHERE id_cita=?",
      [estado, observaciones, id]
    );
    res.json({ mensaje: "Cita actualizada" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/citas/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM cita WHERE id_cita=?", [req.params.id]);
    res.json({ mensaje: "Cita eliminada" });
  } catch (e) { res.status(500).json({ mensaje: "No se puede eliminar la cita." }); }
});

// ─────────────────────── RECETAS ───────────────────────
app.get("/api/recetas", async (req, res) => {
  try {
    const [rows] = await db.query({
      sql: `SELECT r.id_receta, r.fecha_emision, r.fecha_vencimiento, r.diagnostico,
               CONCAT(u.nombre,' ',u.apellido) AS cliente
            FROM receta_optica r
            LEFT JOIN usuario u ON r.id_cliente = u.id_usuario
            ORDER BY r.id_receta DESC`,
      dateStrings: true
    });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/recetas/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM receta_optica WHERE id_receta=?", [req.params.id]);
    res.json({ mensaje: "Receta eliminada" });
  } catch (e) { res.status(500).json({ mensaje: "No se puede eliminar la receta." }); }
});

// ─────────────────────── PROMOCIONES ───────────────────────
app.get("/api/promociones", async (req, res) => {
  try {
    const [rows] = await db.query({
      sql: `SELECT codigo_promocion, nombre, descripcion, tipo_descuento,
               valor_descuento, fecha_inicio, fecha_fin, estado
            FROM promocion ORDER BY codigo_promocion DESC`,
      dateStrings: true
    });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/promociones", async (req, res) => {
  const { nombre, descripcion, tipo_descuento, valor_descuento, fecha_inicio, fecha_fin, estado } = req.body;
  if (!nombre || !tipo_descuento || !valor_descuento)
    return res.status(400).json({ mensaje: "Nombre, tipo y valor del descuento son obligatorios" });
  try {
    const [r] = await db.query(
      `INSERT INTO promocion (nombre, descripcion, tipo_descuento, valor_descuento, fecha_inicio, fecha_fin, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nombre, descripcion || "", tipo_descuento, valor_descuento, fecha_inicio || null, fecha_fin || null, estado || "Activo"]
    );
    res.status(201).json({ mensaje: "Promoción creada", codigo_promocion: r.insertId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put("/api/promociones/:id", async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, tipo_descuento, valor_descuento, fecha_inicio, fecha_fin, estado } = req.body;
  try {
    await db.query(
      `UPDATE promocion SET nombre=COALESCE(?,nombre), descripcion=COALESCE(?,descripcion),
       tipo_descuento=COALESCE(?,tipo_descuento), valor_descuento=COALESCE(?,valor_descuento),
       fecha_inicio=COALESCE(?,fecha_inicio), fecha_fin=COALESCE(?,fecha_fin), estado=COALESCE(?,estado)
       WHERE codigo_promocion=?`,
      [nombre, descripcion, tipo_descuento, valor_descuento, fecha_inicio, fecha_fin, estado, id]
    );
    res.json({ mensaje: "Promoción actualizada" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/promociones/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM promocion WHERE codigo_promocion=?", [req.params.id]);
    res.json({ mensaje: "Promoción eliminada" });
  } catch (e) { res.status(500).json({ mensaje: "No se puede eliminar la promoción." }); }
});

// ─────────────────────── REPORTES ───────────────────────
app.get("/api/reportes", async (req, res) => {
  try {
    const [rows] = await db.query({
      sql: `SELECT r.id_reporte, r.titulo, r.tipo_reporte, r.fecha_generacion,
               r.descripcion, CONCAT(u.nombre,' ',u.apellido) AS generado_por
            FROM reporte r
            LEFT JOIN usuario u ON r.id_usuario_genera = u.id_usuario
            ORDER BY r.fecha_generacion DESC`,
      dateStrings: true
    });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
