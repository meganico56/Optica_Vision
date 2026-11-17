// calendario-personalizado.js - Componente de calendario interactivo para Boutique de la Visión
// Soporta agenda, selección de rangos de bloqueo y validación de disponibilidad.

(function (window) {
  "use strict";

  const MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function formatearFechaISO(year, month, day) {
    return `${year}-${pad(month + 1)}-${pad(day)}`;
  }

  function fechaHoyISO() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  class CalendarioPersonalizado {
    constructor(opciones = {}) {
      this.contenedor = typeof opciones.contenedor === "string"
        ? document.getElementById(opciones.contenedor)
        : opciones.contenedor;

      if (!this.contenedor) {
        console.error("CalendarioPersonalizado: No se encontró el contenedor.");
        return;
      }

      this.modo = opciones.modo || "cliente";
      this.deshabilitarDomingos = opciones.deshabilitarDomingos !== false;
      this.alSeleccionarFecha = opciones.alSeleccionarFecha || null;
      this.bloqueos = Array.isArray(opciones.bloqueos) ? opciones.bloqueos : [];
      this.citas = Array.isArray(opciones.citas) ? opciones.citas : [];
      this.maxFecha = opciones.maxFecha || null;
      this.rangoInicio = opciones.rangoInicio || null;
      this.rangoFin = opciones.rangoFin || null;

      const hoy = new Date();
      this.year = opciones.year || hoy.getFullYear();
      this.month = opciones.month !== undefined ? opciones.month : hoy.getMonth();
      this.fechaSeleccionada = opciones.fechaSeleccionada || null;

      this.render();
    }

    setBloqueos(bloqueos) {
      this.bloqueos = Array.isArray(bloqueos) ? bloqueos : [];
      this.render();
    }

    setCitas(citas) {
      this.citas = Array.isArray(citas) ? citas : [];
      this.render();
    }

    setRango(inicio, fin) {
      this.rangoInicio = inicio || null;
      this.rangoFin = fin || null;
      this.render();
    }

    seleccionarFecha(fechaStr) {
      if (this.modo === "bloqueo") {
        if (!this.rangoInicio || this.rangoFin) {
          this.rangoInicio = fechaStr;
          this.rangoFin = null;
        } else if (fechaStr < this.rangoInicio) {
          this.rangoFin = this.rangoInicio;
          this.rangoInicio = fechaStr;
        } else {
          this.rangoFin = fechaStr;
        }
        this.fechaSeleccionada = null;
        this.render();
        if (typeof this.alSeleccionarFecha === "function") {
          this.alSeleccionarFecha(this.rangoInicio, this.rangoFin);
        }
        return;
      }

      this.fechaSeleccionada = fechaStr;
      if (fechaStr) {
        const partes = fechaStr.split("-");
        if (partes.length === 3) {
          this.year = parseInt(partes[0], 10);
          this.month = parseInt(partes[1], 10) - 1;
        }
      }
      this.render();
      if (typeof this.alSeleccionarFecha === "function") {
        this.alSeleccionarFecha(this.fechaSeleccionada);
      }
    }

    irMesAnterior() {
      this.month--;
      if (this.month < 0) {
        this.month = 11;
        this.year--;
      }
      this.render();
    }

    irMesSiguiente() {
      this.month++;
      if (this.month > 11) {
        this.month = 0;
        this.year++;
      }
      this.render();
    }

    irAHoy() {
      const hoy = new Date();
      this.year = hoy.getFullYear();
      this.month = hoy.getMonth();
      this.render();
    }

    obtenerBloqueoFecha(fechaStr) {
      return this.bloqueos.find((b) => {
        return fechaStr >= b.fecha_inicio && fechaStr <= b.fecha_fin;
      });
    }

    contarCitasFecha(fechaStr) {
      return this.citas.filter((c) => {
        if (!c.fecha_hora) return false;
        const fechaCita = c.fecha_hora.split("T")[0].split(" ")[0];
        return fechaCita === fechaStr && c.estado !== "Cancelada";
      }).length;
    }

    render() {
      if (!this.contenedor) return;

      const hoyISO = fechaHoyISO();
      const primerDiaMes = new Date(this.year, this.month, 1);
      const ultimoDiaMes = new Date(this.year, this.month + 1, 0);
      const totalDiasMes = ultimoDiaMes.getDate();

      // Ajuste lunes = 0, ..., domingo = 6
      let diaSemanaInicio = primerDiaMes.getDay() - 1;
      if (diaSemanaInicio === -1) diaSemanaInicio = 6;

      const mesAnteriorUltimoDia = new Date(this.year, this.month, 0).getDate();

      let html = `
        <div class="bv-calendario-widget">
          <!-- Encabezado con navegación de mes -->
          <div class="bv-cal-header">
            <div class="bv-cal-titulo-mes">
              <i class="fa-solid fa-calendar-days"></i>
              <span>${MESES[this.month]} ${this.year}</span>
            </div>
            <div class="bv-cal-nav">
              <button type="button" class="bv-cal-btn-hoy" data-cal-action="hoy">Hoy</button>
              <button type="button" class="bv-cal-btn-nav" data-cal-action="anterior" aria-label="Mes anterior">
                <i class="fa-solid fa-chevron-left"></i>
              </button>
              <button type="button" class="bv-cal-btn-nav" data-cal-action="siguiente" aria-label="Mes siguiente">
                <i class="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </div>

          <!-- Encabezado de días de la semana -->
          <div class="bv-cal-semana">
            ${DIAS_SEMANA.map((d, idx) => `
              <div class="bv-cal-col-dia ${idx === 6 ? 'fin-semana' : ''}">${d}</div>
            `).join("")}
          </div>

          <!-- Cuadrícula de días -->
          <div class="bv-cal-grid">
      `;

      // Celdas de relleno del mes anterior
      for (let i = diaSemanaInicio - 1; i >= 0; i--) {
        const numDia = mesAnteriorUltimoDia - i;
        html += `
          <div class="bv-cal-celda otro-mes" aria-hidden="true">
            <span class="bv-cal-num">${numDia}</span>
          </div>
        `;
      }

      // Celdas de los días del mes actual
      for (let dia = 1; dia <= totalDiasMes; dia++) {
        const fechaStr = formatearFechaISO(this.year, this.month, dia);
        const fechaObj = new Date(this.year, this.month, dia);
        const esDomingo = fechaObj.getDay() === 0;
        const esHoy = fechaStr === hoyISO;
        const esPasada = fechaStr < hoyISO;
        const bloqueo = this.obtenerBloqueoFecha(fechaStr);
        const esBloqueado = !!bloqueo;
        const excedeMaximo = this.maxFecha && fechaStr > this.maxFecha;
        const esSeleccionado = this.fechaSeleccionada === fechaStr;
        const esEnRango = this.modo === "bloqueo" &&
          this.rangoInicio &&
          fechaStr >= this.rangoInicio &&
          fechaStr <= (this.rangoFin || this.rangoInicio);
        const cantidadCitas = this.modo === "admin" ? this.contarCitasFecha(fechaStr) : 0;

        let clases = ["bv-cal-celda"];
        let tooltip = "";
        let iconoExtra = "";
        let esInteractuable = false;

        if (esHoy) clases.push("dia-hoy");

        // 1. VALIDACIÓN: Fechas pasadas (cursor: not-allowed y deshabilitado)
        if (esPasada) {
          clases.push("fecha-pasada");
          tooltip = "Fecha no disponible (anterior a hoy)";
        } else if (excedeMaximo) {
          clases.push("fuera-de-rango");
          tooltip = "Solo puedes agendar hasta tres meses adelante";
        }
        // 2. VALIDACIÓN: Días bloqueados por el administrador
        else if (esBloqueado) {
          clases.push("dia-bloqueado");
          tooltip = `Bloqueado por administración: "${bloqueo.motivo || 'Día no laboral'}"`;
          iconoExtra = '<span class="bv-cal-icono-bloqueo"><i class="fa-solid fa-ban"></i></span>';
        }
        // Domingos cerrados para clientes
        else if (esDomingo && this.deshabilitarDomingos && this.modo === "cliente") {
          clases.push("dia-cerrado");
          tooltip = "Domingo: Óptica cerrada";
          iconoExtra = '<span class="bv-cal-icono-bloqueo" title="Cerrado"><i class="fa-solid fa-store-slash"></i></span>';
        }
        // Día disponible
        else {
          clases.push("dia-disponible");
          esInteractuable = true;
          tooltip = esHoy ? "Hoy (Disponible)" : "Disponible para agendar";
        }

        if (this.modo === "bloqueo" && esEnRango) {
          clases.push("dia-en-rango");
        }
        if (this.modo === "bloqueo" && fechaStr === this.rangoInicio) {
          clases.push("rango-inicio");
        }
        if (this.modo === "bloqueo" && this.rangoFin && fechaStr === this.rangoFin) {
          clases.push("rango-fin");
        }

        if (esSeleccionado) {
          clases.push("dia-seleccionado");
        }

        // Indicador de citas en modo admin
        let badgeCita = "";
        if (this.modo === "admin" && cantidadCitas > 0) {
          badgeCita = `<span class="bv-cal-punto-cita" title="${cantidadCitas} cita(s)">${cantidadCitas} cita${cantidadCitas > 1 ? 's' : ''}</span>`;
        }

        html += `
          <div class="${clases.join(" ")}" 
               data-cal-fecha="${fechaStr}" 
               data-interactuable="${esInteractuable ? 'true' : 'false'}"
               tabindex="${esInteractuable ? '0' : '-1'}"
               role="button"
               aria-label="${fechaStr}: ${tooltip}"
               title="${tooltip}">
            <span class="bv-cal-num">${dia}</span>
            ${iconoExtra}
            ${badgeCita}
            <span class="bv-cal-tooltip">${tooltip}</span>
          </div>
        `;
      }

      // Celdas de relleno del mes siguiente
      const totalCeldasOcupadas = diaSemanaInicio + totalDiasMes;
      const celdasRestantes = (7 - (totalCeldasOcupadas % 7)) % 7;
      for (let j = 1; j <= celdasRestantes; j++) {
        html += `
          <div class="bv-cal-celda otro-mes" aria-hidden="true">
            <span class="bv-cal-num">${j}</span>
          </div>
        `;
      }

      html += `
          </div>
        </div>
      `;

      this.contenedor.innerHTML = html;
      this.adjuntarEventos();
    }

    adjuntarEventos() {
      // Botón Mes Anterior
      const btnAnt = this.contenedor.querySelector('[data-cal-action="anterior"]');
      if (btnAnt) {
        btnAnt.addEventListener("click", () => this.irMesAnterior());
      }

      // Botón Mes Siguiente
      const btnSig = this.contenedor.querySelector('[data-cal-action="siguiente"]');
      if (btnSig) {
        btnSig.addEventListener("click", () => this.irMesSiguiente());
      }

      // Botón Hoy
      const btnHoy = this.contenedor.querySelector('[data-cal-action="hoy"]');
      if (btnHoy) {
        btnHoy.addEventListener("click", () => this.irAHoy());
      }

      // Clics en los días
      const celdas = this.contenedor.querySelectorAll(".bv-cal-celda[data-cal-fecha]");
      celdas.forEach((celda) => {
        celda.addEventListener("click", (e) => {
          const fecha = celda.dataset.calFecha;
          const esInteractuable = celda.dataset.interactuable === "true";

          if (!esInteractuable) {
            // Efecto visual de rechazo / denegación si se hace clic en una fecha no permitida
            celda.style.transform = "translateX(-3px)";
            setTimeout(() => { celda.style.transform = "translateX(3px)"; }, 80);
            setTimeout(() => { celda.style.transform = "none"; }, 160);
            return;
          }

          this.seleccionarFecha(fecha);
        });

        // Soporte accesible por teclado (Enter / Espacio)
        celda.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            celda.click();
          }
        });
      });
    }
  }

  window.CalendarioPersonalizado = CalendarioPersonalizado;
})(window);
