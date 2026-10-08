const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const db = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("API de Óptica Visión funcionando correctamente");
});

// Ruta para obtener productos (soporta filtro por categoria ?categoria= y búsqueda ?q=)
app.get("/api/productos", async (req, res) => {
  const { q: busqueda, categoria } = req.query;

  try {
    let query = "SELECT * FROM producto WHERE 1=1";
    let params = [];

    // Filtro por término de búsqueda
    if (busqueda && busqueda.trim() !== "") {
      query += " AND (nombre LIKE ? OR descripcion LIKE ?)";
      params.push(`%${busqueda}%`, `%${busqueda}%`);
    }

    // Filtro por categoría
    if (categoria && categoria.trim() !== "" && categoria.toUpperCase() !== "TODOS") {
      query += " AND LOWER(categoria) = LOWER(?)";
      params.push(categoria);
    }

    const [filas] = await db.query(query, params);
    res.json(filas);
  } catch (error) {
    console.error("Error al consultar MySQL en /api/productos:", error);
    res.status(500).json({
      error: "Error interno del servidor",
      detalle: error.message
    });
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
