module.exports = function registrarRutas(app) {
  const { db } = require("./contexto-rutas");

  app.get("/api/reportes", async (req, res) => {
    try {
      const [rows] = await db.query({
        sql: `SELECT r.id_reporte, r.titulo, r.tipo_reporte, r.fecha_generacion,
                 r.descripcion, r.contenido, CONCAT(u.nombre,' ',u.apellido) AS generado_por
              FROM reporte r
              LEFT JOIN usuario u ON r.id_usuario_genera = u.id_usuario
              WHERE r.tipo_reporte NOT IN ('Suspensión de producto', 'Suspensión de usuario')
              ORDER BY r.fecha_generacion DESC`,
        dateStrings: true,
      });
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Ventas por producto en un rango de fechas (solo ventas Pagadas).
  // GET /api/reportes/ventas-productos?desde=AAAA-MM-DD&hasta=AAAA-MM-DD
  // Cuenta cada venta por su fecha de registro (venta.fecha), incluyendo todo el día "hasta".
  // Ingresos = cantidad x precio_unitario de las líneas (antes de descuentos de la venta y sin restar devoluciones).
  app.get("/api/reportes/ventas-productos", async (req, res) => {
    const { desde, hasta } = req.query;
    const esFecha = (s) => {
      if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
      const d = new Date(s + "T00:00:00Z");
      return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
    };
    if (!esFecha(desde) || !esFecha(hasta)) {
      return res
        .status(400)
        .json({ mensaje: "Envía desde y hasta con formato AAAA-MM-DD" });
    }
    if (desde > hasta) {
      return res
        .status(400)
        .json({ mensaje: "La fecha inicial no puede ser posterior a la final" });
    }

    try {
      const [rows] = await db.query(
        `SELECT p.id_producto, p.nombre, p.maneja_inventario,
                SUM(dv.cantidad) AS unidades,
                SUM(dv.subtotal) AS ingresos,
                p.existencia_actual AS stock_actual,
                p.existencia_minima,
                (p.maneja_inventario AND p.existencia_actual <= p.existencia_minima) AS bajo_minimo
         FROM detalle_venta dv
         JOIN venta v ON v.codigo_venta = dv.codigo_venta
         JOIN producto p ON p.id_producto = dv.id_producto
         WHERE v.estado = 'Pagada'
           AND v.fecha >= ? AND v.fecha < DATE_ADD(?, INTERVAL 1 DAY)
         GROUP BY p.id_producto, p.nombre, p.maneja_inventario, p.existencia_actual, p.existencia_minima
         ORDER BY unidades DESC, p.nombre`,
        [desde, hasta],
      );
      res.json(
        rows.map((r) => ({
          id_producto: r.id_producto,
          nombre: r.nombre,
          maneja_inventario: Number(r.maneja_inventario),
          unidades: Number(r.unidades),
          ingresos: Number(r.ingresos),
          stock_actual: Number(r.stock_actual),
          existencia_minima: Number(r.existencia_minima),
          bajo_minimo: Number(r.bajo_minimo),
        })),
      );
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/reportes", async (req, res) => {
    const tipoFinal = req.body.tipo_reporte || req.body.tipo;
    const { titulo, descripcion, contenido, id_usuario_genera } = req.body;
    if (!titulo || !tipoFinal) {
      return res
        .status(400)
        .json({ mensaje: "Título y tipo de reporte son obligatorios" });
    }

    try {
      let contenidoGenerado = contenido;
      if (!contenidoGenerado) {
        if (tipoFinal === "Ventas") {
          const [v] = await db.query(
            "SELECT COUNT(*) AS total, COALESCE(SUM(total),0) AS ingresos FROM venta WHERE estado='Pagada'",
          );
          contenidoGenerado = `Ventas pagadas: ${v[0].total} | Ingresos totales: $${v[0].ingresos}`;
        } else if (tipoFinal === "Existencias") {
          const [p] = await db.query(
            "SELECT COUNT(*) AS bajo FROM producto WHERE existencia_actual <= existencia_minima",
          );
          contenidoGenerado = `Productos en alerta baja: ${p[0].bajo}`;
        } else if (tipoFinal === "Clientes") {
          const [c] = await db.query(
            "SELECT COUNT(*) AS clientes FROM usuario u JOIN rol r ON u.id_rol = r.id_rol WHERE r.nombre_rol = 'Cliente'",
          );
          contenidoGenerado = `Total de clientes registrados: ${c[0].clientes}`;
        } else {
          contenidoGenerado =
            descripcion || "Reporte generado por el administrador";
        }
      }

      const [r] = await db.query(
        `INSERT INTO reporte (titulo, tipo_reporte, fecha_generacion, id_usuario_genera, descripcion, contenido)
         VALUES (?, ?, NOW(), ?, ?, ?)`,
        [
          titulo,
          tipoFinal,
          id_usuario_genera || 1,
          descripcion || "",
          contenidoGenerado,
        ],
      );
      res
        .status(201)
        .json({ mensaje: "Reporte generado con éxito", id_reporte: r.insertId });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/reportes/:id", async (req, res) => {
    try {
      await db.query("DELETE FROM reporte WHERE id_reporte=?", [req.params.id]);
      res.json({ mensaje: "Reporte eliminado" });
    } catch (e) {
      res.status(500).json({ mensaje: "No se puede eliminar el reporte." });
    }
  });
};
