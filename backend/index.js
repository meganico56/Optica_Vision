const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const db = require("./db");

const fs = require("fs");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json({ limit: "15mb" }));

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

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
