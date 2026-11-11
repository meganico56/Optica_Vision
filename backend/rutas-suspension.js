const express = require("express");
const db = require("./db");

const router = express.Router();
console.log("rutas de suspension cargadas");
const TIPOS_SUSPENDIBLES = new Set([
  "producto",
  "marca",
  "categoria",
  "usuario",
  "proveedor",
  "venta",
  "devolucion",
  "compra",
  "cita",
  "receta",
  "promocion",
  "reporte",
]);

let tablaLista;

async function asegurarTabla() {
  if (!tablaLista) {
    tablaLista = db.query(`
      CREATE TABLE IF NOT EXISTS panel_suspensiones (
        tipo VARCHAR(32) NOT NULL,
        id_registro VARCHAR(64) NOT NULL,
        fecha_suspension TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (tipo, id_registro)
      )
    `);
  }

  try {
    await tablaLista;
  } catch (error) {
    tablaLista = null;
    throw error;
  }
}

function registroValido(tipo, id) {
  const idValido =
    typeof id === "string" ||
    (typeof id === "number" && Number.isSafeInteger(id) && id > 0);
  return (
    TIPOS_SUSPENDIBLES.has(tipo) &&
    idValido &&
    /^[A-Za-z0-9._-]{1,64}$/.test(String(id))
  );
}

router.get("/suspensiones", async (req, res) => {
  try {
    await asegurarTabla();
    const [filas] = await db.query(
      "SELECT tipo, id_registro FROM panel_suspensiones",
    );
    res.json(filas);
  } catch (error) {
    console.error("Error en GET /api/suspensiones:", error);
    res
      .status(500)
      .json({ mensaje: "No se pudieron consultar las suspensiones" });
  }
});

router.put("/suspensiones", async (req, res) => {
  const { tipo, id, suspendido } = req.body;
  if (!registroValido(tipo, id) || typeof suspendido !== "boolean") {
    return res.status(400).json({ mensaje: "Datos de suspensión no válidos" });
  }

  const idRegistro = String(id);
  try {
    await asegurarTabla();
    if (suspendido) {
      await db.query(
        `INSERT INTO panel_suspensiones (tipo, id_registro)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE fecha_suspension = CURRENT_TIMESTAMP`,
        [tipo, idRegistro],
      );
    } else {
      await db.query(
        "DELETE FROM panel_suspensiones WHERE tipo = ? AND id_registro = ?",
        [tipo, idRegistro],
      );
    }
    res.json({ tipo, id: idRegistro, suspendido });
  } catch (error) {
    console.error("Error en PUT /api/suspensiones:", error);
    res.status(500).json({ mensaje: "No se pudo actualizar la suspensión" });
  }
});

module.exports = router;
