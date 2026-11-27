module.exports = function registrarRutas(app) {
  const { bcrypt, db, crypto, rutasSuspension, TIPOS_DOCUMENTO, asegurarTablaSesiones, verificarSesion } = require("./contexto-rutas");

  // Registrar actividad de la sesión
  app.post("/api/sesion/actividad", verificarSesion, (req, res) => {
    res.json({ mensaje: "Actividad registrada correctamente" });
  });

  // Cerrar e invalidar la sesión del usuario
  app.post("/api/logout", async (req, res) => {
    const autorizacion = req.headers.authorization;

    if (!autorizacion || !autorizacion.startsWith("Bearer ")) {
      return res.status(401).json({
        mensaje: "No hay una sesión válida para cerrar",
      });
    }

    const token = autorizacion.split(" ")[1];

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    try {
      await db.query("DELETE FROM sesion_usuario WHERE token_hash = ?", [
        tokenHash,
      ]);

      res.json({ mensaje: "Sesión cerrada correctamente" });
    } catch (error) {
      console.error("Error al cerrar la sesión:", error);

      res.status(500).json({
        mensaje: "Error al cerrar la sesión",
      });
    }
  });

  app.post("/api/login", async (req, res) => {
    const { correo, contrasena } = req.body;

    if (!correo || !contrasena) {
      return res
        .status(400)
        .json({ mensaje: "Por favor ingresa correo y contraseña" });
    }

    try {
      await rutasSuspension.asegurarTabla();
      await asegurarTablaSesiones();

      // 1. Buscar usuario solo por correo (la contraseña está hasheada con bcrypt)
      const [usuarios] = await db.query(
        `SELECT u.id_usuario, u.contrasena, u.estado, u.nombre, u.apellido, u.correo, r.nombre_rol AS rol
         FROM usuario u LEFT JOIN rol r ON u.id_rol = r.id_rol WHERE u.correo = ?`,
        [correo],
      );

      if (usuarios.length === 0) {
        return res.status(401).json({ mensaje: "Credenciales inválidas" });
      }

      const usuario = usuarios[0];

      const [suspensiones] = await db.query(
        `SELECT 1
        FROM panel_suspensiones
        WHERE tipo = 'usuario'
        AND id_registro = ?
        LIMIT 1`,
        [String(usuario.id_usuario)],
      );

      if (suspensiones.length > 0) {
        return res.status(403).json({
          mensaje:
            "Tu cuenta ha sido suspendida. Comunícate con el administrador de la página para recuperar el acceso.",
        });
      }

      // Cuentas sin contraseña (por ejemplo menores de edad) o inactivas no pueden iniciar sesión
      if (!usuario.contrasena) {
        return res.status(401).json({ mensaje: "Credenciales inválidas" });
      }
      if (usuario.estado !== "Activo") {
        return res.status(403).json({
          mensaje: "Tu cuenta está inactiva. Comunícate con la óptica.",
        });
      }

      // 2. Verificar la contraseña con bcrypt.compare()
      const contrasenaValida = await bcrypt.compare(
        contrasena,
        usuario.contrasena,
      );
      if (!contrasenaValida) {
        return res.status(401).json({ mensaje: "Credenciales inválidas" });
      }

      // Generar un token seguro para la sesión
      const token = crypto.randomBytes(32).toString("hex");

      // Crear el hash del token para almacenarlo en la base de datos
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

      // Registrar la sesión con vencimiento de 15 minutos
      await db.query(
        `INSERT INTO sesion_usuario
        (id_usuario, token_hash, fecha_expiracion)
        VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))`,
        [usuario.id_usuario, tokenHash],
      );

      res.json({
        mensaje: "Inicio de sesión exitoso",
        token: token,
        usuario: {
          id: usuario.id_usuario,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          correo: usuario.correo,
          rol: usuario.rol,
        },
      });
    } catch (error) {
      console.error("Error en login:", error);
      res.status(500).json({ error: "Error en el servidor" });
    }
  });

  // Ruta de registro de nuevo usuario (rol Cliente por defecto)
  app.post("/api/registro", async (req, res) => {
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
    } = req.body;

    if (
      !nombre ||
      !apellido ||
      !tipo_documento ||
      !num_documento ||
      !telefono ||
      !correo ||
      !fecha_nacimiento ||
      !contrasena
    ) {
      return res
        .status(400)
        .json({ mensaje: "Todos los campos obligatorios deben estar completos" });
    }

    if (!TIPOS_DOCUMENTO.includes(tipo_documento)) {
      return res.status(400).json({ mensaje: "Tipo de documento no válido" });
    }

    if (contrasena.length < 8) {
      return res
        .status(400)
        .json({ mensaje: "La contraseña debe tener al menos 8 caracteres" });
    }

    const fechaNacimientoPartes =
      typeof fecha_nacimiento === "string"
        ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha_nacimiento)
        : null;
    const fechaNacimientoValidada = fechaNacimientoPartes
      ? new Date(
          Date.UTC(
            Number(fechaNacimientoPartes[1]),
            Number(fechaNacimientoPartes[2]) - 1,
            Number(fechaNacimientoPartes[3]),
          ),
        )
      : null;
    const fechaNacimientoEsValida =
      fechaNacimientoValidada &&
      fechaNacimientoValidada.toISOString().slice(0, 10) === fecha_nacimiento;
    const ahora = new Date();
    const fechaLimiteNacimiento = new Date(
      Date.UTC(ahora.getFullYear() - 10, ahora.getMonth(), ahora.getDate() - 1),
    )
      .toISOString()
      .slice(0, 10);

    if (!fechaNacimientoEsValida || fecha_nacimiento > fechaLimiteNacimiento) {
      return res.status(400).json({
        mensaje: "Debes ser mayor de 10 años para crear una cuenta",
      });
    }

    try {
      // Verificar que no exista otro usuario con ese correo o documento
      const [existentes] = await db.query(
        "SELECT id_usuario FROM usuario WHERE correo = ? OR (tipo_documento = ? AND num_documento = ?)",
        [correo, tipo_documento, num_documento],
      );
      if (existentes.length > 0) {
        return res.status(409).json({
          mensaje: "Ya existe una cuenta con ese correo o número de documento",
        });
      }

      // Obtener id del rol Cliente
      const [roles] = await db.query(
        "SELECT id_rol FROM rol WHERE nombre_rol = 'Cliente'",
      );
      if (roles.length === 0) {
        return res
          .status(500)
          .json({ mensaje: "No se encontró el rol de Cliente en el sistema" });
      }
      const id_rol = roles[0].id_rol;

      const hash = await bcrypt.hash(contrasena, 10);

      await db.query(
        `INSERT INTO usuario (nombre, apellido, tipo_documento, num_documento, telefono, correo, direccion, ciudad, fecha_nacimiento, contrasena, estado, id_rol)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Activo', ?)`,
        [
          nombre,
          apellido,
          tipo_documento,
          num_documento,
          telefono,
          correo,
          direccion || null,
          ciudad || null,
          fecha_nacimiento,
          hash,
          id_rol,
        ],
      );

      res.status(201).json({ mensaje: "Cuenta creada con éxito" });
    } catch (error) {
      console.error("Error en /api/registro:", error);
      res.status(500).json({ mensaje: "Error interno al crear la cuenta" });
    }
  });
};
