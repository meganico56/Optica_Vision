module.exports = function registrarRutas(app) {
  const { db } = require("./contexto-rutas");

  app.get("/api/promociones", async (req, res) => {
    try {
      const [rows] = await db.query({
        sql: `SELECT codigo_promocion, nombre, descripcion, tipo_descuento,
                 valor_descuento, fecha_inicio, fecha_fin, estado
              FROM promocion ORDER BY codigo_promocion DESC`,
        dateStrings: true,
      });
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/promociones", async (req, res) => {
    const {
      nombre,
      descripcion,
      tipo_descuento,
      valor_descuento,
      fecha_inicio,
      fecha_fin,
      estado,
    } = req.body;
    if (!nombre || !tipo_descuento || !valor_descuento)
      return res
        .status(400)
        .json({ mensaje: "Nombre, tipo y valor del descuento son obligatorios" });
    try {
      const [r] = await db.query(
        `INSERT INTO promocion (nombre, descripcion, tipo_descuento, valor_descuento, fecha_inicio, fecha_fin, estado)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          nombre,
          descripcion || "",
          tipo_descuento,
          valor_descuento,
          fecha_inicio || null,
          fecha_fin || null,
          estado || "Activo",
        ],
      );
      res
        .status(201)
        .json({ mensaje: "Promoción creada", codigo_promocion: r.insertId });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/promociones/:id", async (req, res) => {
    const { id } = req.params;
    const {
      nombre,
      descripcion,
      tipo_descuento,
      valor_descuento,
      fecha_inicio,
      fecha_fin,
      estado,
    } = req.body;
    try {
      await db.query(
        `UPDATE promocion SET nombre=COALESCE(?,nombre), descripcion=COALESCE(?,descripcion),
         tipo_descuento=COALESCE(?,tipo_descuento), valor_descuento=COALESCE(?,valor_descuento),
         fecha_inicio=COALESCE(?,fecha_inicio), fecha_fin=COALESCE(?,fecha_fin), estado=COALESCE(?,estado)
         WHERE codigo_promocion=?`,
        [
          nombre,
          descripcion,
          tipo_descuento,
          valor_descuento,
          fecha_inicio,
          fecha_fin,
          estado,
          id,
        ],
      );
      res.json({ mensaje: "Promoción actualizada" });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/promociones/:id", async (req, res) => {
    try {
      await db.query("DELETE FROM promocion WHERE codigo_promocion=?", [
        req.params.id,
      ]);
      res.json({ mensaje: "Promoción eliminada" });
    } catch (e) {
      res.status(500).json({ mensaje: "No se puede eliminar la promoción." });
    }
  });
};
