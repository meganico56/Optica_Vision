(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const form = $("formPerfil");
  if (!form) return;

  const usuarioSesion = window.Sesion && window.Sesion.usuario
    ? window.Sesion.usuario()
    : null;
  const token = localStorage.getItem("bv_token") || "";
  const coincidencia = /^session-(\d+)$/.exec(token);
  const idSesion = usuarioSesion ? Number(usuarioSesion.id) : NaN;
  const idUsuario = Number.isInteger(idSesion) && idSesion > 0
    ? idSesion
    : coincidencia
      ? Number(coincidencia[1])
      : null;

  function mostrarMensaje(id, texto, tipo) {
    const mensaje = $(id);
    mensaje.textContent = texto;
    mensaje.hidden = !texto;
    mensaje.classList.toggle("is-error", tipo === "error");
    mensaje.classList.toggle("is-success", tipo === "success");
  }

  if (!idUsuario) {
    mostrarMensaje("mensajePerfil", "No se pudo identificar la cuenta. Inicia sesión nuevamente.", "error");
    return;
  }

  let perfil = {};

  function iniciales(nombre, apellido) {
    const primera = String(nombre || "").trim().charAt(0);
    const segunda = String(apellido || "").trim().charAt(0);
    return (primera + segunda).toUpperCase() || "?";
  }

  function pintarAvatar(elemento, texto, foto) {
    elemento.textContent = "";
    if (typeof foto === "string" && foto.startsWith("data:image/jpeg;base64,")) {
      const imagen = document.createElement("img");
      imagen.src = foto;
      imagen.alt = "";
      elemento.appendChild(imagen);
    } else {
      elemento.textContent = texto;
    }
  }

  function pintarPerfil(datos) {
    perfil = datos;
    $("profileNombre").value = datos.nombre || "";
    $("profileApellido").value = datos.apellido || "";
    $("profileTipoDoc").value = datos.tipo_documento || "";
    $("profileDocumento").value = datos.num_documento || "";
    $("profileTelefono").value = datos.telefono || "";
    $("profileCorreo").value = datos.correo || "";
    $("profileDireccion").value = datos.direccion || "";
    $("profileCiudad").value = datos.ciudad || "";
    $("profileFechaNacimiento").value = datos.fecha_nacimiento || "";

    const nombreCompleto = [datos.nombre, datos.apellido].filter(Boolean).join(" ");
    const avatarIniciales = iniciales(datos.nombre, datos.apellido);
    const rol = usuarioSesion && usuarioSesion.rol ? usuarioSesion.rol : "";
    if ($("adminName")) $("adminName").textContent = nombreCompleto;
    if ($("adminRol")) $("adminRol").textContent = rol;
    if ($("adminAvatar")) pintarAvatar($("adminAvatar"), avatarIniciales, datos.foto_perfil);
    if ($("profileAvatarLarge")) pintarAvatar($("profileAvatarLarge"), avatarIniciales, datos.foto_perfil);
  }

  function optimizarImagen(archivo) {
    return new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onerror = () => reject(new Error("No se pudo leer la imagen seleccionada."));
      lector.onload = () => {
        if (typeof lector.result !== "string") {
          reject(new Error("No se pudo procesar la imagen seleccionada."));
          return;
        }

        const imagen = new Image();
        imagen.onerror = () => reject(new Error("El archivo seleccionado no es una imagen válida."));
        imagen.onload = () => {
          const ladoMayor = Math.max(imagen.naturalWidth, imagen.naturalHeight);
          if (!ladoMayor) {
            reject(new Error("La imagen seleccionada no tiene dimensiones válidas."));
            return;
          }

          const escala = Math.min(1, 512 / ladoMayor);
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(imagen.naturalWidth * escala));
          canvas.height = Math.max(1, Math.round(imagen.naturalHeight * escala));
          const contexto = canvas.getContext("2d");
          if (!contexto) {
            reject(new Error("No se pudo procesar la imagen en este navegador."));
            return;
          }

          try {
            contexto.fillStyle = "#ffffff";
            contexto.fillRect(0, 0, canvas.width, canvas.height);
            contexto.drawImage(imagen, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/jpeg", 0.82));
          } catch (error) {
            reject(new Error("No se pudo procesar la imagen seleccionada."));
          }
        };
        imagen.src = lector.result;
      };
      lector.readAsDataURL(archivo);
    });
  }

  $("changeProfileImage").addEventListener("click", () => $("profileImageInput").click());
  $("profileImageInput").addEventListener("change", async (evento) => {
    const archivo = evento.target.files && evento.target.files[0];
    if (!archivo) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type)) {
      mostrarMensaje("profileImageStatus", "Selecciona una imagen JPG, PNG o WebP.", "error");
      evento.target.value = "";
      return;
    }
    if (archivo.size > 5 * 1024 * 1024) {
      mostrarMensaje("profileImageStatus", "La imagen debe pesar 5 MB o menos.", "error");
      evento.target.value = "";
      return;
    }

    const boton = $("changeProfileImage");
    boton.disabled = true;
    mostrarMensaje("profileImageStatus", "", "");
    try {
      const foto = await optimizarImagen(archivo);
      await Api.put("/api/perfil/" + idUsuario + "/foto", { foto_perfil: foto });
      pintarPerfil(Object.assign({}, perfil, { foto_perfil: foto }));
      mostrarMensaje("profileImageStatus", "Imagen de perfil actualizada.", "success");
    } catch (error) {
      const mensaje = error.estado === 404
        ? "El servidor no reconoce la ruta para cambiar la foto. Reinicia el backend y vuelve a intentarlo."
        : error.message;
      mostrarMensaje("profileImageStatus", mensaje, "error");
    } finally {
      boton.disabled = false;
      evento.target.value = "";
    }
  });

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    mostrarMensaje("mensajePerfil", "", "");
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const datos = {
      nombre: $("profileNombre").value.trim(),
      apellido: $("profileApellido").value.trim(),
      telefono: $("profileTelefono").value.trim(),
      correo: $("profileCorreo").value.trim(),
      direccion: $("profileDireccion").value.trim(),
      ciudad: $("profileCiudad").value.trim(),
      fecha_nacimiento: $("profileFechaNacimiento").value
    };

    const boton = document.querySelector('[type="submit"][form="formPerfil"]');
    if (boton) boton.disabled = true;
    try {
      const respuesta = await Api.put("/api/perfil/" + idUsuario, datos);
      pintarPerfil(Object.assign({}, perfil, datos));
      try {
        const usuarioActualizado = Object.assign({}, usuarioSesion, { nombre: datos.nombre });
        localStorage.setItem("bv_usuario", JSON.stringify(usuarioActualizado));
      } catch (error) {
        console.warn("No se pudo actualizar el nombre de usuario guardado en la sesión.", error);
      }
      mostrarMensaje("mensajePerfil", respuesta.mensaje || "Perfil actualizado correctamente.", "success");
    } catch (error) {
      mostrarMensaje("mensajePerfil", error.message, "error");
    } finally {
      if (boton) boton.disabled = false;
    }
  });

  function cargarPerfil() {
    Api.get("/api/perfil/" + idUsuario)
      .then(pintarPerfil)
      .catch((error) => mostrarMensaje("mensajePerfil", error.message, "error"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", cargarPerfil);
  } else {
    cargarPerfil();
  }
})();
