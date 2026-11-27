const bcrypt = require("bcrypt");
const db = require("./db");
const { fechaEstaBloqueada, router: rutasCalendario } = require("./rutas-calendario");
const crypto = require("crypto");
const rutasSuspension = require("./rutas-suspension");
const fs = require("fs");
const path = require("path");

const DIRECTORIO_IMAGENES_PRODUCTOS = path.join(
  __dirname,
  "..",
  "frontend",
  "imagenes",
  "productos",
);
const DIRECTORIO_MODELOS_3D = path.join(
  __dirname,
  "..",
  "frontend",
  "modelos_gafas",
);
const MAX_MODELO_3D_BYTES = 10 * 1024 * 1024;
const IMAGEN_PRODUCTO_PREDETERMINADA = "gafas-modelo1.png";
const IMAGENES_VECTOR_CATALOGO = new Set([
  "montura-infantil-azul.svg",
  "montura-infantil-rosa.svg",
  "montura-infantil-verde.svg",
  "estuche-gafas.svg",
  "cordon-gafas.svg",
  "kit-limpieza-gafas.svg",
  "pano-microfibra.svg",
]);

const ESTADOS_CITA = [
  "Programada",
  "Confirmada",
  "Completada",
  "Cancelada",
  "No asistio",
];
const ESTADOS_VENTA = ["Pendiente", "Pagada", "Anulada"];
const CANALES_VENTA = ["Mostrador", "Web"];
const MOTIVOS_DEVOLUCION = [
  "Producto defectuoso",
  "Cambio de formula",
  "Ajuste o talla incorrecta",
  "Cliente se arrepintio",
  "Otro",
];
const DESTINOS_DEVOLUCION = [
  "Vuelve a inventario",
  "Descarte",
  "Devuelto a proveedor",
];
const TIPOS_DOCUMENTO = ["C.C.", "T.I.", "R.C.", "C.E.", "PAS"];

function imagenProductoDisponible(nombreArchivo) {
  if (
    typeof nombreArchivo !== "string" ||
    path.basename(nombreArchivo) !== nombreArchivo ||
    !/\.(png|jpe?g|webp|gif|svg)$/i.test(nombreArchivo) ||
    (path.extname(nombreArchivo).toLowerCase() === ".svg" &&
      !IMAGENES_VECTOR_CATALOGO.has(nombreArchivo))
  ) {
    return false;
  }
  return fs.existsSync(path.join(DIRECTORIO_IMAGENES_PRODUCTOS, nombreArchivo));
}

function resolverImagenProducto(nombreArchivo) {
  return imagenProductoDisponible(nombreArchivo)
    ? nombreArchivo
    : IMAGEN_PRODUCTO_PREDETERMINADA;
}

function modelo3dDisponible(nombreArchivo) {
  return (
    typeof nombreArchivo === "string" &&
    path.basename(nombreArchivo) === nombreArchivo &&
    /\.glb$/i.test(nombreArchivo) &&
    fs.existsSync(path.join(DIRECTORIO_MODELOS_3D, nombreArchivo))
  );
}

function resolverModelo3d(nombreArchivo) {
  return modelo3dDisponible(nombreArchivo) ? nombreArchivo : null;
}

// Error con código HTTP para responder mensajes claros desde dentro de una transacción
function errorHttp(status, mensaje) {
  const e = new Error(mensaje);
  e.status = status;
  return e;
}

// Responde según el tipo de error (los de errorHttp llevan su propio código)
function responderError(res, e) {
  if (e.status)
    return res.status(e.status).json({ mensaje: e.message, error: e.message });
  if (e.code === "ER_NO_REFERENCED_ROW_2") {
    return res.status(400).json({
      mensaje:
        "Algún dato relacionado (cliente, receta, promoción o producto) no existe",
      error: e.message,
    });
  }
  console.error(e);
  res.status(500).json({ error: e.message });
}

const HORARIOS_ATENCION_PREDETERMINADOS = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
];

let horariosAtencionPromise;
async function asegurarTablaHorariosAtencion() {
  if (!horariosAtencionPromise) {
    horariosAtencionPromise = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS horarios_atencion (
          id TINYINT NOT NULL PRIMARY KEY,
          horarios TEXT NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      await db.query(
        `INSERT INTO horarios_atencion (id, horarios) VALUES (1, ?)
         ON DUPLICATE KEY UPDATE id = id`,
        [JSON.stringify(HORARIOS_ATENCION_PREDETERMINADOS)],
      );
    })().catch((error) => {
      horariosAtencionPromise = null;
      throw error;
    });
  }
  await horariosAtencionPromise;
}

async function obtenerHorariosAtencion() {
  await asegurarTablaHorariosAtencion();
  const [filas] = await db.query(
    "SELECT horarios FROM horarios_atencion WHERE id = 1",
  );
  const horarios = JSON.parse(filas[0].horarios);
  if (!Array.isArray(horarios)) {
    throw new Error("La configuración de horarios de atención no es válida.");
  }
  return horarios;
}

function fechaISOValida(fecha) {
  if (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return false;
  }
  const [year, month, day] = fecha.split("-").map(Number);
  const fechaValidada = new Date(year, month - 1, day);
  return (
    fechaValidada.getFullYear() === year &&
    fechaValidada.getMonth() === month - 1 &&
    fechaValidada.getDate() === day
  );
}

async function obtenerHorariosDisponibles(fecha) {
  const configurados = await obtenerHorariosAtencion();
  const [citas] = await db.query(
    `SELECT TIME_FORMAT(fecha_hora, '%H:%i') AS hora, duracion_minutos
     FROM cita
     WHERE fecha_hora >= ? AND fecha_hora < DATE_ADD(?, INTERVAL 1 DAY)
       AND estado NOT IN ('Cancelada', 'No asistio', 'Completada')`,
    [`${fecha} 00:00:00`, `${fecha} 00:00:00`],
  );
  const minutosOcupados = citas.map((cita) => {
    const [hora, minuto] = cita.hora.split(":").map(Number);
    return {
      inicio: hora * 60 + minuto,
      fin: hora * 60 + minuto + Number(cita.duracion_minutos || 30),
    };
  });

  return configurados.filter((hora) => {
    const [horas, minutos] = hora.split(":").map(Number);
    const inicio = horas * 60 + minutos;
    const fin = inicio + 30;
    return !minutosOcupados.some(
      (cita) => inicio < cita.fin && fin > cita.inicio,
    );
  });
}

async function conHorarioReservado(fechaHora, operacion, excluirCitaId) {
  const partesFechaHora =
    typeof fechaHora === "string"
      ? /^(\d{4}-\d{2}-\d{2})[ T]((?:[01]\d|2[0-3]):[0-5]\d)(?::([0-5]\d))?$/.exec(
          fechaHora,
        )
      : null;
  if (!partesFechaHora || !fechaISOValida(partesFechaHora[1])) {
    throw errorHttp(400, "La fecha y hora de la cita no son válidas.");
  }
  const fecha = partesFechaHora[1];
  const fechaHoraNormalizada = `${fecha} ${partesFechaHora[2]}:${partesFechaHora[3] || "00"}`;
  const nombreBloqueo = `cita-dia:${crypto.createHash("sha256").update(fecha).digest("hex").slice(0, 48)}`;
  const conexion = await db.getConnection();
  let bloqueoAdquirido = false;
  try {
    const [filasBloqueo] = await conexion.query(
      "SELECT GET_LOCK(?, 10) AS adquirido",
      [nombreBloqueo],
    );
    if (Number(filasBloqueo[0].adquirido) !== 1) {
      throw errorHttp(
        503,
        "No se pudo confirmar el horario. Inténtalo nuevamente.",
      );
    }
    bloqueoAdquirido = true;

    const [citas] = await conexion.query(
      `SELECT id_cita FROM cita
       WHERE estado NOT IN ('Cancelada', 'No asistio', 'Completada')
         AND fecha_hora < DATE_ADD(?, INTERVAL 30 MINUTE)
         AND DATE_ADD(fecha_hora, INTERVAL duracion_minutos MINUTE) > ?
         AND id_cita <> COALESCE(?, 0)
       LIMIT 1`,
      [fechaHoraNormalizada, fechaHoraNormalizada, excluirCitaId || null],
    );
    if (citas.length > 0) {
      throw errorHttp(
        409,
        "Ese horario acaba de ser reservado. Selecciona otro horario disponible.",
      );
    }
    return await operacion(conexion, fechaHoraNormalizada);
  } finally {
    try {
      if (bloqueoAdquirido) {
        await conexion.query("SELECT RELEASE_LOCK(?)", [nombreBloqueo]);
      }
    } finally {
      conexion.release();
    }
  }
}

// Mueve el inventario de una venta y deja la huella en movimiento_inventario.
// signo = -1 descuenta (venta pagada); signo = 1 repone (venta anulada)
async function moverStockVenta(
  conn,
  codigoVenta,
  signo,
  tipoMovimiento,
  idUsuario,
) {
  const [detalles] = await conn.query(
    `SELECT dv.id_producto, dv.cantidad, p.nombre, p.maneja_inventario
     FROM detalle_venta dv
     JOIN producto p ON p.id_producto = dv.id_producto
     WHERE dv.codigo_venta = ?`,
    [codigoVenta],
  );
  for (const d of detalles) {
    if (!d.maneja_inventario) continue;
    const delta = signo * d.cantidad;
    const [r] = await conn.query(
      "UPDATE producto SET existencia_actual = existencia_actual + ? WHERE id_producto = ? AND existencia_actual + ? >= 0",
      [delta, d.id_producto, delta],
    );
    if (r.affectedRows === 0) {
      throw errorHttp(409, `No hay existencias suficientes de "${d.nombre}"`);
    }
    await conn.query(
      `INSERT INTO movimiento_inventario (tipo, cantidad, observaciones, id_producto, id_usuario, codigo_venta)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        tipoMovimiento,
        delta,
        `Venta #${codigoVenta}`,
        d.id_producto,
        idUsuario || null,
        codigoVenta,
      ],
    );
  }
}

const TIEMPO_INACTIVIDAD = 15 * 60 * 1000;

let ultimaActividadServidor = 0;

let tablaSesionesPromise;
async function asegurarTablaSesiones() {
  if (!tablaSesionesPromise) {
    tablaSesionesPromise = db
      .query(
        `CREATE TABLE IF NOT EXISTS sesion_usuario(
      id_sesion INT AUTO_INCREMENT PRIMARY KEY,
      id_usuario INT NOT NULL,
      token_hash CHAR(64) NOT NULL UNIQUE,
      fecha_inicio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ultima_actividad TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      fecha_expiracion TIMESTAMP NOT NULL,
      INDEX idx_sesion_usuario (id_usuario),
      INDEX idx_sesion_expiracion (fecha_expiracion)
      ) ENGINE= InnoDB DEFAULT CHARSET=utf8mb4`,
      )
      .catch((error) => {
        tablaSesionesPromise = null;
        throw error;
      });
  }
  await tablaSesionesPromise;
}

// Middleware para verificar y renovar la sesión
async function verificarSesion(req, res, next) {
  const autorizacion = req.headers.authorization;

  if (!autorizacion || !autorizacion.startsWith("Bearer ")) {
    return res.status(401).json({
      mensaje: "Debes iniciar sesión",
    });
  }

  const token = autorizacion.split(" ")[1];

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  try {
    await asegurarTablaSesiones();
    const [sesiones] = await db.query(
      `SELECT s.id_sesion, s.id_usuario, u.estado, r.nombre_rol AS rol
       FROM sesion_usuario s
       INNER JOIN usuario u ON s.id_usuario = u.id_usuario
       LEFT JOIN rol r ON u.id_rol = r.id_rol
       WHERE s.token_hash = ?
       AND s.fecha_expiracion > NOW()
       LIMIT 1`,
      [tokenHash],
    );

    if (sesiones.length === 0) {
      return res.status(401).json({
        mensaje: "Tu sesión ha expirado. Inicia sesión nuevamente.",
      });
    }

    const sesion = sesiones[0];

    if (sesion.estado !== "Activo") {
      await db.query("DELETE FROM sesion_usuario WHERE id_sesion = ?", [
        sesion.id_sesion,
      ]);

      return res.status(403).json({
        mensaje: "Tu cuenta está inactiva.",
      });
    }

    // Renovar los 15 minutos de actividad
    await db.query(
      `UPDATE sesion_usuario
       SET ultima_actividad = NOW(),
           fecha_expiracion = DATE_ADD(NOW(), INTERVAL 15 MINUTE)
       WHERE id_sesion = ?`,
      [sesion.id_sesion],
    );

    req.usuario = {
      id_usuario: sesion.id_usuario,
      rol: sesion.rol,
    };

    next();
  } catch (error) {
    console.error("Error al verificar la sesión:", error);

    return res.status(500).json({
      mensaje: "Error al verificar la sesión",
    });
  }
}

function verificarAdministrador(req, res, next) {
  verificarSesion(req, res, () => {
    if (req.usuario.rol !== "Administrador") {
      return res
        .status(403)
        .json({
          mensaje:
            "Solo un administrador puede modificar los horarios de atención.",
        });
    }
    next();
  });
}

const CAMPOS_USUARIO = `u.id_usuario, u.nombre, u.apellido, u.tipo_documento, u.num_documento, u.telefono,
  u.correo, u.direccion, u.ciudad, u.fecha_nacimiento, u.estado, u.id_rol, r.nombre_rol AS rol`;

module.exports = { bcrypt, db, fechaEstaBloqueada, rutasCalendario, crypto, rutasSuspension, fs, path, DIRECTORIO_IMAGENES_PRODUCTOS, DIRECTORIO_MODELOS_3D, MAX_MODELO_3D_BYTES, IMAGEN_PRODUCTO_PREDETERMINADA, IMAGENES_VECTOR_CATALOGO, ESTADOS_CITA, ESTADOS_VENTA, CANALES_VENTA, MOTIVOS_DEVOLUCION, DESTINOS_DEVOLUCION, TIPOS_DOCUMENTO, imagenProductoDisponible, resolverImagenProducto, modelo3dDisponible, resolverModelo3d, errorHttp, responderError, HORARIOS_ATENCION_PREDETERMINADOS, asegurarTablaHorariosAtencion, obtenerHorariosAtencion, fechaISOValida, obtenerHorariosDisponibles, conHorarioReservado, moverStockVenta, TIEMPO_INACTIVIDAD, ultimaActividadServidor, asegurarTablaSesiones, verificarSesion, verificarAdministrador, CAMPOS_USUARIO };
