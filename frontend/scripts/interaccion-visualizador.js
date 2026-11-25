/* ============================================================
   BOUTIQUE DE LA VISIÓN — Visualizador de Producto
   Interacciones, cámara virtual y animaciones | 2026
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  // ══════════════════════════════════════════════════════════
  // HEADER SCROLL
  // ══════════════════════════════════════════════════════════
  const header = document.getElementById('siteHeader');
  window.addEventListener('scroll', () => {
    if (header) header.classList.toggle('scrolled', window.scrollY > 60);
  });

  // ══════════════════════════════════════════════════════════
  // MENÚ HAMBURGUESA
  // ══════════════════════════════════════════════════════════
  const hamBtn     = document.getElementById('Id_ham');
  const hiddenMenu = document.getElementById('id_men_ocu');
  if (hamBtn && hiddenMenu) {
    hamBtn.addEventListener('click', () => hiddenMenu.classList.toggle('mostrar'));
    document.addEventListener('click', (e) => {
      if (!hamBtn.contains(e.target) && !hiddenMenu.contains(e.target))
        hiddenMenu.classList.remove('mostrar');
    });
  }

  // ══════════════════════════════════════════════════════════
  // GALERÍA DE IMÁGENES — Miniaturas
  // ══════════════════════════════════════════════════════════
  const mainImage = document.getElementById('mainImage');
  const thumbs    = document.querySelectorAll('.thumb');

  thumbs.forEach(thumb => {
    thumb.addEventListener('click', function () {
      thumbs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      if (mainImage) {
        mainImage.style.opacity = '0';
        mainImage.style.transform = 'scale(0.95)';
        setTimeout(() => {
          mainImage.src = this.dataset.src;
          mainImage.style.opacity = '1';
          mainImage.style.transform = 'scale(1)';
        }, 200);
      }
    });
  });

  // ══════════════════════════════════════════════════════════
  // ZOOM MODAL
  // ══════════════════════════════════════════════════════════
  const zoomTrigger = document.getElementById('zoomTrigger');
  const zoomModal   = document.getElementById('zoomModal');
  const zoomClose   = document.getElementById('zoomClose');
  const zoomImg     = document.getElementById('zoomImg');
  const zoomLiveView = document.getElementById('zoomLiveView');
  const zoomCameraView = document.getElementById('zoomCameraView');
  const zoomCameraFeed = document.getElementById('zoomCameraFeed');
  const zoomGlassesOverlay = document.getElementById('zoomGlassesOverlay');
  const zoomCameraError = document.getElementById('zoomCameraError');
  const zoomScale = document.getElementById('zoomGlassesScale');
  const zoomScaleValue = document.getElementById('zoomGlassesScaleValue');
  const zoomHeight = document.getElementById('zoomGlassesHeight');
  const zoomHeightValue = document.getElementById('zoomGlassesHeightValue');
  const zoomResetAdjustments = document.getElementById('zoomResetGlassesAdjustments');
  const glassesScale = document.getElementById('glassesScale');
  const glassesHeight = document.getElementById('glassesHeight');
  const glassesOverlay = document.getElementById('glassesOverlayImg');
  const mainShell = document.getElementById('mainShell');
  const colGallery = document.getElementById('colGallery');
  const cameraFeed = document.getElementById('cameraFeed');

  if (zoomTrigger && zoomModal && zoomImg) {
    zoomTrigger.addEventListener('click', async () => {
      const tryOnIsActive = Boolean(
        colGallery?.classList.contains('try-on-active') &&
        cameraFeed?.srcObject
      );

      if (tryOnIsActive && zoomCameraView && zoomCameraFeed) {
        zoomImg.hidden = true;
        if (zoomLiveView) zoomLiveView.hidden = false;
        zoomCameraView.hidden = false;
        if (zoomCameraError) zoomCameraError.hidden = true;
        syncZoomAdjustments();
        zoomCameraFeed.srcObject = cameraFeed.srcObject;
        zoomModal.classList.remove('hidden');
        syncZoomGlasses();

        try {
          await zoomCameraFeed.play();
        } catch (error) {
          console.error('No se pudo reproducir la cámara ampliada:', error);
          if (zoomCameraError) {
            zoomCameraError.textContent = 'No se pudo mostrar la cámara ampliada.';
            zoomCameraError.hidden = false;
          }
        }
        return;
      }

      if (zoomLiveView) zoomLiveView.hidden = true;
      if (zoomCameraView) zoomCameraView.hidden = true;
      zoomImg.hidden = false;
      zoomImg.src = mainImage ? mainImage.src : '';
      zoomModal.classList.remove('hidden');
    });
  }
  if (zoomClose) zoomClose.addEventListener('click', closeZoomModal);
  if (zoomModal)  zoomModal.addEventListener('click', e => {
    if (e.target === zoomModal) closeZoomModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && zoomModal) closeZoomModal();
  });

  function closeZoomModal() {
    if (!zoomModal) return;
    zoomModal.classList.add('hidden');
    if (zoomCameraFeed) {
      zoomCameraFeed.pause();
      zoomCameraFeed.srcObject = null;
    }
    if (zoomCameraView) zoomCameraView.hidden = true;
    if (zoomLiveView) zoomLiveView.hidden = true;
    if (zoomGlassesOverlay) zoomGlassesOverlay.hidden = true;
    if (zoomCameraError) zoomCameraError.hidden = true;
    if (zoomImg) zoomImg.hidden = false;
  }

  function syncZoomGlasses() {
    if (
      !zoomCameraView ||
      !zoomGlassesOverlay ||
      !glassesOverlay ||
      !mainShell ||
      zoomCameraView.hidden
    ) {
      return;
    }

    zoomGlassesOverlay.src = glassesOverlay.currentSrc || glassesOverlay.src;
    const detected = document
      .getElementById('camGlassesLayer')
      ?.classList.contains('has-face');
    zoomGlassesOverlay.hidden = !detected;
    if (!detected) return;

    const sourceWidth = mainShell.clientWidth;
    const sourceHeight = mainShell.clientHeight;
    const left = parseFloat(glassesOverlay.style.left);
    const top = parseFloat(glassesOverlay.style.top);
    const width = parseFloat(glassesOverlay.style.width);
    if (
      !sourceWidth ||
      !sourceHeight ||
      !Number.isFinite(left) ||
      !Number.isFinite(top) ||
      !Number.isFinite(width)
    ) {
      return;
    }

    zoomGlassesOverlay.style.left = `${(left / sourceWidth) * 100}%`;
    zoomGlassesOverlay.style.top = `${(top / sourceHeight) * 100}%`;
    zoomGlassesOverlay.style.width = `${(width / sourceWidth) * 100}%`;
    zoomGlassesOverlay.style.transform = glassesOverlay.style.transform;
  }

  function syncZoomAdjustments() {
    if (!zoomScale || !zoomScaleValue || !zoomHeight || !zoomHeightValue) return;
    if (glassesScale) zoomScale.value = glassesScale.value;
    if (glassesHeight) zoomHeight.value = glassesHeight.value;
    zoomScaleValue.textContent = `${zoomScale.value}%`;
    zoomHeightValue.textContent = `${zoomHeight.value}%`;
  }

  function applyZoomAdjustment(zoomControl, mainControl) {
    if (!zoomControl || !mainControl) return;
    mainControl.value = zoomControl.value;
    mainControl.dispatchEvent(new Event('input', { bubbles: true }));
  }

  if (zoomScale && glassesScale) {
    zoomScale.addEventListener('input', () => applyZoomAdjustment(zoomScale, glassesScale));
  }
  if (zoomHeight && glassesHeight) {
    zoomHeight.addEventListener('input', () => applyZoomAdjustment(zoomHeight, glassesHeight));
  }
  if (zoomResetAdjustments) {
    zoomResetAdjustments.addEventListener('click', () => {
      if (zoomScale) zoomScale.value = '100';
      if (zoomHeight) zoomHeight.value = '0';
      if (glassesScale) glassesScale.value = '100';
      if (glassesHeight) glassesHeight.value = '0';
      const mainAdjustment = glassesScale || glassesHeight;
      if (mainAdjustment) {
        mainAdjustment.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        syncZoomAdjustments();
      }
    });
  }

  window.addEventListener('bv:tryon-frame', syncZoomGlasses);
  window.addEventListener('bv:tryon-adjustments', syncZoomAdjustments);
  window.addEventListener('bv:tryon-closed', closeZoomModal);
  window.addEventListener('resize', syncZoomGlasses);

  // ══════════════════════════════════════════════════════════
  // SELECTOR DE COLOR
  // ══════════════════════════════════════════════════════════
  const colorSwatches = document.querySelectorAll('.color-swatch');
  const colorNameEl   = document.getElementById('colorName');
  colorSwatches.forEach(swatch => {
    swatch.addEventListener('click', function () {
      colorSwatches.forEach(s => s.classList.remove('active'));
      this.classList.add('active');
      if (colorNameEl) colorNameEl.textContent = this.dataset.color;
    });
  });

  // ══════════════════════════════════════════════════════════
  // CARRUSEL DE PRODUCTOS RELACIONADOS
  // ══════════════════════════════════════════════════════════
  const track   = document.getElementById('carouselTrack');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  if (track && prevBtn && nextBtn) {
    let currentOffset = 0;
    const CARD_WIDTH  = 260;
    const VISIBLE     = 4;

    const getMaxOffset = () => Math.max(0, (track.children.length - VISIBLE) * CARD_WIDTH);

    function updateCarousel() {
      track.style.transform = `translateX(-${currentOffset}px)`;
      prevBtn.style.opacity = currentOffset <= 0 ? '0.4' : '1';
      nextBtn.style.opacity = currentOffset >= getMaxOffset() ? '0.4' : '1';
    }

    nextBtn.addEventListener('click', () => {
      currentOffset = Math.min(currentOffset + CARD_WIDTH, getMaxOffset());
      updateCarousel();
    });
    prevBtn.addEventListener('click', () => {
      currentOffset = Math.max(currentOffset - CARD_WIDTH, 0);
      updateCarousel();
    });

    let autoSlide = setInterval(() => {
      currentOffset = currentOffset >= getMaxOffset() ? 0 : Math.min(currentOffset + CARD_WIDTH, getMaxOffset());
      updateCarousel();
    }, 4500);

    track.addEventListener('mouseenter', () => clearInterval(autoSlide));
    track.addEventListener('mouseleave', () => {
      autoSlide = setInterval(() => {
        currentOffset = currentOffset >= getMaxOffset() ? 0 : Math.min(currentOffset + CARD_WIDTH, getMaxOffset());
        updateCarousel();
      }, 4500);
    });

    let touchX0 = 0;
    track.addEventListener('touchstart', e => { touchX0 = e.changedTouches[0].clientX; clearInterval(autoSlide); });
    track.addEventListener('touchend', e => {
      const diff = touchX0 - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        currentOffset = diff > 0
          ? Math.min(currentOffset + CARD_WIDTH, getMaxOffset())
          : Math.max(currentOffset - CARD_WIDTH, 0);
        updateCarousel();
      }
    });

    updateCarousel();
  }

  // ══════════════════════════════════════════════════════════
  // ANIMACIÓN DE ENTRADA AL SCROLL
  // ══════════════════════════════════════════════════════════
  const animTargets = document.querySelectorAll('.spec-item, .rel-card, .feature-item, .price-block');
  animTargets.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(22px)';
    el.style.transition = 'opacity 0.55s ease, transform 0.55s ease';
  });

  const revealObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        revealObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  animTargets.forEach(el => revealObs.observe(el));

  // ══════════════════════════════════════════════════════════
  // SMOOTH SCROLL EN ANCLAS
  // ══════════════════════════════════════════════════════════
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });

});