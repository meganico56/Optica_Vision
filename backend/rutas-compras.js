module.exports = function registrarRutas(app) {
  const { db } = require("./contexto-rutas");

  app.get("/api/compras", async (req, res) => {
    try {
      const [rows] = await db.query({
        sql: `SELECT c.numero_compra, c.fecha, c.numero_comprobante, c.total, c.estado,
                 p.nombre AS proveedor, c.codigo_proveedor, c.sub_total, c.impuesto, c.observaciones
              FROM compra c
              LEFT JOIN proveedor p ON c.codigo_proveedor = p.codigo_proveedor
              ORDER BY c.numero_compra DESC`,
        dateStrings: true,
      });
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // compra.total es una columna calculada (sub_total + impuesto): se envía sub_total e impuesto.
  // Si el formulario solo manda "total", el sub_total se calcula como total - impuesto.
  app.post("/api/compras", async (req, res) => {
    const numComprobante = req.body.numero_comprobante || req.body.comprobante;
    const codProveedor = req.body.codigo_proveedor || req.body.id_proveedor;
    const { id_usuario, sub_total, impuesto, total, estado, observaciones } =
      req.body;
    if (
      !numComprobante ||
      !codProveedor ||
      (total === undefined && sub_total === undefined)
    ) {
      return res
        .status(400)
        .json({ mensaje: "Comprobante, proveedor y total son obligatorios" });
    }
    const estadoFinal = estado || "Confirmada";
    if (!["Pendiente", "Confirmada", "Cancelada"].includes(estadoFinal)) {
      return res.status(400).json({ mensaje: "Estado de compra no válido" });
    }
    try {
      const imp = Number(impuesto) || 0;
      const sub =
        sub_total !== undefined ? Number(sub_total) : Number(total) - imp;
      const [r] = await db.query(
        `INSERT INTO compra (fecha, numero_comprobante, sub_total, impuesto, estado, observaciones, codigo_proveedor, id_usuario)
         VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?)`,
        [
          numComprobante,
          sub,
          imp,
          estadoFinal,
          observaciones || null,
          codProveedor,
          id_usuario || 1,
        ],
      );
      res
        .status(201)
        .json({ mensaje: "Compra registrada", numero_compra: r.insertId });
    } catch (e) {
      if (e.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          mensaje: "Ya existe una compra con ese comprobante para este proveedor",
        });
      }
      if (e.code === "ER_NO_REFERENCED_ROW_2") {
        return res
          .status(400)
          .json({ mensaje: "El proveedor indicado no existe" });
      }
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/compras/:id", async (req, res) => {
    try {
      await db.query("DELETE FROM compra WHERE numero_compra=?", [req.params.id]);
      res.json({ mensaje: "Compra eliminada" });
    } catch (e) {
      res.status(500).json({
        mensaje: "No se puede eliminar la compra si tiene detalles asociados.",
      });
    }
  });
};
