const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("API de Óptica Visión funcionando correctamente");
});

// Ruta para obtener productos (soporta búsqueda por query ?q=)
app.get("/api/productos", async (req, res) => {
  const busqueda = req.query.q;

  try {
    let query = "SELECT * FROM producto";
    let params = [];

    if (busqueda) {
      query += " WHERE nombre LIKE ? OR descripcion LIKE ?";
      params = [`%${busqueda}%`, `%${busqueda}%`];
    }

    const [filas] = await db.query(query, params);
    res.json(filas);
  } catch (error) {
    console.error("Error al consultar MySQL:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Ruta para agendar cita (Tabla cita)
app.post("/api/citas", async (req, res) => {
  const { id_usuario, fecha_cita, hora_cita, motivo, estado } = req.body;

  try {
    const [resultado] = await db.query(
      "INSERT INTO cita (id_usuario, fecha_cita, hora_cita, motivo, estado) VALUES (?, ?, ?, ?, ?)",
      [
        id_usuario || null,
        fecha_cita,
        hora_cita,
        motivo || "Examen visual",
        estado || "Pendiente",
      ],
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

  try {
    const [usuarios] = await db.query(
      "SELECT u.*, r.nombre AS rol FROM usuario u LEFT JOIN rol r ON u.id_rol = r.id_rol WHERE u.correo = ? AND u.contrasena = ?",
      [correo, contrasena],
    );

    if (usuarios.length === 0) {
      return res.status(401).json({ mensaje: "Credenciales inválidas" });
    }

    const usuario = usuarios[0];
    res.json({
      mensaje: "Inicio de sesión exitoso",
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

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
