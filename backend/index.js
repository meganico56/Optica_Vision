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

// ─ CONSTANTES Y AYUDAS ──
// Los valores salen de los enum de BD_Optica_Vision.sql
const ESTADOS_CITA = ["Programada", "Confirmada", "Completada", "Cancelada", "No asistio"];
const ESTADOS_VENTA = ["Pendiente", "Pagada", "Anulada"];
const CANALES_VENTA = ["Mostrador", "Web"];
const MOTIVOS_DEVOLUCION = ["Producto defectuoso", "Cambio de formula", "Ajuste o talla incorrecta", "Cliente se arrepintio", "Otro"];
const DESTINOS_DEVOLUCION = ["Vuelve a inventario", "Descarte", "Devuelto a proveedor"];
const TIPOS_DOCUMENTO = ["C.C.", "T.I.", "R.C.", "C.E.", "PAS"];

// Error con código HTTP para responder mensajes claros desde dentro de una transacción
function errorHttp(status, mensaje) {
  const e = new Error(mensaje);
  e.status = status;
  return e;
}

// Responde según el tipo de error (los de errorHttp llevan su propio código)
function responderError(res, e) {
  if (e.status) return res.status(e.status).json({ mensaje: e.message, error: e.message });
  if (e.code === "ER_NO_REFERENCED_ROW_2") {
    return res.status(400).json({ mensaje: "Algún dato relacionado (cliente, receta, promoción o producto) no existe", error: e.message });
  }
  console.error(e);
  res.status(500).json({ error: e.message });
}

// ¿El cliente ya tiene una cita activa en ese horario exacto?
async function clienteTieneCita(idCliente, fechaHora) {
  const [filas] = await db.query(
    "SELECT id_cita FROM cita WHERE id_cliente = ? AND fecha_hora = ? AND estado NOT IN ('Cancelada', 'No asistio') LIMIT 1",
    [idCliente, fechaHora]
  );
  return filas.length > 0;
}

// Mueve el inventario de una venta y deja la huella en movimiento_inventario.
// signo = -1 descuenta (venta pagada); signo = 1 repone (venta anulada)
async function moverStockVenta(conn, codigoVenta, signo, tipoMovimiento, idUsuario) {
  const [detalles] = await conn.query(
    `SELECT dv.id_producto, dv.cantidad, p.nombre, p.maneja_inventario
     FROM detalle_venta dv
     JOIN producto p ON p.id_producto = dv.id_producto
     WHERE dv.codigo_venta = ?`,
    [codigoVenta]
  );
  for (const d of detalles) {
    if (!d.maneja_inventario) continue;
    const delta = signo * d.cantidad;
    const [r] = await conn.query(
      "UPDATE producto SET existencia_actual = existencia_actual + ? WHERE id_producto = ? AND existencia_actual + ? >= 0",
      [delta, d.id_producto, delta]
    );
    if (r.affectedRows === 0) {
      throw errorHttp(409, `No hay existencias suficientes de "${d.nombre}"`);
    }
    await conn.query(
      `INSERT INTO movimiento_inventario (tipo, cantidad, observaciones, id_producto, id_usuario, codigo_venta)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [tipoMovimiento, delta, `Venta #${codigoVenta}`, d.id_producto, idUsuario || null, codigoVenta]
    );
  }
}

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("API de Óptica Visión funcionando correctamente");
});

app.get("/api/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ api: "ok", database: "ok" });
  } catch (error) {
    console.error("La base de datos no está disponible:", error);
    res.status(503).json({ api: "ok", database: "unavailable" });
  }
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
      sku: p.sku,
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
  const { sku, costo_compra, nombre, descripcion, precio, imagen, material, genero, existencia_actual, existencia_minima, id_categoria, id_marca, estado } = req.body;

  if (!nombre || !precio || !imagen) {
    return res.status(400).json({ mensaje: "Nombre, precio e imagen son obligatorios" });
  }

  try {
    // El SKU es obligatorio y único en la base de datos; si el formulario no lo envía se genera uno
    const skuFinal = sku && String(sku).trim() ? String(sku).trim() : "SKU-" + Date.now().toString(36).toUpperCase();

    const [result] = await db.query(
      `INSERT INTO producto (sku, nombre, descripcion, precio, costo_compra, imagen, material, genero, existencia_actual, existencia_minima, id_categoria, id_marca, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        skuFinal,
        nombre,
        descripcion || '',
        precio,
        costo_compra || 0,
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
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ mensaje: "Ya existe un producto con ese SKU o con ese nombre para la misma marca" });
    }
    res.status(500).json({ mensaje: "Error al crear el producto", detalle: error.message });
  }
});

// Actualizar un producto (PUT /api/productos/:id)
app.put("/api/productos/:id", async (req, res) => {
  const { id } = req.params;
  const { sku, costo_compra, nombre, descripcion, precio, imagen, material, genero, existencia_actual, existencia_minima, id_categoria, id_marca, estado } = req.body;

  try {
    await db.query(
      `UPDATE producto SET 
         sku = COALESCE(?, sku),
         costo_compra = COALESCE(?, costo_compra),
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
      [sku || null, costo_compra, nombre, descripcion, precio, imagen, material, genero, existencia_actual, existencia_minima, id_categoria, id_marca, estado, id]
    );

    res.json({ mensaje: "Producto actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ mensaje: "Ya existe un producto con ese SKU o con ese nombre para la misma marca" });
    }
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
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Ya existe una marca con ese nombre" });
    }
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
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Ya existe una categoría con ese nombre" });
    }
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

// Ruta para agendar cita desde la web (Tabla cita)
// Acepta fecha_cita + hora_cita (o fecha_hora) y el cliente como id_cliente o id_usuario
app.post("/api/citas", async (req, res) => {
  const clienteId = req.body.id_cliente || req.body.id_usuario;
  const { fecha_cita, hora_cita, motivo, estado } = req.body;

  let fechaHora = req.body.fecha_hora;
  if (!fechaHora && fecha_cita && hora_cita) {
    fechaHora = `${fecha_cita} ${hora_cita.length === 5 ? hora_cita + ":00" : hora_cita}`;
  }

  if (!fechaHora) {
    return res.status(400).json({ error: "La fecha y la hora de la cita son obligatorias" });
  }
  if (!clienteId) {
    return res.status(400).json({ error: "Debes iniciar sesión para agendar una cita" });
  }

  try {
    if (await clienteTieneCita(clienteId, fechaHora)) {
      return res.status(409).json({ error: "Ya tienes una cita en ese horario" });
    }

    const estadoFinal = ESTADOS_CITA.includes(estado) ? estado : "Programada";
    const [resultado] = await db.query(
      `INSERT INTO cita (fecha_hora, motivo, canal, estado, id_cliente)
       VALUES (?, ?, 'Web', ?, ?)`,
      [fechaHora, motivo || "Examen visual", estadoFinal, clienteId]
    );

    res.status(201).json({
      mensaje: "Cita agendada con éxito",
      id_cita: resultado.insertId,
    });
  } catch (error) {
    console.error("Error al agendar cita:", error);
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ error: "El cliente indicado no existe" });
    }
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

    // Cuentas sin contraseña (por ejemplo menores de edad) o inactivas no pueden iniciar sesión
    if (!usuario.contrasena) {
      return res.status(401).json({ mensaje: "Credenciales inválidas" });
    }
    if (usuario.estado !== "Activo") {
      return res.status(403).json({ mensaje: "Tu cuenta está inactiva. Comunícate con la óptica." });
    }

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
  const { nombre, apellido, tipo_documento, num_documento, telefono, correo, direccion, ciudad, fecha_nacimiento, contrasena } = req.body;

  if (!nombre || !apellido || !tipo_documento || !num_documento || !telefono || !correo || !fecha_nacimiento || !contrasena) {
    return res.status(400).json({ mensaje: "Todos los campos obligatorios deben estar completos" });
  }

  if (!TIPOS_DOCUMENTO.includes(tipo_documento)) {
    return res.status(400).json({ mensaje: "Tipo de documento no válido" });
  }

  if (contrasena.length < 8) {
    return res.status(400).json({ mensaje: "La contraseña debe tener al menos 8 caracteres" });
  }

  try {
    // Verificar que no exista otro usuario con ese correo o documento
    const [existentes] = await db.query(
      "SELECT id_usuario FROM usuario WHERE correo = ? OR (tipo_documento = ? AND num_documento = ?)",
      [correo, tipo_documento, num_documento]
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
      `INSERT INTO usuario (nombre, apellido, tipo_documento, num_documento, telefono, correo, direccion, ciudad, fecha_nacimiento, contrasena, estado, id_rol)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Activo', ?)`,
      [nombre, apellido, tipo_documento, num_documento, telefono, correo, direccion || null, ciudad || null, fecha_nacimiento, hash, id_rol]
    );

    res.status(201).json({ mensaje: "Cuenta creada con éxito" });
  } catch (error) {
    console.error("Error en /api/registro:", error);
    res.status(500).json({ mensaje: "Error interno al crear la cuenta" });
  }
});

// Rutas para Usuarios (panel de administrador)
const CAMPOS_USUARIO = `u.id_usuario, u.nombre, u.apellido, u.tipo_documento, u.num_documento, u.telefono,
  u.correo, u.direccion, u.ciudad, u.fecha_nacimiento, u.estado, u.id_rol, r.nombre_rol AS rol`;

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
  const { nombre, apellido, tipo_documento, num_documento, telefono, correo, direccion, ciudad, fecha_nacimiento, contrasena, estado, id_rol } = req.body;

  if (!nombre || !apellido || !tipo_documento || !num_documento || !telefono || !id_rol) {
    return res.status(400).json({ mensaje: "Nombre, apellido, documento, teléfono y rol son obligatorios" });
  }
  if (contrasena && contrasena.length < 8) {
    return res.status(400).json({ mensaje: "La contraseña debe tener al menos 8 caracteres" });
  }

  try {
    const hash = contrasena ? await bcrypt.hash(contrasena, 10) : null;
    const [resultado] = await db.query(
      `INSERT INTO usuario (nombre, apellido, tipo_documento, num_documento, telefono, correo, direccion, ciudad, fecha_nacimiento, contrasena, estado, id_rol)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, apellido, tipo_documento, num_documento, telefono, correo || null, direccion || null, ciudad || null, fecha_nacimiento || null, hash, estado || "Activo", id_rol]
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
  const { nombre, apellido, tipo_documento, num_documento, telefono, correo, direccion, ciudad, fecha_nacimiento, contrasena, estado, id_rol } = req.body;

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
         ciudad = COALESCE(?, ciudad),
         fecha_nacimiento = COALESCE(?, fecha_nacimiento),
         contrasena = COALESCE(?, contrasena),
         estado = COALESCE(?, estado),
         id_rol = COALESCE(?, id_rol)
       WHERE id_usuario = ?`,
      [nombre, apellido, tipo_documento, num_documento, telefono, correo || null, direccion || null, ciudad || null, fecha_nacimiento || null, hash, estado, id_rol, id]
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
// En la BD, venta.total es una columna calculada (subtotal - descuento + impuesto): nunca se inserta.
app.get("/api/ventas", async (req, res) => {
  const { id_cliente } = req.query;
  try {
    let sql = `SELECT v.codigo_venta, v.numero_factura, v.fecha, v.canal, v.subtotal, v.descuento, v.impuesto,
               v.total, v.estado, v.observaciones, v.codigo_promocion, v.id_receta,
               CONCAT(u.nombre,' ',u.apellido) AS cliente,
               v.id_cliente
            FROM venta v
            LEFT JOIN usuario u ON v.id_cliente = u.id_usuario`;
    const params = [];
    if (id_cliente) {
      sql += ` WHERE v.id_cliente = ?`;
      params.push(id_cliente);
    }
    sql += ` ORDER BY v.codigo_venta DESC`;
    const [rows] = await db.query({ sql, values: params, dateStrings: true });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/ventas/:id/detalles", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT dv.*, p.nombre, p.imagen, p.descripcion, c.nombre AS categoria_nombre
       FROM detalle_venta dv
       LEFT JOIN producto p ON dv.id_producto = p.id_producto
       LEFT JOIN categoria c ON p.id_categoria = c.id_categoria
       WHERE dv.codigo_venta = ?`,
      [req.params.id]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Crear venta. Dos formas de uso:
//  1) con items [{ id_producto, cantidad }]: el precio se toma de la base de datos y se guardan los detalles
//  2) sin items, solo con subtotal (o total): registra el valor global (compatibilidad con el panel actual)
// El stock se descuenta cuando la venta pasa a "Pagada" (aquí si nace pagada, o después con PUT).
app.post("/api/ventas", async (req, res) => {
  const clienteId = req.body.id_cliente || req.body.id_usuario;
  const { items, estado, canal, codigo_promocion, id_receta, observaciones, id_usuario_registra } = req.body;

  if (!clienteId) return res.status(400).json({ mensaje: "El cliente es obligatorio" });

  const estadoFinal = estado || "Pendiente";
  if (!ESTADOS_VENTA.includes(estadoFinal)) return res.status(400).json({ mensaje: "Estado de venta no válido" });
  const canalFinal = canal || "Mostrador";
  if (!CANALES_VENTA.includes(canalFinal)) return res.status(400).json({ mensaje: "Canal de venta no válido" });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Líneas de la venta (si vienen), uniendo productos repetidos
    const lineas = new Map();
    for (const it of Array.isArray(items) ? items : []) {
      const idProducto = Number(it.id_producto);
      const cantidad = Number(it.cantidad);
      if (!Number.isInteger(idProducto) || idProducto <= 0 || !Number.isInteger(cantidad) || cantidad <= 0) {
        throw errorHttp(400, "Cada producto necesita id_producto y una cantidad entera mayor que 0");
      }
      lineas.set(idProducto, (lineas.get(idProducto) || 0) + cantidad);
    }

    let subtotal;
    const detalles = [];
    if (lineas.size > 0) {
      const ids = [...lineas.keys()];
      const [productos] = await conn.query(
        "SELECT id_producto, nombre, precio, existencia_actual, maneja_inventario, estado FROM producto WHERE id_producto IN (?)",
        [ids]
      );
      const porId = new Map(productos.map((p) => [p.id_producto, p]));
      subtotal = 0;
      for (const [idProducto, cantidad] of lineas) {
        const p = porId.get(idProducto);
        if (!p || p.estado !== "Activo") throw errorHttp(400, `El producto ${idProducto} no está disponible`);
        if (p.maneja_inventario && p.existencia_actual < cantidad) {
          throw errorHttp(409, `No hay existencias suficientes de "${p.nombre}"`);
        }
        detalles.push({ cantidad, precio: p.precio, idProducto });
        subtotal += Number(p.precio) * cantidad;
      }
    } else {
      subtotal = Number(req.body.subtotal ?? req.body.total);
      if (!subtotal || subtotal <= 0) {
        throw errorHttp(400, "Envía los productos (items) o el valor de la venta");
      }
    }

    // Descuento: por promoción vigente, o el valor manual que envíe el panel de administrador
    let descuento = Number(req.body.descuento) || 0;
    if (codigo_promocion) {
      const [promos] = await conn.query(
        `SELECT tipo_descuento, valor_descuento FROM promocion
         WHERE codigo_promocion = ? AND estado = 'Activo' AND CURDATE() BETWEEN fecha_inicio AND fecha_fin`,
        [codigo_promocion]
      );
      if (promos.length === 0) throw errorHttp(400, "La promoción no existe o no está vigente");
      const promo = promos[0];
      descuento = promo.tipo_descuento === "Porcentaje"
        ? Math.round(subtotal * Number(promo.valor_descuento)) / 100
        : Number(promo.valor_descuento);
    }
    descuento = Math.min(Math.max(descuento, 0), subtotal);
    const impuesto = Number(req.body.impuesto) || 0;

    const [r] = await conn.query(
      `INSERT INTO venta (fecha, canal, subtotal, descuento, impuesto, estado, observaciones, id_cliente, codigo_promocion, id_receta, id_usuario)
       VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [canalFinal, subtotal, descuento, impuesto, estadoFinal, observaciones || null, clienteId, codigo_promocion || null, id_receta || null, id_usuario_registra || clienteId]
    );
    const codigoVenta = r.insertId;

    for (const d of detalles) {
      await conn.query(
        "INSERT INTO detalle_venta (cantidad, precio_unitario, codigo_venta, id_producto) VALUES (?, ?, ?, ?)",
        [d.cantidad, d.precio, codigoVenta, d.idProducto]
      );
    }

    if (estadoFinal === "Pagada" && detalles.length > 0) {
      await moverStockVenta(conn, codigoVenta, -1, "Venta", id_usuario_registra);
    }

    await conn.commit();
    res.status(201).json({ mensaje: "Venta registrada", codigo_venta: codigoVenta });
  } catch (e) {
    await conn.rollback();
    responderError(res, e);
  } finally {
    conn.release();
  }
});

// Actualizar venta. El total no se envía: se recalcula solo (subtotal - descuento + impuesto).
// Si llega "total" sin "subtotal", se ajusta el subtotal para que el total quede en ese valor.
app.put("/api/ventas/:id", async (req, res) => {
  const { id } = req.params;
  const { estado, observaciones, codigo_promocion, id_receta, id_usuario } = req.body;

  if (estado !== undefined && estado !== null && !ESTADOS_VENTA.includes(estado)) {
    return res.status(400).json({ mensaje: "Estado de venta no válido" });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [ventas] = await conn.query(
      "SELECT estado, subtotal, descuento, impuesto FROM venta WHERE codigo_venta = ? FOR UPDATE",
      [id]
    );
    if (ventas.length === 0) throw errorHttp(404, "Venta no encontrada");
    const actual = ventas[0];
    const nuevoEstado = estado || actual.estado;

    if (actual.estado === "Anulada" && nuevoEstado !== "Anulada") {
      throw errorHttp(409, "Una venta anulada no se puede modificar");
    }
    if (actual.estado === "Pagada" && nuevoEstado === "Pendiente") {
      throw errorHttp(409, "Una venta pagada solo puede anularse");
    }
    if (actual.estado === "Pagada" && nuevoEstado === "Anulada") {
      const [devs] = await conn.query(
        `SELECT d.id_devolucion FROM devolucion d
         JOIN detalle_venta dv ON dv.codigo_detalle_venta = d.codigo_detalle_venta
         WHERE dv.codigo_venta = ? LIMIT 1`,
        [id]
      );
      if (devs.length > 0) throw errorHttp(409, "La venta ya tiene devoluciones registradas y no se puede anular");
    }

    const descuento = req.body.descuento !== undefined ? Number(req.body.descuento) : Number(actual.descuento);
    const impuesto = req.body.impuesto !== undefined ? Number(req.body.impuesto) : Number(actual.impuesto);
    let subtotal = Number(actual.subtotal);
    if (req.body.subtotal !== undefined) subtotal = Number(req.body.subtotal);
    else if (req.body.total !== undefined) subtotal = Number(req.body.total) + descuento - impuesto;

    if (descuento > subtotal) throw errorHttp(400, "El descuento no puede ser mayor que el subtotal");

    await conn.query(
      `UPDATE venta SET subtotal = ?, descuento = ?, impuesto = ?, estado = ?,
         observaciones = COALESCE(?, observaciones),
         codigo_promocion = COALESCE(?, codigo_promocion),
         id_receta = COALESCE(?, id_receta)
       WHERE codigo_venta = ?`,
      [subtotal, descuento, impuesto, nuevoEstado, observaciones, codigo_promocion, id_receta, id]
    );

    if (actual.estado !== "Pagada" && nuevoEstado === "Pagada") {
      await moverStockVenta(conn, id, -1, "Venta", id_usuario);
    } else if (actual.estado === "Pagada" && nuevoEstado === "Anulada") {
      await moverStockVenta(conn, id, 1, "Anulacion de venta", id_usuario);
    }

    await conn.commit();
    res.json({ mensaje: "Venta actualizada" });
  } catch (e) {
    await conn.rollback();
    responderError(res, e);
  } finally {
    conn.release();
  }
});

app.delete("/api/ventas/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM venta WHERE codigo_venta=?", [req.params.id]);
    res.json({ mensaje: "Venta eliminada" });
  } catch (e) { res.status(500).json({ mensaje: "No se puede eliminar, tiene registros asociados. Puedes anularla." }); }
});

// ─────────────────────── DEVOLUCIONES ───────────────────────
app.get("/api/devoluciones", async (req, res) => {
  try {
    const [rows] = await db.query({ dateStrings: true, sql: `
      SELECT d.id_devolucion, d.fecha, d.motivo, d.cantidad, d.destino, d.valor_devuelto, d.observaciones,
             dv.codigo_venta,
             CONCAT(u.nombre,' ',u.apellido) AS registrado_por
      FROM devolucion d
      LEFT JOIN detalle_venta dv ON d.codigo_detalle_venta = dv.codigo_detalle_venta
      LEFT JOIN usuario u ON d.id_usuario = u.id_usuario
      ORDER BY d.id_devolucion DESC` });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────── COMPRAS ───────────────────────
app.get("/api/compras", async (req, res) => {
  try {
    const [rows] = await db.query({
      sql: `SELECT c.numero_compra, c.fecha, c.numero_comprobante, c.total, c.estado,
               p.nombre AS proveedor, c.codigo_proveedor, c.sub_total, c.impuesto, c.observaciones
            FROM compra c
            LEFT JOIN proveedor p ON c.codigo_proveedor = p.codigo_proveedor
            ORDER BY c.numero_compra DESC`,
      dateStrings: true
    });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// compra.total es una columna calculada (sub_total + impuesto): se envía sub_total e impuesto.
// Si el formulario solo manda "total", el sub_total se calcula como total - impuesto.
app.post("/api/compras", async (req, res) => {
  const numComprobante = req.body.numero_comprobante || req.body.comprobante;
  const codProveedor = req.body.codigo_proveedor || req.body.id_proveedor;
  const { id_usuario, sub_total, impuesto, total, estado, observaciones } = req.body;
  if (!numComprobante || !codProveedor || (total === undefined && sub_total === undefined)) {
    return res.status(400).json({ mensaje: "Comprobante, proveedor y total son obligatorios" });
  }
  const estadoFinal = estado || "Confirmada";
  if (!["Pendiente", "Confirmada", "Cancelada"].includes(estadoFinal)) {
    return res.status(400).json({ mensaje: "Estado de compra no válido" });
  }
  try {
    const imp = Number(impuesto) || 0;
    const sub = sub_total !== undefined ? Number(sub_total) : Number(total) - imp;
    const [r] = await db.query(
      `INSERT INTO compra (fecha, numero_comprobante, sub_total, impuesto, estado, observaciones, codigo_proveedor, id_usuario)
       VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?)`,
      [numComprobante, sub, imp, estadoFinal, observaciones || null, codProveedor, id_usuario || 1]
    );
    res.status(201).json({ mensaje: "Compra registrada", numero_compra: r.insertId });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ mensaje: "Ya existe una compra con ese comprobante para este proveedor" });
    }
    if (e.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ mensaje: "El proveedor indicado no existe" });
    }
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/compras/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM compra WHERE numero_compra=?", [req.params.id]);
    res.json({ mensaje: "Compra eliminada" });
  } catch (e) { res.status(500).json({ mensaje: "No se puede eliminar la compra si tiene detalles asociados." }); }
});

// ─────────────────────── CITAS ───────────────────────
app.get("/api/citas", async (req, res) => {
  const { id_cliente } = req.query;
  try {
    let sql = `SELECT c.id_cita, c.fecha_hora, c.motivo, c.estado, c.observaciones,
               CONCAT(cl.nombre,' ',cl.apellido) AS cliente,
               CONCAT(at.nombre,' ',at.apellido) AS atiende,
               c.id_cliente, c.id_usuario_atiende
            FROM cita c
            LEFT JOIN usuario cl ON c.id_cliente = cl.id_usuario
            LEFT JOIN usuario at ON c.id_usuario_atiende = at.id_usuario`;
    const params = [];
    if (id_cliente) {
      sql += ` WHERE c.id_cliente = ?`;
      params.push(id_cliente);
    }
    sql += ` ORDER BY c.fecha_hora DESC`;
    const [rows] = await db.query({ sql, values: params, dateStrings: true });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/citas-admin", async (req, res) => {
  const { id_cliente, fecha_hora, motivo, id_usuario_atiende, estado, observaciones, duracion_minutos } = req.body;
  if (!id_cliente || !fecha_hora || !motivo) {
    return res.status(400).json({ mensaje: "Cliente, fecha/hora y motivo son obligatorios" });
  }
  try {
    if (await clienteTieneCita(id_cliente, fecha_hora)) {
      return res.status(409).json({ mensaje: "El cliente ya tiene una cita asignada en ese horario exacto" });
    }
    if (estado && !ESTADOS_CITA.includes(estado)) {
      return res.status(400).json({ mensaje: "Estado de cita no válido" });
    }
    const atiende = id_usuario_atiende || id_cliente;
    const [r] = await db.query(
      `INSERT INTO cita (fecha_hora, duracion_minutos, motivo, estado, observaciones, id_cliente, id_usuario_atiende)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [fecha_hora, duracion_minutos || 30, motivo, estado || "Programada", observaciones || null, id_cliente, atiende]
    );
    res.status(201).json({ mensaje: "Cita programada con éxito", id_cita: r.insertId });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ mensaje: "El cliente ya tiene una cita asignada en ese horario exacto" });
    }
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/citas/:id", async (req, res) => {
  const { id } = req.params;
  const { estado, observaciones, fecha_hora, motivo } = req.body;
  if (estado && !ESTADOS_CITA.includes(estado)) {
    return res.status(400).json({ mensaje: "Estado de cita no válido" });
  }
  try {
    await db.query(
      "UPDATE cita SET estado=COALESCE(?,estado), observaciones=COALESCE(?,observaciones), fecha_hora=COALESCE(?,fecha_hora), motivo=COALESCE(?,motivo) WHERE id_cita=?",
      [estado, observaciones, fecha_hora, motivo, id]
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
  const { id_cliente } = req.query;
  try {
    let sql = `SELECT r.*,
               CONCAT(u.nombre,' ',u.apellido) AS cliente
            FROM receta_optica r
            LEFT JOIN usuario u ON r.id_cliente = u.id_usuario`;
    const params = [];
    if (id_cliente) {
      sql += ` WHERE r.id_cliente = ?`;
      params.push(id_cliente);
    }
    sql += ` ORDER BY r.id_receta DESC`;
    const [rows] = await db.query({ sql, values: params, dateStrings: true });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/recetas", async (req, res) => {
  const clienteId = req.body.id_cliente || req.body.id_usuario;
  const optometraFinal = req.body.nombre_optometra_externo || req.body.optometra;
  const {
    fecha_emision, fecha_vencimiento, diagnostico, entidad_examinadora,
    observaciones, id_cita, id_usuario_registra,
    od_esfera, od_cilindro, od_eje, od_adicion,
    oi_esfera, oi_cilindro, oi_eje, oi_adicion, distancia_pupilar
  } = req.body;

  if (!fecha_emision || !fecha_vencimiento || !clienteId) {
    return res.status(400).json({ mensaje: "Fechas de emisión, vencimiento y cliente son obligatorios" });
  }

  try {
    // Si no se proporcionó id_cita o la cita ya tiene receta, buscar o crear una cita representativa
    let citaIdFinal = id_cita;
    if (!citaIdFinal) {
      const [citasDisp] = await db.query(
        `SELECT c.id_cita FROM cita c
         LEFT JOIN receta_optica ro ON c.id_cita = ro.id_cita
         WHERE c.id_cliente = ? AND ro.id_receta IS NULL
         ORDER BY c.fecha_hora DESC LIMIT 1`,
        [clienteId]
      );
      if (citasDisp.length > 0) {
        citaIdFinal = citasDisp[0].id_cita;
      } else {
        const [nuevaCita] = await db.query(
          `INSERT INTO cita (fecha_hora, duracion_minutos, motivo, estado, id_cliente, id_usuario_atiende)
           VALUES (NOW(), 30, 'Examen de optometría (receta)', 'Completada', ?, ?)`,
          [clienteId, id_usuario_registra || clienteId]
        );
        citaIdFinal = nuevaCita.insertId;
      }
    }

    const [r] = await db.query(
      `INSERT INTO receta_optica (
        fecha_emision, fecha_vencimiento, diagnostico, entidad_examinadora,
        nombre_optometra_externo, observaciones, id_cliente, id_cita, id_usuario_registra,
        od_esfera, od_cilindro, od_eje, od_adicion,
        oi_esfera, oi_cilindro, oi_eje, oi_adicion, distancia_pupilar
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fecha_emision, fecha_vencimiento, diagnostico || "Evaluación visual",
        entidad_examinadora || "Óptica Boutique de la Visión",
        optometraFinal || "Dr. Optómetra",
        observaciones || null, clienteId, citaIdFinal, id_usuario_registra || 1,
        od_esfera || null, od_cilindro || null, od_eje || null, od_adicion || null,
        oi_esfera || null, oi_cilindro || null, oi_eje || null, oi_adicion || null,
        distancia_pupilar || null
      ]
    );
    res.status(201).json({ mensaje: "Receta registrada", id_receta: r.insertId });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ mensaje: "Esta cita ya tiene una receta asociada" });
    }
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/recetas/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM receta_optica WHERE id_receta=?", [req.params.id]);
    res.json({ mensaje: "Receta eliminada" });
  } catch (e) { res.status(500).json({ mensaje: "No se puede eliminar la receta." }); }
});

// ─────────────────────── DEVOLUCIONES (POST / DELETE) ───────────────────────
// El motivo y el destino son enum en la BD. Un motivo escrito libre se guarda como "Otro" y su texto pasa a observaciones.
// Si no llega destino se asume "Descarte" (no suma al inventario hasta que alguien lo confirme).
app.post("/api/devoluciones", async (req, res) => {
  const { motivo, cantidad, observaciones, codigo_detalle_venta, codigo_venta, id_producto, destino, id_usuario } = req.body;
  const cant = Number(cantidad);
  if (!motivo || !Number.isInteger(cant) || cant <= 0) {
    return res.status(400).json({ mensaje: "Motivo y una cantidad entera mayor que 0 son obligatorios" });
  }
  const destinoFinal = destino || "Descarte";
  if (!DESTINOS_DEVOLUCION.includes(destinoFinal)) {
    return res.status(400).json({ mensaje: "Destino de la devolución no válido" });
  }

  const motivoFinal = MOTIVOS_DEVOLUCION.includes(motivo) ? motivo : "Otro";
  let obsFinal = observaciones || null;
  if (motivoFinal === "Otro" && motivo !== "Otro") {
    obsFinal = obsFinal ? `${motivo} - ${obsFinal}` : motivo;
  }
  if (obsFinal) obsFinal = obsFinal.slice(0, 255);

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Línea de la venta que se devuelve
    let detalle;
    if (codigo_detalle_venta) {
      [[detalle]] = await conn.query(
        `SELECT dv.codigo_detalle_venta, dv.codigo_venta, dv.id_producto, dv.cantidad, dv.precio_unitario, v.estado, p.maneja_inventario
         FROM detalle_venta dv JOIN venta v ON v.codigo_venta = dv.codigo_venta JOIN producto p ON p.id_producto = dv.id_producto
         WHERE dv.codigo_detalle_venta = ?`,
        [codigo_detalle_venta]
      );
    } else if (codigo_venta) {
      const [detalles] = await conn.query(
        `SELECT dv.codigo_detalle_venta, dv.codigo_venta, dv.id_producto, dv.cantidad, dv.precio_unitario, v.estado, p.maneja_inventario
         FROM detalle_venta dv JOIN venta v ON v.codigo_venta = dv.codigo_venta JOIN producto p ON p.id_producto = dv.id_producto
         WHERE dv.codigo_venta = ? AND (? IS NULL OR dv.id_producto = ?)`,
        [codigo_venta, id_producto || null, id_producto || null]
      );
      if (detalles.length > 1) {
        throw errorHttp(400, "La venta tiene varios productos: indica cuál se devuelve (codigo_detalle_venta o id_producto)");
      }
      detalle = detalles[0];
    } else {
      throw errorHttp(400, "Indica la venta (codigo_venta) o el detalle (codigo_detalle_venta) que se devuelve");
    }

    if (!detalle) throw errorHttp(404, "No se encontró el producto de la venta indicada");
    if (detalle.estado !== "Pagada") throw errorHttp(409, "Solo se pueden devolver productos de ventas pagadas");

    const [[{ devuelto }]] = await conn.query(
      "SELECT COALESCE(SUM(cantidad), 0) AS devuelto FROM devolucion WHERE codigo_detalle_venta = ?",
      [detalle.codigo_detalle_venta]
    );
    if (cant > detalle.cantidad - Number(devuelto)) {
      throw errorHttp(409, `Solo quedan ${detalle.cantidad - Number(devuelto)} unidad(es) por devolver de este producto`);
    }

    const idUsuario = id_usuario || 1;
    const valor = cant * Number(detalle.precio_unitario);
    const [r] = await conn.query(
      `INSERT INTO devolucion (fecha, motivo, cantidad, destino, valor_devuelto, observaciones, codigo_detalle_venta, id_usuario)
       VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?)`,
      [motivoFinal, cant, destinoFinal, valor, obsFinal, detalle.codigo_detalle_venta, idUsuario]
    );

    if (destinoFinal === "Vuelve a inventario" && detalle.maneja_inventario) {
      await conn.query("UPDATE producto SET existencia_actual = existencia_actual + ? WHERE id_producto = ?", [cant, detalle.id_producto]);
      await conn.query(
        `INSERT INTO movimiento_inventario (tipo, cantidad, observaciones, id_producto, id_usuario, codigo_venta, id_devolucion)
         VALUES ('Devolucion de cliente', ?, ?, ?, ?, ?, ?)`,
        [cant, `Devolución de la venta #${detalle.codigo_venta}`, detalle.id_producto, idUsuario, detalle.codigo_venta, r.insertId]
      );
    }

    await conn.commit();
    res.status(201).json({ mensaje: "Devolución registrada", id_devolucion: r.insertId });
  } catch (e) {
    await conn.rollback();
    responderError(res, e);
  } finally {
    conn.release();
  }
});

app.delete("/api/devoluciones/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM devolucion WHERE id_devolucion=?", [req.params.id]);
    res.json({ mensaje: "Devolución eliminada" });
  } catch (e) { res.status(500).json({ mensaje: "No se puede eliminar la devolución." }); }
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
               r.descripcion, r.contenido, CONCAT(u.nombre,' ',u.apellido) AS generado_por
            FROM reporte r
            LEFT JOIN usuario u ON r.id_usuario_genera = u.id_usuario
            ORDER BY r.fecha_generacion DESC`,
      dateStrings: true
    });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Ventas por producto en un rango de fechas (solo ventas Pagadas).
// GET /api/reportes/ventas-productos?desde=AAAA-MM-DD&hasta=AAAA-MM-DD
// Cuenta cada venta por su fecha de registro (venta.fecha), incluyendo todo el día "hasta".
// Ingresos = cantidad x precio_unitario de las líneas (antes de descuentos de la venta y sin restar devoluciones).
app.get("/api/reportes/ventas-productos", async (req, res) => {
  const { desde, hasta } = req.query;
  const esFecha = (s) => {
    if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = new Date(s + "T00:00:00Z");
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  };
  if (!esFecha(desde) || !esFecha(hasta)) {
    return res.status(400).json({ mensaje: "Envía desde y hasta con formato AAAA-MM-DD" });
  }
  if (desde > hasta) {
    return res.status(400).json({ mensaje: "La fecha inicial no puede ser posterior a la final" });
  }

  try {
    const [rows] = await db.query(
      `SELECT p.id_producto, p.nombre, p.maneja_inventario,
              SUM(dv.cantidad) AS unidades,
              SUM(dv.subtotal) AS ingresos,
              p.existencia_actual AS stock_actual,
              p.existencia_minima,
              (p.maneja_inventario AND p.existencia_actual <= p.existencia_minima) AS bajo_minimo
       FROM detalle_venta dv
       JOIN venta v ON v.codigo_venta = dv.codigo_venta
       JOIN producto p ON p.id_producto = dv.id_producto
       WHERE v.estado = 'Pagada'
         AND v.fecha >= ? AND v.fecha < DATE_ADD(?, INTERVAL 1 DAY)
       GROUP BY p.id_producto, p.nombre, p.maneja_inventario, p.existencia_actual, p.existencia_minima
       ORDER BY unidades DESC, p.nombre`,
      [desde, hasta]
    );
    res.json(rows.map((r) => ({
      id_producto: r.id_producto,
      nombre: r.nombre,
      maneja_inventario: Number(r.maneja_inventario),
      unidades: Number(r.unidades),
      ingresos: Number(r.ingresos),
      stock_actual: Number(r.stock_actual),
      existencia_minima: Number(r.existencia_minima),
      bajo_minimo: Number(r.bajo_minimo)
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/reportes", async (req, res) => {
  const tipoFinal = req.body.tipo_reporte || req.body.tipo;
  const { titulo, descripcion, contenido, id_usuario_genera } = req.body;
  if (!titulo || !tipoFinal) {
    return res.status(400).json({ mensaje: "Título y tipo de reporte son obligatorios" });
  }

  try {
    let contenidoGenerado = contenido;
    if (!contenidoGenerado) {
      if (tipoFinal === "Ventas") {
        const [v] = await db.query("SELECT COUNT(*) AS total, COALESCE(SUM(total),0) AS ingresos FROM venta WHERE estado='Pagada'");
        contenidoGenerado = `Ventas pagadas: ${v[0].total} | Ingresos totales: $${v[0].ingresos}`;
      } else if (tipoFinal === "Existencias") {
        const [p] = await db.query("SELECT COUNT(*) AS bajo FROM producto WHERE existencia_actual <= existencia_minima");
        contenidoGenerado = `Productos en alerta baja: ${p[0].bajo}`;
      } else if (tipoFinal === "Clientes") {
        const [c] = await db.query("SELECT COUNT(*) AS clientes FROM usuario u JOIN rol r ON u.id_rol = r.id_rol WHERE r.nombre_rol = 'Cliente'");
        contenidoGenerado = `Total de clientes registrados: ${c[0].clientes}`;
      } else {
        contenidoGenerado = descripcion || "Reporte generado por el administrador";
      }
    }

    const [r] = await db.query(
      `INSERT INTO reporte (titulo, tipo_reporte, fecha_generacion, id_usuario_genera, descripcion, contenido)
       VALUES (?, ?, NOW(), ?, ?, ?)`,
      [titulo, tipoFinal, id_usuario_genera || 1, descripcion || "", contenidoGenerado]
    );
    res.status(201).json({ mensaje: "Reporte generado con éxito", id_reporte: r.insertId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/reportes/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM reporte WHERE id_reporte=?", [req.params.id]);
    res.json({ mensaje: "Reporte eliminado" });
  } catch (e) { res.status(500).json({ mensaje: "No se puede eliminar el reporte." }); }
});

// Rutas del panel del cliente: perfil y estado de pedidos (backend/rutas-panel.js)
app.use("/api", require("./rutas-panel"));

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});