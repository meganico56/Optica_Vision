/* ============================================================
   LÓGICA DE INTERACCIÓN DE LA PÁGINA DE PRODUCTO
   ============================================================ */

// ---------- 1. Alternar entre "Ver producto" y "Pruébatelo" ----------
const botonesAlternar = document.querySelectorAll(".btn-alternar");

botonesAlternar.forEach((boton) => {
  boton.addEventListener("click", () => {
    // Quita la clase "activo" de todos los botones
    botonesAlternar.forEach((b) => b.classList.remove("activo"));
    // Marca como activo el botón que se acaba de presionar
    boton.classList.add("activo");

    // Oculta ambas vistas y muestra únicamente la seleccionada
    document.getElementById("vista-producto").classList.add("oculto");
    document.getElementById("vista-probador").classList.add("oculto");

    const idVistaSeleccionada = boton.dataset.vista;
    document.getElementById(idVistaSeleccionada).classList.remove("oculto");
  });
});

// ---------- 2. Cambiar la miniatura activa en la galería ----------
const miniaturas = document.querySelectorAll(".miniatura");

miniaturas.forEach((miniatura) => {
  miniatura.addEventListener("click", () => {
    miniaturas.forEach((m) => m.classList.remove("activa"));
    miniatura.classList.add("activa");
    // Aquí, en una versión conectada a datos reales, se actualizaría
    // la imagen principal según el valor de "data-imagen".
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
const cantidadMinima = 1;
const cantidadMaxima = 10; // Límite razonable de unidades por compra

botonRestar.addEventListener("click", () => {
  if (cantidadActual > cantidadMinima) {
    cantidadActual--;
    textoCantidad.textContent = cantidadActual;
  }
});

botonSumar.addEventListener("click", () => {
  if (cantidadActual < cantidadMaxima) {
    cantidadActual++;
    textoCantidad.textContent = cantidadActual;
  }
});

// ---------- 5. Botón "Agregar al carrito" ----------
const botonAgregarCarrito = document.querySelector(".btn-agregar-carrito");
const mensajeConfirmacion = document.getElementById("mensaje-confirmacion");

botonAgregarCarrito.addEventListener("click", () => {
  // Aquí se conectaría la lógica real para guardar el producto
  // en el carrito (por ejemplo, una llamada a una API o al
  // almacenamiento del carrito de compras).
  mensajeConfirmacion.classList.remove("oculto");

  // Oculta el mensaje de confirmación después de unos segundos
  setTimeout(() => {
    mensajeConfirmacion.classList.add("oculto");
  }, 2500);
});

// ---------- 6. Botón "Activar cámara" del probador virtual ----------
const botonActivarCamara = document.querySelector(".btn-activar-camara");

botonActivarCamara.addEventListener("click", () => {
  // Aquí se integraría la API de la cámara del navegador
  // (por ejemplo, navigator.mediaDevices.getUserMedia) para
  // mostrar la imagen en vivo del cliente con las gafas superpuestas.
  alert("Aquí se activaría la cámara para el probador virtual.");
});
