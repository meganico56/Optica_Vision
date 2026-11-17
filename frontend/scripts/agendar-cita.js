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

  function obtenerUsuarioActual() {
    if (window.SesionUsuario && typeof window.SesionUsuario.obtener === "function") {
      return window.SesionUsuario.obtener();
    }
    try {
      const u = localStorage.getItem("usuario");
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  }

  async function cargarBloqueos() {
    try {
      const res = await Api.get("/api/calendario/bloqueos");
      bloqueosCalendario = Array.isArray(res) ? res : [];
    } catch (e) {
      console.warn("No se pudieron consultar los bloqueos de calendario:", e);
      bloqueosCalendario = [];
    }
  }

  function fechaBloqueada(fechaStr) {
    return bloqueosCalendario.find(b => {
      return fechaStr >= b.fecha_inicio && fechaStr <= b.fecha_fin;
    });
  }

  function poblarHoras() {
    horaSelect.innerHTML = '<option value="" disabled selected>Selecciona una hora</option>';
    HORARIOS_DISPONIBLES.forEach(h => {
      const opt = document.createElement("option");
      opt.value = h;
      opt.textContent = `${h} hrs`;
      horaSelect.appendChild(opt);
    });
    horaSelect.disabled = false;
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
    const hoy = new Date();
    const hoyStr = hoy.toISOString().split("T")[0];
    const maxFecha = new Date();
    maxFecha.setMonth(maxFecha.getMonth() + 3);
    const maxStr = maxFecha.toISOString().split("T")[0];

    if (fechaInput) {
      fechaInput.min = hoyStr;
      fechaInput.max = maxStr;

      fechaInput.addEventListener("change", () => {
        ocultarError();
        const seleccion = fechaInput.value;
        if (!seleccion) {
          horaSelect.disabled = true;
          horaSelect.innerHTML = '<option value="" selected>Elige primero una fecha</option>';
          return;
        }

        // Validar si el día seleccionado cae en domingo
        const diaSemana = new Date(seleccion + "T00:00:00").getDay();
        if (diaSemana === 0) {
          mostrarError("Los domingos la óptica permanece cerrada. Por favor elige otro día de lunes a sábado.");
          horaSelect.disabled = true;
          horaSelect.innerHTML = '<option value="" selected>Día no laboral</option>';
          return;
        }

        // Validar si está en los bloqueos del administrador
        const bloqueo = fechaBloqueada(seleccion);
        if (bloqueo) {
          mostrarError(`Esta fecha no está disponible para citas: "${bloqueo.motivo}". Por favor selecciona otra fecha.`);
          horaSelect.disabled = true;
          horaSelect.innerHTML = '<option value="" selected>Fecha no disponible</option>';
          return;
        }

        poblarHoras();
      });
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

        if (!fecha || !hora || !motivo) {
          mostrarError("Por favor selecciona la fecha, la hora y el motivo de tu cita.");
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
    await cargarBloqueos();
    inicializar();
  });
})();
