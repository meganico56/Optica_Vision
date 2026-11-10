// rutas-panel.js - Rutas del panel del cliente: perfil y estado de pedidos.
// Se conecta en index.js con UNA línea (antes de app.listen):
//     app.use("/api", require("./rutas-panel"));
//
// Por qué rutas nuevas y no las que ya existen:
// - GET /api/usuarios devuelve TODOS los usuarios (es del panel de administrador).
// - PUT /api/usuarios/:id deja cambiar el rol (id_rol), así que un cliente podría volverse administrador.
// Estas rutas solo leen y escriben los campos del perfil.

const express = require("express");
const db = require("./db");

const router = express.Router();

function idValido(valor) {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Perfil del cliente
router.get("/perfil/:id", async (req, res) => {
  const id = idValido(req.params.id);
  if (!id) return res.status(400).json({ mensaje: "Identificador de usuario no válido" });

  try {
    const [filas] = await db.query({
      sql: `SELECT id_usuario, nombre, apellido, tipo_documento, num_documento, telefono,
                   correo, direccion, ciudad, fecha_nacimiento
            FROM usuario WHERE id_usuario = ?`,
      values: [id],
      dateStrings: true,
    });
    if (filas.length === 0) return res.status(404).json({ mensaje: "Usuario no encontrado" });
    res.json(filas[0]);
  } catch (error) {
    console.error("Error en GET /api/perfil/:id:", error);
    res.status(500).json({ mensaje: "Error al consultar el perfil" });
  }
});

// Guardar cambios del perfil (el documento y el rol no se pueden cambiar desde aquí)
router.put("/perfil/:id", async (req, res) => {
  const id = idValido(req.params.id);
  if (!id) return res.status(400).json({ mensaje: "Identificador de usuario no válido" });

  const { nombre, apellido, telefono, correo, direccion, ciudad, fecha_nacimiento } = req.body;

  if (!nombre || !apellido || !telefono || !correo) {
    return res.status(400).json({ mensaje: "Nombre, apellido, teléfono y correo son obligatorios" });
  }

  try {
    const [resultado] = await db.query(
      `UPDATE usuario SET nombre = ?, apellido = ?, telefono = ?, correo = ?,
                          direccion = ?, ciudad = ?, fecha_nacimiento = ?
       WHERE id_usuario = ?`,
      [
        nombre.trim(),
        apellido.trim(),
        telefono.trim(),
        correo.trim(),
        direccion ? direccion.trim() : null,
        ciudad ? ciudad.trim() : null,
        fecha_nacimiento || null,
        id,
      ]
    );
    if (resultado.affectedRows === 0) return res.status(404).json({ mensaje: "Usuario no encontrado" });
    res.json({ mensaje: "Perfil actualizado correctamente" });
  } catch (error) {
    console.error("Error en PUT /api/perfil/:id:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ mensaje: "Ya existe una cuenta con ese correo" });
    }
    res.status(500).json({ mensaje: "Error al actualizar el perfil" });
  }
});

// Estado de los pedidos de lentes del cliente (tabla orden_trabajo)
router.get("/pedidos", async (req, res) => {
  const idCliente = idValido(req.query.id_cliente);
  if (!idCliente) return res.status(400).json({ mensaje: "Falta el id_cliente" });

  try {
    const [filas] = await db.query({
      sql: `SELECT id_orden, id_venta, tipo_lente, estado, fecha_promesa, fecha_entrega
            FROM orden_trabajo
            WHERE id_cliente = ?
            ORDER BY id_orden DESC`,
      values: [idCliente],
      dateStrings: true,
    });
    res.json(filas);
  } catch (error) {
    console.error("Error en GET /api/pedidos:", error);
    res.status(500).json({ mensaje: "Error al consultar los pedidos" });
  }
});

module.exports = router;