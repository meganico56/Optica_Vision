module.exports = function registrarRutas(app) {
  const { db } = require("./contexto-rutas");

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
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/recetas", async (req, res) => {
    const clienteId = req.body.id_cliente || req.body.id_usuario;
    const optometraFinal =
      req.body.nombre_optometra_externo || req.body.optometra;
    const {
      fecha_emision,
      fecha_vencimiento,
      diagnostico,
      entidad_examinadora,
      observaciones,
      id_cita,
      id_usuario_registra,
      od_esfera,
      od_cilindro,
      od_eje,
      od_adicion,
      oi_esfera,
      oi_cilindro,
      oi_eje,
      oi_adicion,
      distancia_pupilar,
    } = req.body;

    if (!fecha_emision || !fecha_vencimiento || !clienteId) {
      return res.status(400).json({
        mensaje: "Fechas de emisión, vencimiento y cliente son obligatorios",
      });
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
          [clienteId],
        );
        if (citasDisp.length > 0) {
          citaIdFinal = citasDisp[0].id_cita;
        } else {
          const [nuevaCita] = await db.query(
            `INSERT INTO cita (fecha_hora, duracion_minutos, motivo, estado, id_cliente, id_usuario_atiende)
             VALUES (NOW(), 30, 'Examen de optometría (receta)', 'Completada', ?, ?)`,
            [clienteId, id_usuario_registra || clienteId],
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
          fecha_emision,
          fecha_vencimiento,
          diagnostico || "Evaluación visual",
          entidad_examinadora || "Óptica Boutique de la Visión",
          optometraFinal || "Dr. Optómetra",
          observaciones || null,
          clienteId,
          citaIdFinal,
          id_usuario_registra || 1,
          od_esfera || null,
          od_cilindro || null,
          od_eje || null,
          od_adicion || null,
          oi_esfera || null,
          oi_cilindro || null,
          oi_eje || null,
          oi_adicion || null,
          distancia_pupilar || null,
        ],
      );
      res
        .status(201)
        .json({ mensaje: "Receta registrada", id_receta: r.insertId });
    } catch (e) {
      if (e.code === "ER_DUP_ENTRY") {
        return res
          .status(409)
          .json({ mensaje: "Esta cita ya tiene una receta asociada" });
      }
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/recetas/:id", async (req, res) => {
    try {
      await db.query("DELETE FROM receta_optica WHERE id_receta=?", [
        req.params.id,
      ]);
      res.json({ mensaje: "Receta eliminada" });
    } catch (e) {
      res.status(500).json({ mensaje: "No se puede eliminar la receta." });
    }
  });

  // ─────────────────────── DEVOLUCIONES (POST / DELETE) ───────────────────────
};
