module.exports = function registrarRutas(app) {
  const { db, fechaEstaBloqueada, ESTADOS_CITA, asegurarTablaHorariosAtencion, obtenerHorariosAtencion, fechaISOValida, obtenerHorariosDisponibles, conHorarioReservado, verificarSesion, verificarAdministrador } = require("./contexto-rutas");

  app.post("/api/citas", verificarSesion, async (req, res) => {
    const clienteId = req.usuario.id_usuario;
    const { fecha_cita, hora_cita } = req.body;
    const motivo =
      typeof req.body.motivo === "string" ? req.body.motivo.trim() : "";
    const observaciones =
      typeof req.body.observaciones === "string"
        ? req.body.observaciones.trim()
        : "";

    let fechaHora =
      typeof req.body.fecha_hora === "string" ? req.body.fecha_hora.trim() : "";
    if (
      !fechaHora &&
      typeof fecha_cita === "string" &&
      typeof hora_cita === "string"
    ) {
      fechaHora = `${fecha_cita.trim()} ${hora_cita.trim()}`;
    }

    const fechaHoraParts =
      /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::(\d{2}))?$/.exec(fechaHora);
    if (!fechaHoraParts) {
      return res
        .status(400)
        .json({ error: "La fecha y la hora de la cita no son válidas" });
    }

    fechaHora = `${fechaHoraParts[1]} ${fechaHoraParts[2]}:${fechaHoraParts[3] || "00"}`;
    const [year, month, day] = fechaHoraParts[1].split("-").map(Number);
    const [hour, minute, second] = fechaHoraParts[2].split(":").map(Number);
    const fechaValidada = new Date(
      year,
      month - 1,
      day,
      hour,
      minute,
      Number(fechaHoraParts[3] || 0),
    );
    if (
      fechaValidada.getFullYear() !== year ||
      fechaValidada.getMonth() !== month - 1 ||
      fechaValidada.getDate() !== day ||
      fechaValidada.getHours() !== hour ||
      fechaValidada.getMinutes() !== minute ||
      fechaValidada.getSeconds() !== Number(fechaHoraParts[3] || 0)
    ) {
      return res
        .status(400)
        .json({ error: "La fecha y la hora de la cita no son válidas" });
    }
    if (fechaValidada.getDay() === 0) {
      return res
        .status(400)
        .json({ error: "Los domingos la óptica permanece cerrada" });
    }

    if (!motivo || motivo.length > 150) {
      return res
        .status(400)
        .json({
          error:
            "El motivo de la cita es obligatorio y no debe superar 150 caracteres",
        });
    }
    if (observaciones.length > 255) {
      return res
        .status(400)
        .json({ error: "Las observaciones no deben superar 255 caracteres" });
    }

    const ahora = new Date();
    const pad = (valor) => String(valor).padStart(2, "0");
    const fechaActual = `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}`;
    const fechaMaxima = new Date();
    fechaMaxima.setMonth(fechaMaxima.getMonth() + 3);
    const fechaMaximaTexto = `${fechaMaxima.getFullYear()}-${pad(fechaMaxima.getMonth() + 1)}-${pad(fechaMaxima.getDate())}`;
    if (fechaHoraParts[1] < fechaActual || fechaHoraParts[1] > fechaMaximaTexto) {
      return res
        .status(400)
        .json({
          error:
            "Solo puedes agendar citas desde hoy y hasta tres meses adelante",
        });
    }

    try {
      const bloqueo = await fechaEstaBloqueada(fechaHora);
      if (bloqueo) {
        return res
          .status(400)
          .json({
            error: `La fecha seleccionada no está disponible para citas: ${bloqueo.motivo}`,
          });
      }

      const horarios = await obtenerHorariosAtencion();
      if (!horarios.includes(fechaHoraParts[2])) {
        return res.status(400).json({
          error:
            "El horario seleccionado ya no está disponible. Selecciona otro horario.",
        });
      }

      const resultado = await conHorarioReservado(fechaHora, (conexion) =>
        conexion.query(
          `INSERT INTO cita (fecha_hora, duracion_minutos, motivo, canal, estado, observaciones, id_cliente)
           VALUES (?, 30, ?, 'Web', 'Programada', ?, ?)`,
          [fechaHora, motivo, observaciones || null, clienteId],
        ),
      );

      res.status(201).json({
        mensaje: "Cita agendada con éxito",
        id_cita: resultado[0].insertId,
      });
    } catch (error) {
      console.error("Error al agendar cita:", error);
      if (error.status) {
        return res
          .status(error.status)
          .json({ error: error.message, mensaje: error.message });
      }
      if (error.code === "ER_NO_REFERENCED_ROW_2") {
        return res.status(400).json({ error: "El cliente indicado no existe" });
      }
      res.status(500).json({ error: "Error al registrar la cita" });
    }
  });

  app.get("/api/horarios/disponibles", async (req, res) => {
    const { fecha } = req.query;
    if (!fechaISOValida(fecha)) {
      return res
        .status(400)
        .json({ error: "Debe especificar una fecha válida (YYYY-MM-DD)" });
    }
    try {
      if (
        new Date(`${fecha}T00:00:00`).getDay() === 0 ||
        (await fechaEstaBloqueada(fecha))
      ) {
        return res.json({ horarios: [] });
      }
      res.json({ horarios: await obtenerHorariosDisponibles(fecha) });
    } catch (error) {
      console.error("Error al consultar horarios disponibles:", error);
      res
        .status(500)
        .json({ error: "Error al consultar los horarios disponibles" });
    }
  });

  app.get("/api/horarios/atencion", verificarAdministrador, async (req, res) => {
    try {
      res.json({ horarios: await obtenerHorariosAtencion() });
    } catch (error) {
      console.error("Error al obtener horarios de atención:", error);
      res
        .status(500)
        .json({ error: "Error al obtener los horarios de atención" });
    }
  });

  app.put("/api/horarios/atencion", verificarAdministrador, async (req, res) => {
    const horarios = req.body && req.body.horarios;
    const formatoHora = /^(?:[01]\d|2[0-3]):(?:00|30)$/;
    if (
      !Array.isArray(horarios) ||
      horarios.length > 48 ||
      horarios.some(
        (hora) => typeof hora !== "string" || !formatoHora.test(hora),
      ) ||
      new Set(horarios).size !== horarios.length
    ) {
      return res.status(400).json({
        error:
          "Los horarios deben ser válidos, únicos y estar en intervalos de 30 minutos.",
      });
    }

    const horariosOrdenados = [...horarios].sort();
    try {
      await asegurarTablaHorariosAtencion();
      await db.query("UPDATE horarios_atencion SET horarios = ? WHERE id = 1", [
        JSON.stringify(horariosOrdenados),
      ]);
      res.json({
        mensaje: "Horarios de atención actualizados",
        horarios: horariosOrdenados,
      });
    } catch (error) {
      console.error("Error al guardar horarios de atención:", error);
      res
        .status(500)
        .json({ error: "Error al guardar los horarios de atención" });
    }
  });

  app.get("/api/citas", async (req, res) => {
    const { id_cliente } = req.query;
    try {
      let sql = `SELECT c.id_cita, c.fecha_hora, c.motivo, c.estado, c.observaciones, c.canal,
                 CONCAT(cl.nombre,' ',cl.apellido) AS cliente,
                 CONCAT(at.nombre,' ',at.apellido) AS atiende,
                 c.id_cliente, c.id_usuario_atiende
              FROM cita c
              LEFT JOIN usuario cl ON c.id_cliente = cl.id_usuario
              LEFT JOIN usuario at ON c.id_usuario_atiende = at.id_usuario`;
      const params = [];
      if (id_cliente) {
        sql += ` WHERE c.id_cliente = ?`;
        params.push(id_cliente);
      }
      sql += ` ORDER BY c.fecha_hora DESC`;
      const [rows] = await db.query({ sql, values: params, dateStrings: true });
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/citas-admin", async (req, res) => {
    const {
      id_cliente,
      fecha_hora,
      motivo,
      id_usuario_atiende,
      estado,
      observaciones,
      duracion_minutos,
    } = req.body;
    if (!id_cliente || !fecha_hora || !motivo) {
      return res
        .status(400)
        .json({ mensaje: "Cliente, fecha/hora y motivo son obligatorios" });
    }
    try {
      const bloqueo = await fechaEstaBloqueada(fecha_hora);
      if (bloqueo) {
        return res.status(400).json({
          mensaje: `La fecha seleccionada está bloqueada en el calendario: "${bloqueo.motivo}"`,
        });
      }
      if (estado && !ESTADOS_CITA.includes(estado)) {
        return res.status(400).json({ mensaje: "Estado de cita no válido" });
      }
      const atiende = id_usuario_atiende || id_cliente;
      const crearCita = (conexion, fechaHoraNormalizada = fecha_hora) =>
        conexion.query(
          `INSERT INTO cita (fecha_hora, duracion_minutos, motivo, estado, observaciones, id_cliente, id_usuario_atiende)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            fechaHoraNormalizada,
            duracion_minutos || 30,
            motivo,
            estado || "Programada",
            observaciones || null,
            id_cliente,
            atiende,
          ],
        );
      const [r] = ["Cancelada", "No asistio", "Completada"].includes(estado)
        ? await crearCita(db)
        : await conHorarioReservado(fecha_hora, crearCita);
      res
        .status(201)
        .json({ mensaje: "Cita programada con éxito", id_cita: r.insertId });
    } catch (e) {
      if (e.status) {
        return res
          .status(e.status)
          .json({ mensaje: e.message, error: e.message });
      }
      if (e.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          mensaje: "El cliente ya tiene una cita asignada en ese horario exacto",
        });
      }
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/citas/:id", async (req, res) => {
    const { id } = req.params;
    const { estado, observaciones, fecha_hora, motivo } = req.body;
    if (estado && !ESTADOS_CITA.includes(estado)) {
      return res.status(400).json({ mensaje: "Estado de cita no válido" });
    }
    try {
      const [citasActuales] = await db.query(
        `SELECT DATE_FORMAT(fecha_hora, '%Y-%m-%d %H:%i:%s') AS fecha_hora, estado
         FROM cita WHERE id_cita = ?`,
        [id],
      );
      if (citasActuales.length === 0) {
        return res.status(404).json({ mensaje: "Cita no encontrada" });
      }
      const fechaHoraFinal = fecha_hora || citasActuales[0].fecha_hora;
      const estadoFinal = estado || citasActuales[0].estado;
      const citaActiva = !["Cancelada", "No asistio", "Completada"].includes(
        estadoFinal,
      );
      if (citaActiva) {
        const bloqueo = await fechaEstaBloqueada(fechaHoraFinal);
        if (bloqueo) {
          return res.status(400).json({
            mensaje: `No se puede programar la cita en esa fecha porque está bloqueada: "${bloqueo.motivo}"`,
          });
        }
      }
      const actualizarCita = (conexion, fechaHoraNormalizada = fecha_hora) =>
        conexion.query(
          "UPDATE cita SET estado=COALESCE(?,estado), observaciones=COALESCE(?,observaciones), fecha_hora=COALESCE(?,fecha_hora), motivo=COALESCE(?,motivo) WHERE id_cita=?",
          [
            estado,
            observaciones,
            fecha_hora ? fechaHoraNormalizada : null,
            motivo,
            id,
          ],
        );
      if (citaActiva) {
        await conHorarioReservado(fechaHoraFinal, actualizarCita, id);
      } else {
        await actualizarCita(db);
      }
      res.json({ mensaje: "Cita actualizada" });
    } catch (e) {
      if (e.status) {
        return res
          .status(e.status)
          .json({ mensaje: e.message, error: e.message });
      }
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/citas/:id", async (req, res) => {
    try {
      await db.query("DELETE FROM cita WHERE id_cita=?", [req.params.id]);
      res.json({ mensaje: "Cita eliminada" });
    } catch (e) {
      res.status(500).json({ mensaje: "No se puede eliminar la cita." });
    }
  });
};
