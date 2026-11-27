module.exports = function registrarRutas(app) {
  const { db, ESTADOS_VENTA, CANALES_VENTA, errorHttp, responderError, moverStockVenta } = require("./contexto-rutas");

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
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/ventas/:id/detalles", async (req, res) => {
    try {
      const [rows] = await db.query(
        `SELECT dv.*, p.nombre, p.imagen, p.descripcion, c.nombre AS categoria_nombre
         FROM detalle_venta dv
         LEFT JOIN producto p ON dv.id_producto = p.id_producto
         LEFT JOIN categoria c ON p.id_categoria = c.id_categoria
         WHERE dv.codigo_venta = ?`,
        [req.params.id],
      );
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Crear venta. Dos formas de uso:
  //  1) con items [{ id_producto, cantidad }]: el precio se toma de la base de datos y se guardan los detalles
  //  2) sin items, solo con subtotal (o total): registra el valor global (compatibilidad con el panel actual)
  // El stock se descuenta cuando la venta pasa a "Pagada" (aquí si nace pagada, o después con PUT).
  app.post("/api/ventas", async (req, res) => {
    const clienteId = req.body.id_cliente || req.body.id_usuario;
    const {
      items,
      estado,
      canal,
      codigo_promocion,
      id_receta,
      observaciones,
      id_usuario_registra,
    } = req.body;

    if (!clienteId)
      return res.status(400).json({ mensaje: "El cliente es obligatorio" });

    const estadoFinal = estado || "Pendiente";
    if (!ESTADOS_VENTA.includes(estadoFinal))
      return res.status(400).json({ mensaje: "Estado de venta no válido" });
    const canalFinal = canal || "Mostrador";
    if (!CANALES_VENTA.includes(canalFinal))
      return res.status(400).json({ mensaje: "Canal de venta no válido" });

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // Líneas de la venta (si vienen), uniendo productos repetidos
      const lineas = new Map();
      for (const it of Array.isArray(items) ? items : []) {
        const idProducto = Number(it.id_producto);
        const cantidad = Number(it.cantidad);
        if (
          !Number.isInteger(idProducto) ||
          idProducto <= 0 ||
          !Number.isInteger(cantidad) ||
          cantidad <= 0
        ) {
          throw errorHttp(
            400,
            "Cada producto necesita id_producto y una cantidad entera mayor que 0",
          );
        }
        lineas.set(idProducto, (lineas.get(idProducto) || 0) + cantidad);
      }

      let subtotal;
      const detalles = [];
      if (lineas.size > 0) {
        const ids = [...lineas.keys()];
        const [productos] = await conn.query(
          `SELECT
          p.id_producto,
          p.nombre,
          p.precio,
          p.existencia_actual,
          p.maneja_inventario,
          p.estado,
          EXISTS (
            SELECT 1
            FROM panel_suspensiones ps
            WHERE BINARY ps.tipo = BINARY 'producto'
            AND BINARY ps.id_registro = BINARY CAST(p.id_producto AS CHAR)
          ) AS suspendido
          FROM producto p
          WHERE p.id_producto IN (?)`,
          [ids],
        );
        const porId = new Map(productos.map((p) => [p.id_producto, p]));
        subtotal = 0;
        for (const [idProducto, cantidad] of lineas) {
          const p = porId.get(idProducto);
          if (!p || p.estado !== "Activo")
            throw errorHttp(400, `El producto ${idProducto} no está disponible`);

          if (p.suspendido) {
            throw errorHttp(
              400,
              `El producto "${p.nombre}" esta suspendido y no se puede comprar`,
            );
          }
          if (p.maneja_inventario && p.existencia_actual < cantidad) {
            throw errorHttp(
              409,
              `No hay existencias suficientes de "${p.nombre}"`,
            );
          }
          detalles.push({ cantidad, precio: p.precio, idProducto });
          subtotal += Number(p.precio) * cantidad;
        }
      } else {
        subtotal = Number(req.body.subtotal ?? req.body.total);
        if (!subtotal || subtotal <= 0) {
          throw errorHttp(
            400,
            "Envía los productos (items) o el valor de la venta",
          );
        }
      }

      // Descuento: por promoción vigente, o el valor manual que envíe el panel de administrador
      let descuento = Number(req.body.descuento) || 0;
      if (codigo_promocion) {
        const [promos] = await conn.query(
          `SELECT tipo_descuento, valor_descuento FROM promocion
           WHERE codigo_promocion = ? AND estado = 'Activo' AND CURDATE() BETWEEN fecha_inicio AND fecha_fin`,
          [codigo_promocion],
        );
        if (promos.length === 0)
          throw errorHttp(400, "La promoción no existe o no está vigente");
        const promo = promos[0];
        descuento =
          promo.tipo_descuento === "Porcentaje"
            ? Math.round(subtotal * Number(promo.valor_descuento)) / 100
            : Number(promo.valor_descuento);
      }
      descuento = Math.min(Math.max(descuento, 0), subtotal);
      const impuesto = Number(req.body.impuesto) || 0;

      const [r] = await conn.query(
        `INSERT INTO venta (fecha, canal, subtotal, descuento, impuesto, estado, observaciones, id_cliente, codigo_promocion, id_receta, id_usuario)
         VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          canalFinal,
          subtotal,
          descuento,
          impuesto,
          estadoFinal,
          observaciones || null,
          clienteId,
          codigo_promocion || null,
          id_receta || null,
          id_usuario_registra || clienteId,
        ],
      );
      const codigoVenta = r.insertId;

      for (const d of detalles) {
        await conn.query(
          "INSERT INTO detalle_venta (cantidad, precio_unitario, codigo_venta, id_producto) VALUES (?, ?, ?, ?)",
          [d.cantidad, d.precio, codigoVenta, d.idProducto],
        );
      }

      if (estadoFinal === "Pagada" && detalles.length > 0) {
        await moverStockVenta(
          conn,
          codigoVenta,
          -1,
          "Venta",
          id_usuario_registra,
        );
      }

      await conn.commit();
      res
        .status(201)
        .json({ mensaje: "Venta registrada", codigo_venta: codigoVenta });
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
    const { estado, observaciones, codigo_promocion, id_receta, id_usuario } =
      req.body;

    if (
      estado !== undefined &&
      estado !== null &&
      !ESTADOS_VENTA.includes(estado)
    ) {
      return res.status(400).json({ mensaje: "Estado de venta no válido" });
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [ventas] = await conn.query(
        "SELECT estado, subtotal, descuento, impuesto FROM venta WHERE codigo_venta = ? FOR UPDATE",
        [id],
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
          [id],
        );
        if (devs.length > 0)
          throw errorHttp(
            409,
            "La venta ya tiene devoluciones registradas y no se puede anular",
          );
      }

      const descuento =
        req.body.descuento !== undefined
          ? Number(req.body.descuento)
          : Number(actual.descuento);
      const impuesto =
        req.body.impuesto !== undefined
          ? Number(req.body.impuesto)
          : Number(actual.impuesto);
      let subtotal = Number(actual.subtotal);
      if (req.body.subtotal !== undefined) subtotal = Number(req.body.subtotal);
      else if (req.body.total !== undefined)
        subtotal = Number(req.body.total) + descuento - impuesto;

      if (descuento > subtotal)
        throw errorHttp(400, "El descuento no puede ser mayor que el subtotal");

      await conn.query(
        `UPDATE venta SET subtotal = ?, descuento = ?, impuesto = ?, estado = ?,
           observaciones = COALESCE(?, observaciones),
           codigo_promocion = COALESCE(?, codigo_promocion),
           id_receta = COALESCE(?, id_receta)
         WHERE codigo_venta = ?`,
        [
          subtotal,
          descuento,
          impuesto,
          nuevoEstado,
          observaciones,
          codigo_promocion,
          id_receta,
          id,
        ],
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
    } catch (e) {
      res.status(500).json({
        mensaje:
          "No se puede eliminar, tiene registros asociados. Puedes anularla.",
      });
    }
  });
};
