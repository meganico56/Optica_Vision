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

// Mismo cotejamiento que el resto de la base, para poder cruzarla con producto, usuario, etc.
async function crearTabla() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS panel_suspensiones (
      tipo VARCHAR(32) NOT NULL,
      id_registro VARCHAR(64) NOT NULL,
      fecha_suspension TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (tipo, id_registro)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Las tablas creadas antes sin cotejamiento explícito se convierten una sola vez
  const [[tabla]] = await db.query(
    `SELECT TABLE_COLLATION AS cotejamiento FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'panel_suspensiones'`,
  );
  if (tabla && tabla.cotejamiento !== "utf8mb4_unicode_ci") {
    await db.query(
      "ALTER TABLE panel_suspensiones CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
    );
  }

  const [tablaAnterior] = await db.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'panel_suspension'`,
  );
  if (tablaAnterior.length > 0) {
    await db.query(
      `INSERT IGNORE INTO panel_suspensiones (tipo, id_registro, fecha_suspension)
       SELECT tipo, id_registro, fecha_suspension FROM panel_suspension`,
    );
    // Evita que una reactivación en la tabla actual se revierta al reiniciar.
    await db.query("DELETE FROM panel_suspension");
  }

}

async function asegurarTabla() {
  if (!tablaLista) {
    tablaLista = crearTabla();
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

router.get("/suspensiones/reportes", async (req, res) => {
  try {
    await asegurarTabla();
    const [productos] = await db.query({
      sql: `SELECT ps.id_registro, p.nombre, p.sku,
                   COALESCE(
                     (SELECT r.descripcion
                      FROM reporte r
                      WHERE r.tipo_reporte = 'Suspensión de producto'
                        AND (
                          r.contenido = CONCAT(
                            'Producto: ', p.nombre, ' | SKU: ', p.sku,
                            ' | ID: ', ps.id_registro
                          )
                          OR r.titulo = CONCAT('Suspensión de producto: ', p.nombre)
                        )
                      ORDER BY r.fecha_generacion DESC, r.id_reporte DESC
                      LIMIT 1),
                     ''
                   ) AS motivo,
                   DATE_FORMAT(ps.fecha_suspension, '%d/%m/%Y %H:%i:%s') AS fecha_suspension
            FROM panel_suspensiones ps
            INNER JOIN producto p
              ON BINARY CAST(p.id_producto AS CHAR) = BINARY ps.id_registro
            WHERE ps.tipo = 'producto'
            ORDER BY ps.fecha_suspension DESC, ps.id_registro DESC`,
      dateStrings: true,
    });
    const [usuarios] = await db.query({
      sql: `SELECT ps.id_registro, u.nombre, u.apellido, u.correo,
                   COALESCE(
                     (SELECT r.descripcion
                      FROM reporte r
                      WHERE r.tipo_reporte = 'Suspensión de usuario'
                        AND (
                          r.contenido = CONCAT(
                            'Usuario: ', u.nombre, ' ', u.apellido,
                            ' | Correo: ', COALESCE(NULLIF(u.correo, ''), 'Sin correo'),
                            ' | ID: ', ps.id_registro
                          )
                          OR r.titulo = CONCAT(
                            'Suspensión de usuario: ', u.nombre, ' ', u.apellido
                          )
                        )
                      ORDER BY r.fecha_generacion DESC, r.id_reporte DESC
                      LIMIT 1),
                     ''
                   ) AS motivo,
                   DATE_FORMAT(ps.fecha_suspension, '%d/%m/%Y %H:%i:%s') AS fecha_suspension
            FROM panel_suspensiones ps
            INNER JOIN usuario u
              ON BINARY CAST(u.id_usuario AS CHAR) = BINARY ps.id_registro
            WHERE ps.tipo = 'usuario'
            ORDER BY ps.fecha_suspension DESC, ps.id_registro DESC`,
      dateStrings: true,
    });
    res.json({ productos, usuarios });
  } catch (error) {
    console.error("Error en GET /api/suspensiones/reportes:", error);
    res.status(500).json({
      mensaje: "No se pudieron consultar los reportes de suspensión",
    });
  }
});

router.put("/suspensiones", async (req, res) => {
  const { tipo, id, suspendido, motivo } = req.body || {};
  if (!registroValido(tipo, id) || typeof suspendido !== "boolean") {
    return res.status(400).json({ mensaje: "Datos de suspensión no válidos" });
  }

  const motivoNormalizado = typeof motivo === "string" ? motivo.trim() : "";
  const requiereMotivo =
    tipo === "producto" || tipo === "usuario";
  if (requiereMotivo && suspendido && !motivoNormalizado) {
    return res
      .status(400)
      .json({ mensaje: "Escribe el motivo de suspensión" });
  }
  if (requiereMotivo && motivoNormalizado.length > 255) {
    return res
      .status(400)
      .json({ mensaje: "El motivo no debe superar 255 caracteres" });
  }
  if (
    suspendido &&
    tipo === "usuario" &&
    String(req.usuario.id_usuario) === String(id)
  ) {
    return res.status(400).json({
      mensaje: "No puedes suspender la cuenta con la que iniciaste sesión.",
    });
  }

  const idRegistro = String(id);
  let conexion;
  let transaccionIniciada = false;
  try {
    await asegurarTabla();
    conexion = await db.getConnection();
    await conexion.beginTransaction();
    transaccionIniciada = true;

    if (suspendido) {
      if (requiereMotivo) {
        if (tipo === "producto") {
          const [productos] = await conexion.query(
            `SELECT id_producto
             FROM producto
             WHERE id_producto = ?
             FOR UPDATE`,
            [idRegistro],
          );
          if (productos.length === 0) {
            const error = new Error("No se encontró el producto");
            error.status = 404;
            throw error;
          }
        } else {
          const [usuarios] = await conexion.query(
            `SELECT id_usuario
             FROM usuario
             WHERE id_usuario = ?
             FOR UPDATE`,
            [idRegistro],
          );
          if (usuarios.length === 0) {
            const error = new Error("No se encontró el usuario");
            error.status = 404;
            throw error;
          }
        }

        const [suspensiones] = await conexion.query(
          `SELECT id_registro FROM panel_suspensiones
           WHERE tipo = ? AND id_registro = ?
           FOR UPDATE`,
          [tipo, idRegistro],
        );
        if (suspensiones.length === 0) {
          await conexion.query(
            `INSERT INTO panel_suspensiones (tipo, id_registro)
             VALUES (?, ?)`,
            [tipo, idRegistro],
          );
          if (tipo === "usuario") {
            await conexion.query(
              "DELETE FROM sesion_usuario WHERE id_usuario = ?",
              [idRegistro],
            );
          }
          await conexion.commit();
          transaccionIniciada = false;
          return res.json({
            tipo,
            id: idRegistro,
            suspendido,
          });
        }
        if (tipo === "usuario") {
          await conexion.query(
            "DELETE FROM sesion_usuario WHERE id_usuario = ?",
            [idRegistro],
          );
        }
      } else {
        await conexion.query(
          `INSERT INTO panel_suspensiones (tipo, id_registro)
           VALUES (?, ?)
           ON DUPLICATE KEY UPDATE fecha_suspension = CURRENT_TIMESTAMP`,
          [tipo, idRegistro],
        );
      }
    } else {
      await conexion.query(
        "DELETE FROM panel_suspensiones WHERE tipo = ? AND id_registro = ?",
        [tipo, idRegistro],
      );
    }

    await conexion.commit();
    transaccionIniciada = false;
    res.json({ tipo, id: idRegistro, suspendido });
  } catch (error) {
    if (transaccionIniciada && conexion) {
      try {
        await conexion.rollback();
      } catch (errorRollback) {
        console.error("Error al revertir una suspensión:", errorRollback);
      }
    }
    console.error("Error en PUT /api/suspensiones:", error);
    if (error.status) {
      return res.status(error.status).json({ mensaje: error.message });
    }
    res.status(500).json({ mensaje: "No se pudo actualizar la suspensión" });
  } finally {
    if (conexion) conexion.release();
  }
});

router.asegurarTabla = asegurarTabla;
module.exports = router;


