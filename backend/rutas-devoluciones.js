module.exports = function registrarRutas(app) {
  const { db, MOTIVOS_DEVOLUCION, DESTINOS_DEVOLUCION, errorHttp, responderError } = require("./contexto-rutas");

  app.get("/api/devoluciones", async (req, res) => {
    try {
      const [rows] = await db.query({
        dateStrings: true,
        sql: `
        SELECT d.id_devolucion, d.fecha, d.motivo, d.cantidad, d.destino, d.valor_devuelto, d.observaciones,
               dv.codigo_venta,
               CONCAT(u.nombre,' ',u.apellido) AS registrado_por
        FROM devolucion d
        LEFT JOIN detalle_venta dv ON d.codigo_detalle_venta = dv.codigo_detalle_venta
        LEFT JOIN usuario u ON d.id_usuario = u.id_usuario
        ORDER BY d.id_devolucion DESC`,
      });
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/devoluciones", async (req, res) => {
    const {
      motivo,
      cantidad,
      observaciones,
      codigo_detalle_venta,
      codigo_venta,
      id_producto,
      destino,
      id_usuario,
    } = req.body;
    const cant = Number(cantidad);
    if (!motivo || !Number.isInteger(cant) || cant <= 0) {
      return res.status(400).json({
        mensaje: "Motivo y una cantidad entera mayor que 0 son obligatorios",
      });
    }
    const destinoFinal = destino || "Descarte";
    if (!DESTINOS_DEVOLUCION.includes(destinoFinal)) {
      return res
        .status(400)
        .json({ mensaje: "Destino de la devolución no válido" });
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
          [codigo_detalle_venta],
        );
      } else if (codigo_venta) {
        const [detalles] = await conn.query(
          `SELECT dv.codigo_detalle_venta, dv.codigo_venta, dv.id_producto, dv.cantidad, dv.precio_unitario, v.estado, p.maneja_inventario
           FROM detalle_venta dv JOIN venta v ON v.codigo_venta = dv.codigo_venta JOIN producto p ON p.id_producto = dv.id_producto
           WHERE dv.codigo_venta = ? AND (? IS NULL OR dv.id_producto = ?)`,
          [codigo_venta, id_producto || null, id_producto || null],
        );
        if (detalles.length > 1) {
          throw errorHttp(
            400,
            "La venta tiene varios productos: indica cuál se devuelve (codigo_detalle_venta o id_producto)",
          );
        }
        detalle = detalles[0];
      } else {
        throw errorHttp(
          400,
          "Indica la venta (codigo_venta) o el detalle (codigo_detalle_venta) que se devuelve",
        );
      }

      if (!detalle)
        throw errorHttp(404, "No se encontró el producto de la venta indicada");
      if (detalle.estado !== "Pagada")
        throw errorHttp(
          409,
          "Solo se pueden devolver productos de ventas pagadas",
        );

      const [[{ devuelto }]] = await conn.query(
        "SELECT COALESCE(SUM(cantidad), 0) AS devuelto FROM devolucion WHERE codigo_detalle_venta = ?",
        [detalle.codigo_detalle_venta],
      );
      if (cant > detalle.cantidad - Number(devuelto)) {
        throw errorHttp(
          409,
          `Solo quedan ${detalle.cantidad - Number(devuelto)} unidad(es) por devolver de este producto`,
        );
      }

      const idUsuario = id_usuario || 1;
      const valor = cant * Number(detalle.precio_unitario);
      const [r] = await conn.query(
        `INSERT INTO devolucion (fecha, motivo, cantidad, destino, valor_devuelto, observaciones, codigo_detalle_venta, id_usuario)
         VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?)`,
        [
          motivoFinal,
          cant,
          destinoFinal,
          valor,
          obsFinal,
          detalle.codigo_detalle_venta,
          idUsuario,
        ],
      );

      if (destinoFinal === "Vuelve a inventario" && detalle.maneja_inventario) {
        await conn.query(
          "UPDATE producto SET existencia_actual = existencia_actual + ? WHERE id_producto = ?",
          [cant, detalle.id_producto],
        );
        await conn.query(
          `INSERT INTO movimiento_inventario (tipo, cantidad, observaciones, id_producto, id_usuario, codigo_venta, id_devolucion)
           VALUES ('Devolucion de cliente', ?, ?, ?, ?, ?, ?)`,
          [
            cant,
            `Devolución de la venta #${detalle.codigo_venta}`,
            detalle.id_producto,
            idUsuario,
            detalle.codigo_venta,
            r.insertId,
          ],
        );
      }

      await conn.commit();
      res
        .status(201)
        .json({ mensaje: "Devolución registrada", id_devolucion: r.insertId });
    } catch (e) {
      await conn.rollback();
      responderError(res, e);
    } finally {
      conn.release();
    }
  });

  app.delete("/api/devoluciones/:id", async (req, res) => {
    try {
      await db.query("DELETE FROM devolucion WHERE id_devolucion=?", [
        req.params.id,
      ]);
      res.json({ mensaje: "Devolución eliminada" });
    } catch (e) {
      res.status(500).json({ mensaje: "No se puede eliminar la devolución." });
    }
  });
};
