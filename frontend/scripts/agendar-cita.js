// agendar-cita.js - Lógica para agendamiento de citas del cliente con validación de calendario bloqueado
(() => {
  const formCita = document.getElementById("formCita");
  const fechaInput = document.getElementById("fecha");
  const horaSelect = document.getElementById("hora");
  const motivoSelect = document.getElementById("motivo");
  const obsInput = document.getElementById("observaciones");
  const errorBox = document.getElementById("mensajeError");
  const avisoLogin = document.getElementById("avisoLogin");
  const confirmacionCita = document.getElementById("confirmacionCita");
  const resumenCita = document.getElementById("resumenCita");
  const btnAgendar = document.getElementById("btnAgendar");

  let bloqueosCalendario = [];
  let bloqueosCargados = false;
  let fechaMaxima = "";

  const HORARIOS_DISPONIBLES = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"
  ];

  function mostrarError(msg) {
    if (errorBox) {
      errorBox.textContent = msg;
      errorBox.hidden = false;
    }
  }

  function ocultarError() {
    if (errorBox) {
      errorBox.textContent = "";
      errorBox.hidden = true;
    }
  }

  function fechaLocalISO(fecha = new Date()) {
    const pad = (valor) => String(valor).padStart(2, "0");
    return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`;
  }

  function obtenerUsuarioActual() {
    if (window.Sesion && typeof window.Sesion.estaLogueado === "function") {
      return window.Sesion.estaLogueado() ? window.Sesion.usuario() : null;
    }

    const usuarioGuardado =
      localStorage.getItem("usuarioLogueado") ||
      localStorage.getItem("bv_usuario") ||
      sessionStorage.getItem("bv_usuario");
    if (!usuarioGuardado) return null;

    try {
      const usuario = JSON.parse(usuarioGuardado);
      return usuario && typeof usuario === "object" ? usuario : null;
    } catch {
      return null;
    }
  }

  async function cargarBloqueos() {
    const bloqueos = await Api.get("/api/calendario/bloqueos");
    if (!Array.isArray(bloqueos)) {
      throw new Error("La respuesta de bloqueos del calendario no es válida.");
    }
    bloqueosCalendario = bloqueos;
    bloqueosCargados = true;
  }

  function fechaBloqueada(fechaStr) {
    return bloqueosCalendario.find(b => {
      return fechaStr >= b.fecha_inicio && fechaStr <= b.fecha_fin;
    });
  }

  function poblarHoras() {
    if (!horaSelect) return;
    horaSelect.innerHTML = '<option value="" disabled selected>Selecciona una hora</option>';
    HORARIOS_DISPONIBLES.forEach(h => {
      const opt = document.createElement("option");
      opt.value = h;
      opt.textContent = `${h} hrs`;
      horaSelect.appendChild(opt);
    });
    horaSelect.disabled = false;
  }

  function validarFechaSeleccionada(seleccion) {
    if (!horaSelect) return;
    ocultarError();
    if (!seleccion) {
      horaSelect.disabled = true;
      horaSelect.innerHTML = '<option value="" selected>Elige primero una fecha</option>';
      return;
    }

    const hoyStr = fechaLocalISO();
    if (seleccion < hoyStr) {
      mostrarError("No puedes seleccionar una fecha anterior al día de hoy.");
      horaSelect.disabled = true;
      horaSelect.innerHTML = '<option value="" selected>Fecha no disponible</option>';
      return;
    }
    if (seleccion > fechaMaxima) {
      mostrarError("Solo puedes agendar citas hasta tres meses adelante.");
      horaSelect.disabled = true;
      horaSelect.innerHTML = '<option value="" selected>Fecha fuera del rango</option>';
      return;
    }

    const diaSemana = new Date(`${seleccion}T00:00:00`).getDay();
    if (diaSemana === 0) {
      mostrarError("Los domingos la óptica permanece cerrada. Por favor elige otro día de lunes a sábado.");
      horaSelect.disabled = true;
      horaSelect.innerHTML = '<option value="" selected>Día no laboral</option>';
      return;
    }

    const bloqueo = fechaBloqueada(seleccion);
    if (bloqueo) {
      mostrarError(`Esta fecha no está disponible para citas: "${bloqueo.motivo || "Día no laboral"}". Por favor selecciona otra fecha.`);
      horaSelect.disabled = true;
      horaSelect.innerHTML = '<option value="" selected>Fecha no disponible</option>';
      return;
    }

    poblarHoras();
  }

  function inicializarCalendarioCliente() {
    const calendarioContenedor = document.getElementById("calendarioCitaCliente");
    if (!calendarioContenedor || !window.CalendarioPersonalizado) {
      return;
    }

    new window.CalendarioPersonalizado({
      contenedor: calendarioContenedor,
      modo: "cliente",
      bloqueos: bloqueosCalendario,
      maxFecha: fechaMaxima,
      alSeleccionarFecha: (fecha) => {
        if (fechaInput) fechaInput.value = fecha;
        const aviso = document.getElementById("fechaSeleccionadaAviso");
        const texto = document.getElementById("fechaSeleccionadaTexto");
        if (aviso && texto) {
          texto.textContent = new Date(`${fecha}T00:00:00`).toLocaleDateString("es-CO", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          });
          aviso.hidden = false;
        }
        validarFechaSeleccionada(fecha);
      },
    });
  }

  function inicializar() {
    const usuario = obtenerUsuarioActual();
    if (!usuario) {
      if (avisoLogin) avisoLogin.hidden = false;
      if (btnAgendar) {
        btnAgendar.disabled = true;
        btnAgendar.title = "Debes iniciar sesión para agendar una cita";
      }
    } else {
      if (avisoLogin) avisoLogin.hidden = true;
    }

    // Configurar fecha mínima (hoy) y máxima (3 meses adelante)
    const hoyStr = fechaLocalISO();
    const maxFechaDate = new Date();
    maxFechaDate.setMonth(maxFechaDate.getMonth() + 3);
    fechaMaxima = fechaLocalISO(maxFechaDate);

    if (fechaInput) {
      fechaInput.min = hoyStr;
      fechaInput.max = fechaMaxima;

      fechaInput.addEventListener("change", () => validarFechaSeleccionada(fechaInput.value));
    }

    if (formCita) {
      formCita.addEventListener("submit", async (e) => {
        e.preventDefault();
        ocultarError();

        const usuarioActivo = obtenerUsuarioActual();
        if (!usuarioActivo) {
          mostrarError("Debes iniciar sesión o registrarte antes de agendar tu cita.");
          if (avisoLogin) avisoLogin.hidden = false;
          return;
        }

        const fecha = fechaInput.value;
        const hora = horaSelect.value;
        const motivo = motivoSelect.value;
        const observaciones = obsInput ? obsInput.value.trim() : "";

        if (!bloqueosCargados) {
          mostrarError("No se pudo verificar la disponibilidad. Recarga la página e inténtalo de nuevo.");
          return;
        }

        if (!fecha || !hora || !motivo) {
          mostrarError("Por favor selecciona la fecha, la hora y el motivo de tu cita.");
          return;
        }

        if (fecha < fechaLocalISO() || fecha > fechaMaxima) {
          mostrarError("La fecha seleccionada está fuera del rango permitido.");
          return;
        }
        if (new Date(`${fecha}T00:00:00`).getDay() === 0) {
          mostrarError("Los domingos la óptica permanece cerrada. Por favor elige otro día.");
          return;
        }

        const bloqueo = fechaBloqueada(fecha);
        if (bloqueo) {
          mostrarError(`La fecha seleccionada no está disponible: "${bloqueo.motivo}".`);
          return;
        }

        try {
          btnAgendar.disabled = true;
          btnAgendar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Agendando cita...';

          const res = await Api.post("/api/citas", {
            fecha_cita: fecha,
            hora_cita: hora,
            motivo,
            observaciones,
            id_cliente: usuarioActivo.id_usuario,
            estado: "Programada"
          });

          formCita.hidden = true;
          if (confirmacionCita) {
            confirmacionCita.hidden = false;
            if (resumenCita) {
              resumenCita.innerHTML = `
                Cita programada para el <strong>${fecha}</strong> a las <strong>${hora}</strong>.<br>
                Motivo: <em>${motivo}</em>
              `;
            }
          }
        } catch (err) {
          console.error("Error al agendar cita:", err);
          mostrarError(err.message || "Ocurrió un error al agendar la cita. Por favor intenta de nuevo.");
          btnAgendar.disabled = false;
          btnAgendar.textContent = "Agendar cita";
        }
      });
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    inicializar();
    try {
      await cargarBloqueos();
      inicializarCalendarioCliente();
    } catch (error) {
      console.error("No se pudieron consultar los bloqueos de calendario:", error);
      mostrarError("No se pudo verificar la disponibilidad del calendario. Intenta recargar la página.");
      const calendarioContenedor = document.getElementById("calendarioCitaCliente");
      if (calendarioContenedor) {
        calendarioContenedor.textContent = "No se pudo cargar la disponibilidad del calendario.";
      }
      if (btnAgendar) btnAgendar.disabled = true;
    }
  });
})();
