// rutas-calendario.js - Gestión de bloqueos y disponibilidad del calendario de citas
const express = require("express");
const db = require("./db");

const router = express.Router();

let tablaBloqueosIniciada = false;

async function asegurarTablaBloqueos() {
  if (tablaBloqueosIniciada) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS bloqueo_calendario (
      id_bloqueo INT AUTO_INCREMENT PRIMARY KEY,
      fecha_inicio DATE NOT NULL,
      fecha_fin DATE NOT NULL,
      motivo VARCHAR(255) NOT NULL DEFAULT 'Día no laboral',
      id_usuario INT NULL,
      fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_rango_fechas (fecha_inicio, fecha_fin)
    ) DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
  `);
  tablaBloqueosIniciada = true;
}

// Obtener todos los bloqueos de calendario registrados
router.get("/calendario/bloqueos", async (req, res) => {
  try {
    await asegurarTablaBloqueos();
    const [filas] = await db.query(`
      SELECT
        b.id_bloqueo,
        DATE_FORMAT(b.fecha_inicio, '%Y-%m-%d') AS fecha_inicio,
        DATE_FORMAT(b.fecha_fin, '%Y-%m-%d') AS fecha_fin,
        DATEDIFF(b.fecha_fin, b.fecha_inicio) + 1 AS total_dias,
        b.motivo,
        b.id_usuario,
        DATE_FORMAT(b.fecha_creacion, '%Y-%m-%d %H:%i') AS fecha_creacion,
        CONCAT(COALESCE(u.nombre, ''), ' ', COALESCE(u.apellido, '')) AS registrado_por
      FROM bloqueo_calendario b
      LEFT JOIN usuario u ON b.id_usuario = u.id_usuario
      ORDER BY b.fecha_inicio DESC
    `);
    res.json(filas);
  } catch (error) {
    console.error("Error al obtener bloqueos de calendario:", error);
    res.status(500).json({ error: "Error al obtener la lista de bloqueos del calendario" });
  }
});

// Verificar si una fecha específica está bloqueada
router.get("/calendario/verificar", async (req, res) => {
  const { fecha } = req.query;
  if (!fecha) {
    return res.status(400).json({ error: "Debe especificar una fecha (YYYY-MM-DD)" });
  }

  try {
    await asegurarTablaBloqueos();
    const [filas] = await db.query(
      `SELECT id_bloqueo,
              DATE_FORMAT(fecha_inicio, '%Y-%m-%d') AS fecha_inicio,
              DATE_FORMAT(fecha_fin, '%Y-%m-%d') AS fecha_fin,
              motivo
       FROM bloqueo_calendario
       WHERE ? BETWEEN fecha_inicio AND fecha_fin
       LIMIT 1`,
      [fecha]
    );

    if (filas.length > 0) {
      return res.json({ bloqueado: true, bloqueo: filas[0] });
    }
    res.json({ bloqueado: false });
  } catch (error) {
    console.error("Error al verificar fecha:", error);
    res.status(500).json({ error: "Error al verificar disponibilidad de la fecha" });
  }
});

// Registrar un nuevo bloqueo (un solo día o rango de días)
router.post("/calendario/bloqueos", async (req, res) => {
  let { fecha_inicio, fecha_fin, motivo, dias, id_usuario } = req.body;

  if (!fecha_inicio) {
    return res.status(400).json({ error: "La fecha de inicio es obligatoria" });
  }

  // Si se envió 'dias' y no fecha_fin, calcular fecha_fin sumando días - 1
  if (!fecha_fin) {
    const numDias = parseInt(dias, 10);
    if (!isNaN(numDias) && numDias > 0) {
      const dt = new Date(fecha_inicio + "T00:00:00");
      dt.setDate(dt.getDate() + (numDias - 1));
      fecha_fin = dt.toISOString().split("T")[0];
    } else {
      fecha_fin = fecha_inicio;
    }
  }

  if (fecha_fin < fecha_inicio) {
    return res.status(400).json({ error: "La fecha de fin no puede ser anterior a la de inicio" });
  }

  const formatoFechaValido = /^\d{4}-\d{2}-\d{2}$/;
  if (!formatoFechaValido.test(fecha_inicio) || !formatoFechaValido.test(fecha_fin)) {
    return res.status(400).json({ error: "Las fechas deben tener el formato YYYY-MM-DD" });
  }

  const inicio = new Date(fecha_inicio + "T00:00:00");
  const fin = new Date(fecha_fin + "T00:00:00");
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
    return res.status(400).json({ error: "Las fechas seleccionadas no son válidas" });
  }

  const motivoFinal = (motivo && motivo.trim()) ? motivo.trim() : "Día no laboral / Sin servicio";

  try {
    await asegurarTablaBloqueos();

    const [[hoy]] = await db.query("SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS hoy");
    if (fecha_inicio < hoy.hoy) {
      return res.status(400).json({ error: "No se pueden bloquear fechas anteriores al día de hoy" });
    }

    // Comprobar si ya existe algún solapamiento
    const [existentes] = await db.query(
      `SELECT id_bloqueo, motivo,
              DATE_FORMAT(fecha_inicio, '%Y-%m-%d') AS fecha_inicio,
              DATE_FORMAT(fecha_fin, '%Y-%m-%d') AS fecha_fin
       FROM bloqueo_calendario
       WHERE (fecha_inicio <= ? AND fecha_fin >= ?)`,
      [fecha_fin, fecha_inicio]
    );

    if (existentes.length > 0) {
      const e = existentes[0];
      return res.status(409).json({
        error: `Ya existe un bloqueo en ese periodo (${e.fecha_inicio} al ${e.fecha_fin}: "${e.motivo}")`
      });
    }

    const [resultado] = await db.query(
      `INSERT INTO bloqueo_calendario (fecha_inicio, fecha_fin, motivo, id_usuario)
       VALUES (?, ?, ?, ?)`,
      [fecha_inicio, fecha_fin, motivoFinal, id_usuario || null]
    );

    res.status(201).json({
      mensaje: "Periodo bloqueado con éxito en el calendario",
      id_bloqueo: resultado.insertId,
      fecha_inicio,
      fecha_fin,
      motivo: motivoFinal
    });
  } catch (error) {
    console.error("Error al registrar bloqueo de calendario:", error);
    res.status(500).json({ error: "Error al registrar el bloqueo en el calendario" });
  }
});

// Eliminar un bloqueo
router.delete("/calendario/bloqueos/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await asegurarTablaBloqueos();
    const [resDelete] = await db.query(
      "DELETE FROM bloqueo_calendario WHERE id_bloqueo = ?",
      [id]
    );

    if (resDelete.affectedRows === 0) {
      return res.status(404).json({ error: "Bloqueo no encontrado" });
    }

    res.json({ mensaje: "Bloqueo eliminado correctamente. El calendario vuelve a estar disponible para esas fechas." });
  } catch (error) {
    console.error("Error al eliminar bloqueo:", error);
    res.status(500).json({ error: "Error al eliminar el bloqueo del calendario" });
  }
});

// Función exportable para verificar en backend si una fecha está bloqueada
async function fechaEstaBloqueada(fechaStr) {
  try {
    await asegurarTablaBloqueos();
    const soloFecha = fechaStr.includes(" ") ? fechaStr.split(" ")[0] : (fechaStr.includes("T") ? fechaStr.split("T")[0] : fechaStr);
    const [filas] = await db.query(
      `SELECT motivo FROM bloqueo_calendario WHERE ? BETWEEN fecha_inicio AND fecha_fin LIMIT 1`,
      [soloFecha]
    );
    return filas.length > 0 ? filas[0] : null;
  } catch (err) {
    console.error("Error al comprobar fecha bloqueada:", err);
    return null;
  }
}

module.exports = {
  router,
  fechaEstaBloqueada
};
