module.exports = function registrarRutas(app) {
  const { bcrypt, db, CAMPOS_USUARIO } = require("./contexto-rutas");

  app.get("/api/roles", async (req, res) => {
    try {
      const [roles] = await db.query(
        "SELECT id_rol, nombre_rol, descripcion FROM rol ORDER BY id_rol ASC",
      );
      res.json(roles);
    } catch (error) {
      console.error("Error al obtener roles:", error);
      res.status(500).json({ error: "Error al obtener roles" });
    }
  });

  app.get("/api/usuarios", async (req, res) => {
    try {
      const [usuarios] = await db.query({
        sql: `SELECT ${CAMPOS_USUARIO} FROM usuario u LEFT JOIN rol r ON u.id_rol = r.id_rol ORDER BY u.id_usuario DESC`,
        dateStrings: true,
      });
      res.json(usuarios);
    } catch (error) {
      console.error("Error al obtener usuarios:", error);
      res
        .status(500)
        .json({ error: "Error al obtener usuarios", detalle: error.message });
    }
  });

  app.post("/api/usuarios", async (req, res) => {
    const {
      nombre,
      apellido,
      tipo_documento,
      num_documento,
      telefono,
      correo,
      direccion,
      ciudad,
      fecha_nacimiento,
      contrasena,
      estado,
      id_rol,
    } = req.body;

    if (
      !nombre ||
      !apellido ||
      !tipo_documento ||
      !num_documento ||
      !telefono ||
      !id_rol
    ) {
      return res.status(400).json({
        mensaje: "Nombre, apellido, documento, teléfono y rol son obligatorios",
      });
    }
    if (contrasena && contrasena.length < 8) {
      return res
        .status(400)
        .json({ mensaje: "La contraseña debe tener al menos 8 caracteres" });
    }

    try {
      const hash = contrasena ? await bcrypt.hash(contrasena, 10) : null;
      const [resultado] = await db.query(
        `INSERT INTO usuario (nombre, apellido, tipo_documento, num_documento, telefono, correo, direccion, ciudad, fecha_nacimiento, contrasena, estado, id_rol)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          nombre,
          apellido,
          tipo_documento,
          num_documento,
          telefono,
          correo || null,
          direccion || null,
          ciudad || null,
          fecha_nacimiento || null,
          hash,
          estado || "Activo",
          id_rol,
        ],
      );
      res.status(201).json({
        mensaje: "Usuario creado con éxito",
        id_usuario: resultado.insertId,
      });
    } catch (error) {
      console.error("Error al crear usuario:", error);
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          mensaje: "Ya existe un usuario con ese correo o número de documento",
        });
      }
      res
        .status(500)
        .json({ mensaje: "Error al crear el usuario", detalle: error.message });
    }
  });

  app.put("/api/usuarios/:id", async (req, res) => {
    const { id } = req.params;
    const {
      nombre,
      apellido,
      tipo_documento,
      num_documento,
      telefono,
      correo,
      direccion,
      ciudad,
      fecha_nacimiento,
      contrasena,
      estado,
      id_rol,
    } = req.body;

    if (contrasena && contrasena.length < 8) {
      return res
        .status(400)
        .json({ mensaje: "La contraseña debe tener al menos 8 caracteres" });
    }

    try {
      const hash = contrasena ? await bcrypt.hash(contrasena, 10) : null;
      const [resultado] = await db.query(
        `UPDATE usuario SET
           nombre = COALESCE(?, nombre),
           apellido = COALESCE(?, apellido),
           tipo_documento = COALESCE(?, tipo_documento),
           num_documento = COALESCE(?, num_documento),
           telefono = COALESCE(?, telefono),
           correo = COALESCE(?, correo),
           direccion = COALESCE(?, direccion),
           ciudad = COALESCE(?, ciudad),
           fecha_nacimiento = COALESCE(?, fecha_nacimiento),
           contrasena = COALESCE(?, contrasena),
           estado = COALESCE(?, estado),
           id_rol = COALESCE(?, id_rol)
         WHERE id_usuario = ?`,
        [
          nombre,
          apellido,
          tipo_documento,
          num_documento,
          telefono,
          correo || null,
          direccion || null,
          ciudad || null,
          fecha_nacimiento || null,
          hash,
          estado,
          id_rol,
          id,
        ],
      );
      if (resultado.affectedRows === 0) {
        return res.status(404).json({ mensaje: "Usuario no encontrado" });
      }
      res.json({ mensaje: "Usuario actualizado correctamente" });
    } catch (error) {
      console.error("Error al actualizar usuario:", error);
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          mensaje: "Ya existe un usuario con ese correo o número de documento",
        });
      }
      res.status(500).json({
        mensaje: "Error al actualizar el usuario",
        detalle: error.message,
      });
    }
  });

  app.delete("/api/usuarios/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await db.query("DELETE FROM usuario WHERE id_usuario = ?", [id]);
      res.json({ mensaje: "Usuario eliminado correctamente" });
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      res.status(500).json({
        mensaje:
          "No se puede eliminar el usuario porque tiene registros asociados (ventas, citas, etc.). Puedes marcarlo como Inactivo.",
      });
    }
  });
};
