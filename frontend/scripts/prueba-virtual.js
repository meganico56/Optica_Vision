(function () {
  "use strict";

  const VERSION = "1.2.3";
  const TASKS_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}`;
  const WASM_URL = `${TASKS_URL}/wasm`;
  const MODEL_URL =
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
  const HAND_MODEL_URL =
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
  const RUTA_IMAGENES = "../imagenes/productos/";
  const TEMPLES_SHOW_YAW = 0.22;
  const TEMPLES_HIDE_YAW = 0.16;

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
  const productModelViewer = document.getElementById("productModelViewer");
  const tryOnModelViewer = document.getElementById("tryOnModelViewer");
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
    !tryOnModelViewer ||
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

  tryOnModelViewer.addEventListener("load", () => {
    tryOnModelViewer.dataset.loaded = "true";
    tryOnModelViewer.dataset.failed = "false";
  });
  tryOnModelViewer.addEventListener("error", () => {
    tryOnModelViewer.dataset.loaded = "false";
    tryOnModelViewer.dataset.failed = "true";
    if (tryOnActive) setError("No se pudo cargar el modelo 3D de las gafas.");
  });

  let cameraStream = null;
  let faceLandmarker = null;
  let handLandmarker = null;
  let landmarkerPromise = null;
  let animationFrame = null;
  let lastVideoTime = -1;
  let tryOnActive = false;
  let currentImage = "";
  let hasCurrentModel = false;
  let currentModelUrl = "";
  let frontFacingModelUrl = "";
  let templesVisible = false;
  let modelOverlayImage = "";
  let filteredPose = null;
  let lastPoseTime = null;
  let poseSource = null;
  let handPinched = false;

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
      glassesOverlay.src = modelOverlayImage || imageUrl;
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
    currentModelUrl = producto.modelo_3d
      ? "../modelos_gafas/" + encodeURIComponent(producto.modelo_3d)
      : "";
    frontFacingModelUrl =
      producto.modelo_3d === "gafas.glb"
        ? "../modelos_gafas/gafas-frontal.glb"
        : currentModelUrl;
    templesVisible = false;
    hasCurrentModel = Boolean(
      currentModelUrl && productModelViewer && tryOnModelViewer,
    );
    modelOverlayImage = "";
    tryOnModelViewer.hidden = true;
    tryOnModelViewer.removeAttribute("src");
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

    if (!currentImage && !hasCurrentModel) {
      setError("No hay un modelo de montura disponible para probar.");
      return;
    }
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError("La cámara requiere HTTPS o localhost y un navegador compatible.");
      return;
    }

    activateCamBtn.disabled = true;
    activateCamBtn.textContent = "Iniciando…";

    try {
      const overlaySource = hasCurrentModel
        ? await captureModelOverlay()
        : currentImage;
      await setOverlayImage(overlaySource);
      if (hasCurrentModel) await loadTryOnModel();

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

      setStatus("Cargando seguimiento facial y de manos…");
      const landmarkers = await loadLandmarkers();
      faceLandmarker = landmarkers.face;
      handLandmarker = landmarkers.hand;

      tryOnActive = true;
      lastVideoTime = -1;
      filteredPose = null;
      lastPoseTime = null;
      poseSource = null;
      handPinched = false;
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

  async function captureModelOverlay() {
    if (!productModelViewer) {
      throw new Error("No se encontró el visor del modelo 3D.");
    }
    if (!customElements.get("model-viewer")) {
      throw new Error("No se pudo cargar el visor del modelo 3D.");
    }

    if (productModelViewer.dataset.failed === "true") {
      throw new Error("No se pudo cargar el modelo 3D.");
    }

    if (productModelViewer.dataset.loaded !== "true") {
      await new Promise((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          cleanup();
          reject(new Error("El modelo 3D tardó demasiado en cargarse."));
        }, 15000);
        const onLoad = () => {
          cleanup();
          resolve();
        };
        const onError = () => {
          cleanup();
          reject(new Error("No se pudo cargar el modelo 3D."));
        };
        const cleanup = () => {
          window.clearTimeout(timeout);
          productModelViewer.removeEventListener("load", onLoad);
          productModelViewer.removeEventListener("error", onError);
        };
        productModelViewer.addEventListener("load", onLoad, { once: true });
        productModelViewer.addEventListener("error", onError, { once: true });
        if (productModelViewer.dataset.loaded === "true") onLoad();
      });
    }

    try {
      const image = productModelViewer.toDataURL("image/png");
      modelOverlayImage = await cropTransparentImage(image);
      return modelOverlayImage;
    } catch (error) {
      console.error("No se pudo preparar el modelo 3D para la cámara:", error);
      throw new Error("No se pudo preparar el modelo 3D para la cámara.");
    }
  }

  function cropTransparentImage(source) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
          reject(new Error("No se pudo procesar la imagen del modelo 3D."));
          return;
        }

        context.drawImage(image, 0, 0);
        try {
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
          let minX = canvas.width;
          let minY = canvas.height;
          let maxX = -1;
          let maxY = -1;
          for (let y = 0; y < canvas.height; y += 1) {
            for (let x = 0; x < canvas.width; x += 1) {
              if (pixels.data[(y * canvas.width + x) * 4 + 3] <= 8) continue;
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            }
          }

          if (maxX < minX || maxY < minY) {
            resolve(source);
            return;
          }

          const paddingX = Math.round((maxX - minX + 1) * 0.03);
          const paddingY = Math.round((maxY - minY + 1) * 0.03);
          minX = Math.max(0, minX - paddingX);
          minY = Math.max(0, minY - paddingY);
          maxX = Math.min(canvas.width - 1, maxX + paddingX);
          maxY = Math.min(canvas.height - 1, maxY + paddingY);
          const cropped = document.createElement("canvas");
          cropped.width = maxX - minX + 1;
          cropped.height = maxY - minY + 1;
          cropped.getContext("2d").drawImage(
            canvas,
            minX,
            minY,
            cropped.width,
            cropped.height,
            0,
            0,
            cropped.width,
            cropped.height,
          );
          resolve(cropped.toDataURL("image/png"));
        } catch (error) {
          reject(error);
        }
      };
      image.onerror = () => reject(new Error("No se pudo leer el modelo 3D."));
      image.src = source;
    });
  }

  function setOverlayImage(source) {
    glassesOverlay.src = source;
    if (glassesOverlay.complete && glassesOverlay.naturalWidth > 0) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      glassesOverlay.addEventListener("load", resolve, { once: true });
      glassesOverlay.addEventListener(
        "error",
        () => reject(new Error("No se pudo mostrar la montura en la cámara.")),
        { once: true },
      );
    });
  }

  function loadTryOnModel() {
    if (!customElements.get("model-viewer")) {
      return Promise.reject(
        new Error("No se pudo cargar el visor 3D de la prueba virtual."),
      );
    }

    const modelUrl = frontFacingModelUrl || currentModelUrl;
    tryOnModelViewer.hidden = false;
    tryOnModelViewer.style.left = "50%";
    tryOnModelViewer.style.top = "50%";
    tryOnModelViewer.style.width = "220px";
    tryOnModelViewer.style.height = "120px";
    const sameModel = tryOnModelViewer.getAttribute("src") === modelUrl;
    if (sameModel && tryOnModelViewer.dataset.loaded === "true") {
      return Promise.resolve();
    }
    if (
      sameModel &&
      tryOnModelViewer.dataset.failed === "true"
    ) {
      return Promise.reject(new Error("No se pudo cargar el modelo 3D."));
    }

    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error("El modelo 3D tardó demasiado en cargarse."));
      }, 15000);
      const onLoad = () => {
        tryOnModelViewer.dataset.loaded = "true";
        tryOnModelViewer.dataset.failed = "false";
        cleanup();
        resolve();
      };
      const onError = () => {
        tryOnModelViewer.dataset.loaded = "false";
        tryOnModelViewer.dataset.failed = "true";
        cleanup();
        reject(new Error("No se pudo cargar el modelo 3D."));
      };
      const cleanup = () => {
        window.clearTimeout(timeout);
        tryOnModelViewer.removeEventListener("load", onLoad);
        tryOnModelViewer.removeEventListener("error", onError);
      };
      tryOnModelViewer.addEventListener("load", onLoad, { once: true });
      tryOnModelViewer.addEventListener("error", onError, { once: true });
      if (!sameModel) {
        tryOnModelViewer.dataset.loaded = "false";
        tryOnModelViewer.dataset.failed = "false";
        tryOnModelViewer.setAttribute("src", modelUrl);
      }
      if (tryOnModelViewer.dataset.loaded === "true") onLoad();
    });
  }

  async function loadLandmarkers() {
    if (!landmarkerPromise) {
      landmarkerPromise = (async () => {
        const { FaceLandmarker, HandLandmarker, FilesetResolver } =
          await import(TASKS_URL);
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        const faceOptions = {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numFaces: 1,
        };
        const handOptions = {
          baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numHands: 1,
        };

        try {
          const [face, hand] = await Promise.all([
            FaceLandmarker.createFromOptions(vision, faceOptions),
            HandLandmarker.createFromOptions(vision, handOptions),
          ]);
          return { face, hand };
        } catch (gpuError) {
          console.warn("GPU no disponible para el seguimiento; usando CPU.", gpuError);
          const [face, hand] = await Promise.all([
            FaceLandmarker.createFromOptions(vision, {
              ...faceOptions,
              baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
            }),
            HandLandmarker.createFromOptions(vision, {
              ...handOptions,
              baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate: "CPU" },
            }),
          ]);
          return { face, hand };
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
    if (!tryOnActive || !faceLandmarker || !handLandmarker) return;

    if (
      cameraFeed.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      cameraFeed.currentTime !== lastVideoTime
    ) {
      lastVideoTime = cameraFeed.currentTime;
      try {
        const timestamp = performance.now();
        const faceResult = faceLandmarker.detectForVideo(cameraFeed, timestamp);
        const handResult = handLandmarker.detectForVideo(cameraFeed, timestamp);
        const face = faceResult.faceLandmarks && faceResult.faceLandmarks[0];
        const hand = handResult.landmarks && handResult.landmarks[0];
        if (!hand) handPinched = false;
        else handPinched = updateHandPinch(hand, handPinched);

        if (handPinched && hand && positionGlassesOnHand(hand, timestamp)) {
          glassesLayer.classList.add("has-face");
          setStatus("Gafas siguiendo tu mano · abre la mano para soltarlas");
        } else if (
          face &&
          face[33] &&
          face[263] &&
          positionGlasses(face, timestamp)
        ) {
          glassesLayer.classList.add("has-face");
          setStatus(hand
            ? "Haz un pellizco con pulgar e índice para mover las gafas"
            : "Mira al frente y centra tu rostro");
        } else {
          filteredPose = null;
          lastPoseTime = null;
          poseSource = null;
          glassesLayer.classList.remove("has-face", "use-3d-model");
          setStatus(hand
            ? "Haz un pellizco con pulgar e índice para mover las gafas"
            : "No detectamos un rostro. Mira a la cámara con buena iluminación.");
        }
        window.dispatchEvent(new Event("bv:tryon-frame"));
      } catch (error) {
        console.error("Falló el seguimiento facial y de manos:", error);
        closeTryOn();
        tryOnPanel.classList.remove("hidden");
        tryOnBtn.textContent = "Cerrar";
        setError("Se interrumpió el seguimiento facial y de manos. Inténtalo de nuevo.");
        return;
      }
    }

    animationFrame = requestAnimationFrame(trackFace);
  }

  function toViewerPoint(point) {
    if (!cameraFeed.videoWidth || !cameraFeed.videoHeight) return null;

    const shellWidth = mainShell.clientWidth;
    const shellHeight = mainShell.clientHeight;
    if (!shellWidth || !shellHeight) return null;

    const scale = Math.max(
      shellWidth / cameraFeed.videoWidth,
      shellHeight / cameraFeed.videoHeight,
    );
    const renderedWidth = cameraFeed.videoWidth * scale;
    const renderedHeight = cameraFeed.videoHeight * scale;
    const offsetX = (shellWidth - renderedWidth) / 2;
    const offsetY = (shellHeight - renderedHeight) / 2;
    return {
      x: (1 - point.x) * renderedWidth + offsetX,
      y: point.y * renderedHeight + offsetY,
    };
  }

  function positionGlasses(landmarks, timestamp) {
    const eyeA = toViewerPoint(landmarks[33]);
    const eyeB = toViewerPoint(landmarks[263]);
    const nose = toViewerPoint(landmarks[1]);
    const mouthA = toViewerPoint(landmarks[13]);
    const mouthB = toViewerPoint(landmarks[14]);
    if (!eyeA || !eyeB || !nose || !mouthA || !mouthB) return false;

    const leftEye = eyeA.x < eyeB.x ? eyeA : eyeB;
    const rightEye = eyeA.x < eyeB.x ? eyeB : eyeA;
    const eyeDistance = Math.hypot(
      rightEye.x - leftEye.x,
      rightEye.y - leftEye.y,
    );
    if (!eyeDistance) return false;
    const eyeCenterX = (leftEye.x + rightEye.x) / 2;
    const eyeCenterY = (leftEye.y + rightEye.y) / 2;
    const mouthCenterY = (mouthA.y + mouthB.y) / 2;
    const eyeToMouth = mouthCenterY - eyeCenterY;
    if (!eyeToMouth) return false;
    const noseOffset = (nose.x - eyeCenterX) / eyeDistance;
    const noseHeight = (nose.y - eyeCenterY) / eyeToMouth;
    const targetPose = {
      x: eyeCenterX,
      y: eyeCenterY,
      width: eyeDistance * 1.75,
      angle: Math.atan2(
        rightEye.y - leftEye.y,
        rightEye.x - leftEye.x,
      ),
      yaw: clamp(noseOffset * 3.2, -0.75, 0.75),
      pitch: clamp((noseHeight - 0.53) * 2.8, -0.55, 0.55),
    };

    return applyPose(targetPose, timestamp, "face");
  }

  function updateHandPinch(landmarks, wasPinched) {
    const thumbTip = toViewerPoint(landmarks[4]);
    const indexTip = toViewerPoint(landmarks[8]);
    const palmA = toViewerPoint(landmarks[5]);
    const palmB = toViewerPoint(landmarks[17]);
    if (!thumbTip || !indexTip || !palmA || !palmB) return false;

    const handWidth = Math.hypot(palmB.x - palmA.x, palmB.y - palmA.y);
    if (!handWidth) return false;
    const pinchDistance = Math.hypot(
      indexTip.x - thumbTip.x,
      indexTip.y - thumbTip.y,
    ) / handWidth;

    return wasPinched ? pinchDistance < 0.55 : pinchDistance < 0.32;
  }

  function positionGlassesOnHand(landmarks, timestamp) {
    const palmIndices = [0, 5, 9, 13, 17];
    const palm = palmIndices.map((index) => toViewerPoint(landmarks[index]));
    if (palm.some((point) => !point)) return false;

    const palmA = toViewerPoint(landmarks[5]);
    const palmB = toViewerPoint(landmarks[17]);
    const leftPalm = palmA.x < palmB.x ? palmA : palmB;
    const rightPalm = palmA.x < palmB.x ? palmB : palmA;
    const targetPose = {
      x: palm.reduce((sum, point) => sum + point.x, 0) / palm.length,
      y: palm.reduce((sum, point) => sum + point.y, 0) / palm.length,
      width: Math.hypot(rightPalm.x - leftPalm.x, rightPalm.y - leftPalm.y) * 2.4,
      yaw: 0,
      pitch: 0,
      angle: Math.atan2(
        rightPalm.y - leftPalm.y,
        rightPalm.x - leftPalm.x,
      ),
    };

    return applyPose(targetPose, timestamp, "hand");
  }

  function applyPose(targetPose, timestamp, source) {
    if (poseSource !== source) {
      filteredPose = null;
      lastPoseTime = null;
      poseSource = source;
    }

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
      filteredPose.yaw += (targetPose.yaw - filteredPose.yaw) * amount;
      filteredPose.pitch += (targetPose.pitch - filteredPose.pitch) * amount;
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

    const use3dModel = hasCurrentModel && poseSource === "face";
    glassesLayer.classList.toggle("use-3d-model", use3dModel);
    if (use3dModel) {
      updateTempleVisibility(pose.yaw);
      const modelHeight = width * 0.55;
      const theta = clamp(-pose.yaw * 52, -42, 42);
      const phi = clamp(75 + pose.pitch * 48, 52, 102);
      tryOnModelViewer.hidden = false;
      tryOnModelViewer.style.left = `${pose.x}px`;
      tryOnModelViewer.style.top = `${centerY}px`;
      tryOnModelViewer.style.width = `${width}px`;
      tryOnModelViewer.style.height = `${modelHeight}px`;
      tryOnModelViewer.style.transform =
        `translate(-50%, -50%) rotate(${pose.angle}rad)`;
      tryOnModelViewer.setAttribute(
        "camera-orbit",
        `${theta.toFixed(1)}deg ${phi.toFixed(1)}deg 60%`,
      );
    }
  }

  function updateTempleVisibility(yaw) {
    if (!frontFacingModelUrl || frontFacingModelUrl === currentModelUrl) return;

    const yawMagnitude = Math.abs(yaw);
    const shouldShowTemples = templesVisible
      ? yawMagnitude > TEMPLES_HIDE_YAW
      : yawMagnitude >= TEMPLES_SHOW_YAW;
    if (shouldShowTemples === templesVisible) return;

    templesVisible = shouldShowTemples;
    const modelUrl = templesVisible ? currentModelUrl : frontFacingModelUrl;
    if (tryOnModelViewer.getAttribute("src") === modelUrl) return;

    tryOnModelViewer.dataset.loaded = "false";
    tryOnModelViewer.dataset.failed = "false";
    tryOnModelViewer.setAttribute("src", modelUrl);
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
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
    poseSource = null;
    handPinched = false;
    templesVisible = false;
    colGallery.classList.remove("try-on-active");
    cameraFeed.classList.remove("active");
    glassesLayer.classList.remove("active", "has-face", "use-3d-model");
    tryOnModelViewer.hidden = true;
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
    if (error && /modelo 3D|visor 3D|montura en la cámara/i.test(error.message || "")) {
      return error.message;
    }
    return "No se pudo iniciar el seguimiento facial y de manos. Comprueba tu conexión e inténtalo de nuevo.";
  }
})();
