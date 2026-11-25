(function () {
  "use strict";

  const VERSION = "1.2.3";
  const TASKS_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}`;
  const WASM_URL = `${TASKS_URL}/wasm`;
  const MODEL_URL =
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
  const RUTA_IMAGENES = "../imagenes/productos/";

  const tryOnBtn = document.getElementById("tryOnBtn");
  const tryOnPanel = document.getElementById("tryOnPanel");
  const activateCamBtn = document.getElementById("activateCam");
  const closeTryOnBtn = document.getElementById("closeTryOn");
  const tryOnError = document.getElementById("tryOnError");
  const tryOnStatus = document.getElementById("tryOnStatus");
  const colGallery = document.getElementById("colGallery");
  const cameraFeed = document.getElementById("cameraFeed");
  const glassesLayer = document.getElementById("camGlassesLayer");
  const glassesOverlay = document.getElementById("glassesOverlayImg");
  const camModeBadge = document.getElementById("camModeBadge");
  const modelCards = document.getElementById("modelosPrueba");
  const mainShell = document.getElementById("mainShell");
  const glassesScale = document.getElementById("glassesScale");
  const glassesScaleValue = document.getElementById("glassesScaleValue");
  const glassesHeight = document.getElementById("glassesHeight");
  const glassesHeightValue = document.getElementById("glassesHeightValue");
  const resetAdjustmentsBtn = document.getElementById("resetGlassesAdjustments");
  const tryOnCard = tryOnBtn && tryOnBtn.closest(".try-on-card");

  if (
    !tryOnBtn ||
    !tryOnPanel ||
    !activateCamBtn ||
    !colGallery ||
    !cameraFeed ||
    !glassesLayer ||
    !glassesOverlay ||
    !camModeBadge ||
    !mainShell ||
    !glassesScale ||
    !glassesScaleValue ||
    !glassesHeight ||
    !glassesHeightValue ||
    !resetAdjustmentsBtn ||
    !tryOnError ||
    !tryOnStatus ||
    !modelCards
  ) {
    return;
  }

  let cameraStream = null;
  let faceLandmarker = null;
  let landmarkerPromise = null;
  let animationFrame = null;
  let lastVideoTime = -1;
  let tryOnActive = false;
  let currentImage = "";
  let filteredPose = null;
  let lastPoseTime = null;

  function setStatus(message) {
    if (tryOnStatus.textContent === message && tryOnStatus.hidden === !message) return;
    tryOnStatus.textContent = message;
    tryOnStatus.hidden = !message;
  }

  function setError(message) {
    tryOnError.textContent = message;
    tryOnError.hidden = !message;
  }

  function createModelCard(product, imageUrl) {
    modelCards.replaceChildren();

    const card = document.createElement("button");
    card.type = "button";
    card.className = "model-card active";
    card.setAttribute("aria-pressed", "true");

    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = "";
    image.onerror = () => {
      image.onerror = null;
      image.src = `${RUTA_IMAGENES}gafas-modelo1.png`;
    };

    const name = document.createElement("span");
    name.textContent = product.nombre || "Este modelo";

    card.append(image, name);
    card.addEventListener("click", () => {
      glassesOverlay.src = image.src;
      modelCards.querySelectorAll(".model-card").forEach((item) => {
        const selected = item === card;
        item.classList.toggle("active", selected);
        item.setAttribute("aria-pressed", String(selected));
      });
    });
    modelCards.append(card);

    glassesOverlay.src = imageUrl;
    glassesOverlay.onerror = () => {
      glassesOverlay.onerror = null;
      glassesOverlay.src = `${RUTA_IMAGENES}gafas-modelo1.png`;
    };
  }

  window.addEventListener("bv:producto-cargado", (event) => {
    const { producto, imagen } = event.detail || {};
    if (!producto) return;

    const esAccesorio =
      String(producto.categoria || "").trim().toLowerCase() === "accesorios";
    if (tryOnCard) tryOnCard.hidden = esAccesorio;
    if (esAccesorio) {
      currentImage = "";
      modelCards.replaceChildren();
      return;
    }

    currentImage = imagen || `${RUTA_IMAGENES}gafas-modelo1.png`;
    createModelCard(producto, currentImage);
  });

  if (tryOnBtn) {
    tryOnBtn.addEventListener("click", () => {
      tryOnPanel.classList.toggle("hidden");
      const open = !tryOnPanel.classList.contains("hidden");
      tryOnBtn.textContent = open ? "Cerrar" : "Activar";
      if (open) {
        setError("");
        tryOnPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
  }

  activateCamBtn.addEventListener("click", startTryOn);
  if (closeTryOnBtn) closeTryOnBtn.addEventListener("click", closeTryOn);
  window.addEventListener("pagehide", closeTryOn);

  function renderAdjustments() {
    glassesScaleValue.textContent = `${glassesScale.value}%`;
    glassesHeightValue.textContent = `${glassesHeight.value}%`;
    if (filteredPose) {
      renderGlasses(filteredPose);
      window.dispatchEvent(new Event("bv:tryon-frame"));
    }
    window.dispatchEvent(new Event("bv:tryon-adjustments"));
  }

  glassesScale.addEventListener("input", renderAdjustments);
  glassesHeight.addEventListener("input", renderAdjustments);
  resetAdjustmentsBtn.addEventListener("click", () => {
    glassesScale.value = "100";
    glassesHeight.value = "0";
    renderAdjustments();
  });
  renderAdjustments();

  async function startTryOn() {
    if (tryOnActive || activateCamBtn.disabled) return;
    setError("");

    if (!currentImage) {
      setError("No hay una imagen de montura disponible para probar.");
      return;
    }
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError("La cámara requiere HTTPS o localhost y un navegador compatible.");
      return;
    }

    activateCamBtn.disabled = true;
    activateCamBtn.textContent = "Iniciando…";

    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
      cameraStream.getVideoTracks().forEach((track) => {
        track.addEventListener("ended", () => {
          if (!tryOnActive) return;
          closeTryOn();
          setError("La cámara se desconectó. Vuelve a activarla para continuar.");
        });
      });
      cameraFeed.srcObject = cameraStream;
      await cameraFeed.play();

      setStatus("Cargando seguimiento facial…");
      faceLandmarker = await loadFaceLandmarker();

      tryOnActive = true;
      lastVideoTime = -1;
      filteredPose = null;
      lastPoseTime = null;
      colGallery.classList.add("try-on-active");
      cameraFeed.classList.add("active");
      glassesLayer.classList.add("active");
      camModeBadge.classList.add("active");
      tryOnPanel.classList.add("hidden");
      tryOnBtn.textContent = "Activar";
      setStatus("Mira al frente y centra tu rostro");
      animationFrame = requestAnimationFrame(trackFace);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("No se pudo iniciar la prueba virtual:", error);
      stopCamera();
      resetViewer();
      setError(getCameraErrorMessage(error));
    } finally {
      activateCamBtn.disabled = false;
      activateCamBtn.textContent = "Activar cámara";
    }
  }

  async function loadFaceLandmarker() {
    if (!landmarkerPromise) {
      landmarkerPromise = (async () => {
        const { FaceLandmarker, FilesetResolver } = await import(TASKS_URL);
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        const options = {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numFaces: 1,
        };

        try {
          return await FaceLandmarker.createFromOptions(vision, options);
        } catch (gpuError) {
          console.warn("GPU no disponible para Face Landmarker; usando CPU.", gpuError);
          return FaceLandmarker.createFromOptions(vision, {
            ...options,
            baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
          });
        }
      })();
    }

    try {
      return await landmarkerPromise;
    } catch (error) {
      landmarkerPromise = null;
      throw error;
    }
  }

  function trackFace() {
    if (!tryOnActive || !faceLandmarker) return;

    if (
      cameraFeed.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      cameraFeed.currentTime !== lastVideoTime
    ) {
      lastVideoTime = cameraFeed.currentTime;
      try {
        const timestamp = performance.now();
        const result = faceLandmarker.detectForVideo(cameraFeed, timestamp);
        const landmarks = result.faceLandmarks && result.faceLandmarks[0];
        if (
          landmarks &&
          landmarks[33] &&
          landmarks[263] &&
          positionGlasses(landmarks, timestamp)
        ) {
          glassesLayer.classList.add("has-face");
          setStatus("Rostro detectado · mueve la cabeza para ajustar");
        } else {
          filteredPose = null;
          lastPoseTime = null;
          glassesLayer.classList.remove("has-face");
          setStatus("No detectamos un rostro. Mira a la cámara con buena iluminación.");
        }
        window.dispatchEvent(new Event("bv:tryon-frame"));
      } catch (error) {
        console.error("Falló el seguimiento facial:", error);
        closeTryOn();
        tryOnPanel.classList.remove("hidden");
        tryOnBtn.textContent = "Cerrar";
        setError("Se interrumpió el seguimiento facial. Inténtalo de nuevo.");
        return;
      }
    }

    animationFrame = requestAnimationFrame(trackFace);
  }

  function positionGlasses(landmarks, timestamp) {
    if (!cameraFeed.videoWidth || !cameraFeed.videoHeight) return false;

    const shellWidth = mainShell.clientWidth;
    const shellHeight = mainShell.clientHeight;
    if (!shellWidth || !shellHeight) return false;

    const scale = Math.max(
      shellWidth / cameraFeed.videoWidth,
      shellHeight / cameraFeed.videoHeight,
    );
    const renderedWidth = cameraFeed.videoWidth * scale;
    const renderedHeight = cameraFeed.videoHeight * scale;
    const offsetX = (shellWidth - renderedWidth) / 2;
    const offsetY = (shellHeight - renderedHeight) / 2;
    const toScreen = (point) => ({
      x: (1 - point.x) * renderedWidth + offsetX,
      y: point.y * renderedHeight + offsetY,
    });

    const eyeA = toScreen(landmarks[33]);
    const eyeB = toScreen(landmarks[263]);
    const leftEye = eyeA.x < eyeB.x ? eyeA : eyeB;
    const rightEye = eyeA.x < eyeB.x ? eyeB : eyeA;
    const eyeDistance = Math.hypot(
      rightEye.x - leftEye.x,
      rightEye.y - leftEye.y,
    );
    const targetPose = {
      x: (leftEye.x + rightEye.x) / 2,
      y: (leftEye.y + rightEye.y) / 2,
      width: eyeDistance * 1.75,
      angle: Math.atan2(
        rightEye.y - leftEye.y,
        rightEye.x - leftEye.x,
      ),
    };

    if (!filteredPose) {
      filteredPose = targetPose;
    } else {
      const elapsed = Math.max(0, timestamp - lastPoseTime);
      const amount = 1 - Math.exp(-elapsed / 65);
      const angleDelta = Math.atan2(
        Math.sin(targetPose.angle - filteredPose.angle),
        Math.cos(targetPose.angle - filteredPose.angle),
      );
      filteredPose.x += (targetPose.x - filteredPose.x) * amount;
      filteredPose.y += (targetPose.y - filteredPose.y) * amount;
      filteredPose.width += (targetPose.width - filteredPose.width) * amount;
      filteredPose.angle += angleDelta * amount;
    }
    lastPoseTime = timestamp;
    renderGlasses(filteredPose);
    return true;
  }

  function renderGlasses(pose) {
    const width = pose.width * (Number(glassesScale.value) / 100);
    const height =
      glassesOverlay.naturalWidth > 0
        ? width * (glassesOverlay.naturalHeight / glassesOverlay.naturalWidth)
        : width * 0.4;
    const centerY =
      pose.y -
      height * 0.12 +
      (Number(glassesHeight.value) / 100) * height;

    glassesOverlay.style.left = `${pose.x}px`;
    glassesOverlay.style.top = `${centerY}px`;
    glassesOverlay.style.width = `${width}px`;
    glassesOverlay.style.transform =
      `translate(-50%, -50%) rotate(${pose.angle}rad)`;
  }

  function closeTryOn() {
    tryOnActive = false;
    stopCamera();
    resetViewer();
    tryOnPanel.classList.add("hidden");
    tryOnBtn.textContent = "Activar";
    setError("");
    window.dispatchEvent(new Event("bv:tryon-closed"));
  }

  function stopCamera() {
    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      cameraStream = null;
    }
    cameraFeed.srcObject = null;
  }

  function resetViewer() {
    tryOnActive = false;
    filteredPose = null;
    lastPoseTime = null;
    colGallery.classList.remove("try-on-active");
    cameraFeed.classList.remove("active");
    glassesLayer.classList.remove("active", "has-face");
    camModeBadge.classList.remove("active");
    setStatus("");
  }

  function getCameraErrorMessage(error) {
    if (error && error.name === "NotAllowedError") {
      return "No se concedió permiso para usar la cámara. Revisa los permisos del navegador.";
    }
    if (error && error.name === "NotFoundError") {
      return "No encontramos una cámara conectada a este dispositivo.";
    }
    if (error && error.name === "NotReadableError") {
      return "La cámara está ocupada por otra aplicación. Ciérrala e inténtalo de nuevo.";
    }
    return "No se pudo iniciar el seguimiento facial. Comprueba tu conexión e inténtalo de nuevo.";
  }
})();
