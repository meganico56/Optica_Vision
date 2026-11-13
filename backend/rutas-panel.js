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

let tablaFotosPerfil;

async function crearTablaFotosPerfil() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS foto_perfil_usuario (
      id_usuario INT NOT NULL PRIMARY KEY,
      foto_perfil MEDIUMTEXT NOT NULL,
      FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE
    ) DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
  `);
}

async function asegurarTablaFotosPerfil() {
  if (!tablaFotosPerfil) {
    tablaFotosPerfil = crearTablaFotosPerfil();
  }

  try {
    await tablaFotosPerfil;
  } catch (error) {
    tablaFotosPerfil = null;
    throw error;
  }
}

function idValido(valor) {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Perfil del cliente
router.get("/perfil/:id", async (req, res) => {
  const id = idValido(req.params.id);
  if (!id) return res.status(400).json({ mensaje: "Identificador de usuario no válido" });

  try {
    await asegurarTablaFotosPerfil();
    const [filas] = await db.query({
      sql: `SELECT u.id_usuario, u.nombre, u.apellido, u.tipo_documento, u.num_documento, u.telefono,
                   u.correo, u.direccion, u.ciudad, u.fecha_nacimiento, f.foto_perfil
            FROM usuario u
            LEFT JOIN foto_perfil_usuario f ON f.id_usuario = u.id_usuario
            WHERE u.id_usuario = ?`,
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
    const [usuarios] = await db.query(
      "SELECT id_usuario FROM usuario WHERE id_usuario = ?",
      [id],
    );
    if (usuarios.length === 0) return res.status(404).json({ mensaje: "Usuario no encontrado" });

    await db.query(
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
    res.json({ mensaje: "Perfil actualizado correctamente" });
  } catch (error) {
    console.error("Error en PUT /api/perfil/:id:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ mensaje: "Ya existe una cuenta con ese correo" });
    }
    res.status(500).json({ mensaje: "Error al actualizar el perfil" });
  }
});

// Guardar la foto del perfil, optimizada por el cliente como JPEG base64.
router.put("/perfil/:id/foto", async (req, res) => {
  const id = idValido(req.params.id);
  if (!id) return res.status(400).json({ mensaje: "Identificador de usuario no válido" });

  const foto = req.body && req.body.foto_perfil;
  const prefijo = "data:image/jpeg;base64,";
  const maxBytes = 1024 * 1024;
  if (typeof foto !== "string" || !foto.startsWith(prefijo)) {
    return res.status(400).json({ mensaje: "La foto debe ser una imagen JPEG válida" });
  }

  const base64 = foto.slice(prefijo.length);
  if (base64.length > Math.ceil(maxBytes / 3) * 4) {
    return res.status(400).json({ mensaje: "La imagen debe ser un JPEG de máximo 1 MB" });
  }
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64)) {
    return res.status(400).json({ mensaje: "Los datos de la imagen no son válidos" });
  }

  const imagen = Buffer.from(base64, "base64");
  if (
    imagen.length === 0 ||
    imagen.length > maxBytes ||
    imagen.toString("base64") !== base64 ||
    imagen[0] !== 0xff ||
    imagen[1] !== 0xd8 ||
    imagen[2] !== 0xff
  ) {
    return res.status(400).json({ mensaje: "La imagen debe ser un JPEG de máximo 1 MB" });
  }

  try {
    await asegurarTablaFotosPerfil();
    const [usuarios] = await db.query(
      "SELECT id_usuario FROM usuario WHERE id_usuario = ?",
      [id],
    );
    if (usuarios.length === 0) return res.status(404).json({ mensaje: "Usuario no encontrado" });

    await db.query(
      `INSERT INTO foto_perfil_usuario (id_usuario, foto_perfil)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE foto_perfil = VALUES(foto_perfil)`,
      [id, foto],
    );
    res.json({ mensaje: "Imagen de perfil actualizada correctamente" });
  } catch (error) {
    console.error("Error en PUT /api/perfil/:id/foto:", error);
    res.status(500).json({ mensaje: "Error al guardar la imagen de perfil" });
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