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
  // TOGGLE MODO CLARO / OSCURO
  // ══════════════════════════════════════════════════════════
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon   = document.getElementById('themeIcon');

  // Aplicar tema guardado (default: light)
  const savedTheme = localStorage.getItem('bv-theme') || 'light';
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    if (themeIcon) themeIcon.className = 'fi fi-br-moon';
  }

  themeToggle?.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark-mode');
    if (themeIcon) {
      // Pequeña animación de rotación al cambiar
      themeToggle.style.transform = 'rotate(360deg)';
      setTimeout(() => { themeToggle.style.transform = ''; }, 350);
      themeIcon.className = isDark ? 'fi fi-br-moon' : 'fi fi-br-brightness';
    }
    localStorage.setItem('bv-theme', isDark ? 'dark' : 'light');
    showToast(isDark ? '🌙 Modo oscuro activado' : '☀️ Modo claro activado');
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

  if (zoomTrigger && zoomModal && zoomImg) {
    zoomTrigger.addEventListener('click', () => {
      zoomImg.src = mainImage ? mainImage.src : '';
      zoomModal.classList.remove('hidden');
    });
  }
  if (zoomClose)  zoomClose.addEventListener('click', () => zoomModal.classList.add('hidden'));
  if (zoomModal)  zoomModal.addEventListener('click', e => {
    if (e.target === zoomModal) zoomModal.classList.add('hidden');
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && zoomModal) zoomModal.classList.add('hidden');
  });

  // ══════════════════════════════════════════════════════════
  // VIRTUAL TRY-ON — Cámara + animación + selector de modelos
  // ══════════════════════════════════════════════════════════
  const tryOnBtn        = document.getElementById('tryOnBtn');
  const tryOnPanel      = document.getElementById('tryOnPanel');
  const activateCamBtn  = document.getElementById('activateCam');
  const colGallery      = document.getElementById('colGallery');
  const cameraFeed      = document.getElementById('cameraFeed');
  const camGlassesLayer = document.getElementById('camGlassesLayer');
  const camModeBadge    = document.getElementById('camModeBadge');
  const glassesOverlay  = document.getElementById('glassesOverlayImg');
  const closeTryOnBtn   = document.getElementById('closeTryOn');

  let cameraStream = null;
  let tryOnActive  = false;

  // Paso 1 — Toggle del panel de instrucciones
  if (tryOnBtn && tryOnPanel) {
    tryOnBtn.addEventListener('click', () => {
      tryOnPanel.classList.toggle('hidden');
      const open = !tryOnPanel.classList.contains('hidden');
      tryOnBtn.textContent = open ? 'Cerrar' : 'Activar';

      // Desplazar hacia la tarjeta de prueba virtual cuando se abre
      if (open) {
        setTimeout(() => {
          tryOnBtn.closest('.try-on-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 120);
      }
    });
  }

  // Paso 2 — Activar cámara + secuencia de animación + scroll
  if (activateCamBtn) {
    activateCamBtn.addEventListener('click', async () => {
      if (tryOnActive) return;

      activateCamBtn.textContent = 'Iniciando...';
      activateCamBtn.disabled = true;

      const launchTryOn = (withCamera) => {
        tryOnActive = true;

        // 1. Agregar clase activa a la galería → CSS hace la transición
        colGallery.classList.add('try-on-active');

        // 2. Activar video/badge con pequeño delay
        setTimeout(() => {
          if (withCamera) cameraFeed.classList.add('active');
          if (camModeBadge) camModeBadge.classList.add('active');
        }, 120);

        // 3. Mostrar overlay de gafas
        setTimeout(() => {
          if (camGlassesLayer) camGlassesLayer.classList.add('active');
        }, 600);

        // 4. Ocultar panel instrucciones
        if (tryOnPanel) tryOnPanel.classList.add('hidden');
        if (tryOnBtn)   tryOnBtn.textContent = 'Activar';

        // 5. Scroll suave hasta el top de la página
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 180);

        activateCamBtn.textContent = 'Activar Cámara';
        activateCamBtn.disabled = false;
      };

      try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        cameraFeed.srcObject = cameraStream;
        await cameraFeed.play();
        launchTryOn(true);
      } catch (err) {
        // Modo demo sin cámara
        console.warn('Cámara no disponible, modo demo:', err.message);

        // Fondo simulado
        if (cameraFeed) {
          cameraFeed.style.background = 'linear-gradient(135deg, #1e1d18 0%, #2c2b22 100%)';
          cameraFeed.classList.add('active');
        }

        // Mensaje demo
        const mainShell = document.getElementById('mainShell');
        if (mainShell && !document.getElementById('demoMsg')) {
          const demoMsg = document.createElement('div');
          demoMsg.id = 'demoMsg';
          Object.assign(demoMsg.style, {
            position: 'absolute', inset: '0', display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            zIndex: '2', color: 'rgba(255,255,255,0.6)', fontSize: '13px',
            gap: '10px', textAlign: 'center', padding: '24px'
          });
          demoMsg.innerHTML = `
            <i class="fi fi-br-camera" style="font-size:2.2rem;color:#bda229;"></i>
            <strong>Modo Demo</strong>
            <span style="font-size:11px;opacity:.7;">Permite el acceso a la cámara en tu navegador para la prueba real</span>`;
          mainShell.appendChild(demoMsg);
        }
        launchTryOn(false);
      }
    });
  }

  // Paso 3 — Selector de modelos de gafas
  const modelCards = document.querySelectorAll('.model-card');
  modelCards.forEach(card => {
    card.addEventListener('click', function () {
      modelCards.forEach(c => c.classList.remove('active'));
      this.classList.add('active');

      // Cambiar overlay con fade
      if (glassesOverlay) {
        glassesOverlay.style.cssText += 'opacity:0;transform:scale(0.88);transition:opacity .3s,transform .3s';
        setTimeout(() => {
          glassesOverlay.src = this.dataset.src;
          glassesOverlay.style.opacity = '1';
          glassesOverlay.style.transform = 'scale(1)';
        }, 200);
      }
      showToast(`Probando: ${this.dataset.name}`);
    });
  });

  // Paso 4 — Cerrar prueba virtual y restaurar
  if (closeTryOnBtn) closeTryOnBtn.addEventListener('click', closeTryOn);

  function closeTryOn() {
    if (!tryOnActive) return;
    tryOnActive = false;

    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      cameraStream = null;
    }

    colGallery.classList.remove('try-on-active');
    if (cameraFeed) {
      cameraFeed.classList.remove('active');
      cameraFeed.srcObject = null;
      cameraFeed.style.background = '';
    }
    if (camGlassesLayer) camGlassesLayer.classList.remove('active');
    if (camModeBadge)    camModeBadge.classList.remove('active');

    const demoMsg = document.getElementById('demoMsg');
    if (demoMsg) demoMsg.remove();

    // Resetear modelo al primero
    modelCards.forEach((c, i) => c.classList.toggle('active', i === 0));
    if (glassesOverlay && modelCards[0]) glassesOverlay.src = modelCards[0].dataset.src;

    showToast('Prueba virtual cerrada');
  }

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
  // CONTROL DE CANTIDAD
  // ══════════════════════════════════════════════════════════
  const minusBtn = document.getElementById('minusBtn');
  const plusBtn  = document.getElementById('plusBtn');
  const qtyInput = document.getElementById('qtyInput');
  if (minusBtn && plusBtn && qtyInput) {
    minusBtn.addEventListener('click', () => {
      const v = parseInt(qtyInput.value);
      if (v > 1) qtyInput.value = v - 1;
    });
    plusBtn.addEventListener('click', () => {
      const v = parseInt(qtyInput.value);
      if (v < 10) qtyInput.value = v + 1;
    });
    qtyInput.addEventListener('change', () => {
      let v = parseInt(qtyInput.value);
      if (isNaN(v) || v < 1) qtyInput.value = 1;
      if (v > 10) qtyInput.value = 10;
    });
  }

  // ══════════════════════════════════════════════════════════
  // AGREGAR AL CARRITO + TOAST
  // ══════════════════════════════════════════════════════════
  const addToCartBtn = document.getElementById('addToCartBtn');
  const toast        = document.getElementById('toast');
  const toastMsg     = document.getElementById('toastMsg');
  const cartBadge    = document.getElementById('cartBadge');
  let cartCount = 0;

  function showToast(msg) {
    if (!toast) return;
    if (toastMsg) toastMsg.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', function () {
      const qty = parseInt(qtyInput?.value || 1);
      this.innerHTML = '<i class="fi fi-br-hourglass"></i><span>Agregando...</span>';
      this.disabled = true;
      this.style.opacity = '0.7';
      setTimeout(() => {
        this.innerHTML = '<i class="fi fi-rs-shopping-cart"></i><span>Agregar al Carrito</span>';
        this.disabled = false;
        this.style.opacity = '1';
        cartCount += qty;
        if (cartBadge) {
          cartBadge.textContent = cartCount;
          cartBadge.style.transform = 'scale(1.6)';
          setTimeout(() => { cartBadge.style.transform = 'scale(1)'; }, 300);
        }
        showToast(`${qty} producto(s) agregado(s) al carrito`);
      }, 900);
    });
  }

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