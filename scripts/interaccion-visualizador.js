/* ============================================================
   LÓGICA DE INTERACCIÓN DEL VISUALIZADOR DE PRODUCTOS
   ============================================================ */

document.addEventListener('DOMContentLoaded', function() {
  // ---------- 1. Alternar entre "Ver producto" y "Pruébatelo" ----------
  const botonesAlternar = document.querySelectorAll(".btn-alternar");
  const vistas = {
    'vista-producto': document.getElementById("vista-producto"),
    'vista-probador': document.getElementById("vista-probador")
  };

  botonesAlternar.forEach((boton) => {
    boton.addEventListener("click", () => {
      botonesAlternar.forEach((b) => b.classList.remove("activo"));
      boton.classList.add("activo");

      Object.values(vistas).forEach(vista => vista.classList.add("oculto"));
      vistas[boton.dataset.vista].classList.remove("oculto");
    });
  });

  // ---------- 2. Cambiar la miniatura activa en la galería ----------
  const miniaturas = document.querySelectorAll(".miniatura");
  const imagenPrincipal = document.querySelector(".imagen-producto");

  miniaturas.forEach((miniatura) => {
    miniatura.addEventListener("click", () => {
      miniaturas.forEach((m) => m.classList.remove("activa"));
      miniatura.classList.add("activa");
      // En una versión completa, aquí se actualizaría la imagen principal
    });
  });

  // ---------- 3. Selector de color ----------
  const botonesColor = document.querySelectorAll(".color");

  botonesColor.forEach((boton) => {
    boton.addEventListener("click", () => {
      botonesColor.forEach((b) => b.classList.remove("seleccionado"));
      boton.classList.add("seleccionado");
    });
  });

  // ---------- 4. Selector de cantidad ----------
  const textoCantidad = document.getElementById("cantidad");
  const botonRestar = document.getElementById("restar");
  const botonSumar = document.getElementById("sumar");

  let cantidadActual = 1;
  const CANTIDAD_MINIMA = 1;
  const CANTIDAD_MAXIMA = 10;

  botonRestar.addEventListener("click", () => {
    if (cantidadActual > CANTIDAD_MINIMA) {
      cantidadActual--;
      textoCantidad.textContent = cantidadActual;
    }
  });

  botonSumar.addEventListener("click", () => {
    if (cantidadActual < CANTIDAD_MAXIMA) {
      cantidadActual++;
      textoCantidad.textContent = cantidadActual;
    }
  });

  // ---------- 5. Botón "Agregar al carrito" ----------
  const botonAgregarCarrito = document.querySelector(".btn-agregar-carrito");
  const mensajeConfirmacion = document.getElementById("mensaje-confirmacion");

  botonAgregarCarrito.addEventListener("click", () => {
    mensajeConfirmacion.classList.remove("oculto");
    setTimeout(() => {
      mensajeConfirmacion.classList.add("oculto");
    }, 2500);
  });

  // ---------- 6. Botón "Activar cámara" del probador virtual ----------
  const botonActivarCamara = document.querySelector(".btn-activar-camara");

  botonActivarCamara.addEventListener("click", () => {
    alert("Aquí se activaría la cámara para el probador virtual.");
  });
});
