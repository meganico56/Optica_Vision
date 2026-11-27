module.exports = function registrarRutas(app) {
  const { db } = require("./contexto-rutas");

  app.get("/api/marcas", async (req, res) => {
    try {
      const [marcas] = await db.query("SELECT * FROM marca ORDER BY nombre ASC");
      res.json(marcas);
    } catch (error) {
      console.error("Error al obtener marcas:", error);
      res.status(500).json({ error: "Error al obtener marcas" });
    }
  });

  app.post("/api/marcas", async (req, res) => {
    const { nombre, pais_origen, estado } = req.body;
    if (!nombre) {
      return res
        .status(400)
        .json({ error: "El nombre de la marca es obligatorio" });
    }
    try {
      const [resultado] = await db.query(
        "INSERT INTO marca (nombre, pais_origen, estado) VALUES (?, ?, ?)",
        [nombre, pais_origen || null, estado || "Activo"],
      );
      res.status(201).json({
        mensaje: "Marca creada con éxito",
        id_marca: resultado.insertId,
      });
    } catch (error) {
      console.error("Error al crear marca:", error);
      if (error.code === "ER_DUP_ENTRY") {
        return res
          .status(409)
          .json({ error: "Ya existe una marca con ese nombre" });
      }
      res
        .status(500)
        .json({ error: "Error al crear la marca", detalle: error.message });
    }
  });

  app.put("/api/marcas/:id", async (req, res) => {
    const { id } = req.params;
    const { nombre, pais_origen, estado } = req.body;
    try {
      await db.query(
        "UPDATE marca SET nombre = COALESCE(?, nombre), pais_origen = COALESCE(?, pais_origen), estado = COALESCE(?, estado) WHERE id_marca = ?",
        [nombre, pais_origen, estado, id],
      );
      res.json({ mensaje: "Marca actualizada con éxito" });
    } catch (error) {
      console.error("Error al actualizar marca:", error);
      res.status(500).json({ error: "Error al actualizar la marca" });
    }
  });

  app.delete("/api/marcas/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await db.query("DELETE FROM marca WHERE id_marca = ?", [id]);
      res.json({ mensaje: "Marca eliminada con éxito" });
    } catch (error) {
      console.error("Error al eliminar marca:", error);
      res.status(500).json({
        error:
          "No se puede eliminar la marca porque tiene productos asociados o ocurrió un error.",
      });
    }
  });

  // Rutas para Categorías
  app.get("/api/categorias", async (req, res) => {
    try {
      const [categorias] = await db.query(
        "SELECT * FROM categoria ORDER BY nombre ASC",
      );
      res.json(categorias);
    } catch (error) {
      console.error("Error al obtener categorías:", error);
      res.status(500).json({ error: "Error al obtener categorías" });
    }
  });

  app.post("/api/categorias", async (req, res) => {
    const { nombre, descripcion, estado } = req.body;
    if (!nombre) {
      return res
        .status(400)
        .json({ error: "El nombre de la categoría es obligatorio" });
    }
    try {
      const [resultado] = await db.query(
        "INSERT INTO categoria (nombre, descripcion, estado) VALUES (?, ?, ?)",
        [nombre, descripcion || null, estado || "Activo"],
      );
      res.status(201).json({
        mensaje: "Categoría creada con éxito",
        id_categoria: resultado.insertId,
      });
    } catch (error) {
      console.error("Error al crear categoría:", error);
      if (error.code === "ER_DUP_ENTRY") {
        return res
          .status(409)
          .json({ error: "Ya existe una categoría con ese nombre" });
      }
      res
        .status(500)
        .json({ error: "Error al crear la categoría", detalle: error.message });
    }
  });

  app.put("/api/categorias/:id", async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, estado } = req.body;
    try {
      await db.query(
        "UPDATE categoria SET nombre = COALESCE(?, nombre), descripcion = COALESCE(?, descripcion), estado = COALESCE(?, estado) WHERE id_categoria = ?",
        [nombre, descripcion, estado, id],
      );
      res.json({ mensaje: "Categoría actualizada con éxito" });
    } catch (error) {
      console.error("Error al actualizar categoría:", error);
      res.status(500).json({ error: "Error al actualizar la categoría" });
    }
  });

  app.delete("/api/categorias/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await db.query("DELETE FROM categoria WHERE id_categoria = ?", [id]);
      res.json({ mensaje: "Categoría eliminada con éxito" });
    } catch (error) {
      console.error("Error al eliminar categoría:", error);
      res.status(500).json({
        error:
          "No se puede eliminar la categoría porque tiene productos asociados o ocurrió un error.",
      });
    }
  });

  // Ruta para obtener un producto por su ID
};
