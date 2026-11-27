module.exports = function registrarRutas(app) {
  const { db } = require("./contexto-rutas");

  app.get("/api/proveedores", async (req, res) => {
    try {
      const [proveedores] = await db.query(
        "SELECT codigo_proveedor, nombre, nit, telefono, correo, direccion, estado FROM proveedor ORDER BY codigo_proveedor DESC",
      );
      res.json(proveedores);
    } catch (error) {
      console.error("Error al obtener proveedores:", error);
      res
        .status(500)
        .json({ error: "Error al obtener proveedores", detalle: error.message });
    }
  });

  app.post("/api/proveedores", async (req, res) => {
    const { nombre, nit, telefono, correo, direccion, estado } = req.body;
    if (!nombre || !nit || !telefono || !correo) {
      return res
        .status(400)
        .json({ mensaje: "Nombre, NIT, teléfono y correo son obligatorios" });
    }

    try {
      const [resultado] = await db.query(
        "INSERT INTO proveedor (nombre, nit, telefono, correo, direccion, estado) VALUES (?, ?, ?, ?, ?, ?)",
        [nombre, nit, telefono, correo, direccion || "", estado || "Activo"],
      );
      res.status(201).json({
        mensaje: "Proveedor creado con éxito",
        codigo_proveedor: resultado.insertId,
      });
    } catch (error) {
      console.error("Error al crear proveedor:", error);
      if (error.code === "ER_DUP_ENTRY") {
        return res
          .status(409)
          .json({ mensaje: "Ya existe un proveedor con ese NIT" });
      }
      res
        .status(500)
        .json({ mensaje: "Error al crear el proveedor", detalle: error.message });
    }
  });

  app.put("/api/proveedores/:id", async (req, res) => {
    const { id } = req.params;
    const { nombre, nit, telefono, correo, direccion, estado } = req.body;

    try {
      const [resultado] = await db.query(
        `UPDATE proveedor SET
           nombre = COALESCE(?, nombre),
           nit = COALESCE(?, nit),
           telefono = COALESCE(?, telefono),
           correo = COALESCE(?, correo),
           direccion = COALESCE(?, direccion),
           estado = COALESCE(?, estado)
         WHERE codigo_proveedor = ?`,
        [nombre, nit, telefono, correo, direccion, estado, id],
      );
      if (resultado.affectedRows === 0) {
        return res.status(404).json({ mensaje: "Proveedor no encontrado" });
      }
      res.json({ mensaje: "Proveedor actualizado correctamente" });
    } catch (error) {
      console.error("Error al actualizar proveedor:", error);
      if (error.code === "ER_DUP_ENTRY") {
        return res
          .status(409)
          .json({ mensaje: "Ya existe un proveedor con ese NIT" });
      }
      res.status(500).json({
        mensaje: "Error al actualizar el proveedor",
        detalle: error.message,
      });
    }
  });

  app.delete("/api/proveedores/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await db.query("DELETE FROM proveedor WHERE codigo_proveedor = ?", [id]);
      res.json({ mensaje: "Proveedor eliminado correctamente" });
    } catch (error) {
      console.error("Error al eliminar proveedor:", error);
      res.status(500).json({
        mensaje:
          "No se puede eliminar el proveedor porque tiene compras asociadas. Puedes cambiar su estado a Inactivo.",
      });
    }
  });

  // ─────────────────────── VENTAS ───────────────────────
};
