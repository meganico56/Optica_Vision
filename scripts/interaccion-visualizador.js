/* ============================================================
   LÓGICA DE INTERACCIÓN DEL VISUALIZADOR DE PRODUCTOS
   Efectos parallax, carrusel y UX mejorada
   ============================================================ */

document.addEventListener('DOMContentLoaded', function() {
  // ========== PARALLAX EFFECT ==========
  const parallaxImage = document.querySelector('.parallax-image');
  const glassHeader = document.querySelector('.glass-header');
  
  window.addEventListener('scroll', function() {
    const scrolled = window.pageYOffset;
    
    // Parallax effect for background
    if (parallaxImage) {
      parallaxImage.style.transform = `scale(1.1) translateY(${scrolled * 0.3}px)`;
    }
    
    // Glass header effect
    if (glassHeader) {
      if (scrolled > 50) {
        glassHeader.classList.add('scrolled');
      } else {
        glassHeader.classList.remove('scrolled');
      }
    }
  });

  // ========== IMAGE GALLERY ==========
  const mainImage = document.getElementById('mainImage');
  const thumbnails = document.querySelectorAll('.thumbnail');
  const imageZoom = document.getElementById('imageZoom');
  
  thumbnails.forEach(thumbnail => {
    thumbnail.addEventListener('click', function() {
      // Remove active class from all thumbnails
      thumbnails.forEach(t => t.classList.remove('active'));
      
      // Add active class to clicked thumbnail
      this.classList.add('active');
      
      // Update main image with fade effect
      if (mainImage) {
        mainImage.style.opacity = '0';
        setTimeout(() => {
          mainImage.src = this.dataset.image;
          mainImage.style.opacity = '1';
        }, 200);
      }
    });
  });

  // Image zoom functionality
  if (imageZoom && mainImage) {
    imageZoom.addEventListener('click', function() {
      mainImage.style.transform = mainImage.style.transform === 'scale(1.5)' ? 'scale(1)' : 'scale(1.5)';
      mainImage.style.cursor = mainImage.style.transform === 'scale(1.5)' ? 'zoom-out' : 'zoom-in';
    });
  }

  // ========== VIRTUAL TRY-ON ==========
  const tryOnBtn = document.getElementById('tryOnBtn');
  const tryOnPanel = document.getElementById('tryOnPanel');
  const activateCamera = document.querySelector('.activate-camera');
  
  if (tryOnBtn && tryOnPanel) {
    tryOnBtn.addEventListener('click', function() {
      tryOnPanel.classList.toggle('active');
      const isActive = tryOnPanel.classList.contains('active');
      tryOnBtn.innerHTML = isActive ? 
        '<i class="fi fi-br-cross"></i><span>Cerrar Probador</span>' : 
        '<i class="fi fi-br-camera"></i><span>Pruébatelo Virtual</span>';
    });
  }

  if (activateCamera) {
    activateCamera.addEventListener('click', function() {
      // Here you would integrate camera functionality
      alert('Funcionalidad de cámara en desarrollo. En una versión completa, aquí se activaría navigator.mediaDevices.getUserMedia()');
    });
  }

  // ========== COLOR SELECTION ==========
  const colorOptions = document.querySelectorAll('.color-option');
  
  colorOptions.forEach(option => {
    option.addEventListener('click', function() {
      colorOptions.forEach(o => o.classList.remove('active'));
      this.classList.add('active');
      
      // Here you would update the product image based on selected color
      console.log('Color seleccionado:', this.dataset.color);
    });
  });

  // ========== QUANTITY CONTROLS ==========
  const minusBtn = document.getElementById('minusBtn');
  const plusBtn = document.getElementById('plusBtn');
  const quantityInput = document.getElementById('quantityInput');
  
  if (minusBtn && plusBtn && quantityInput) {
    minusBtn.addEventListener('click', function() {
      let currentValue = parseInt(quantityInput.value);
      if (currentValue > 1) {
        quantityInput.value = currentValue - 1;
      }
    });

    plusBtn.addEventListener('click', function() {
      let currentValue = parseInt(quantityInput.value);
      if (currentValue < 10) {
        quantityInput.value = currentValue + 1;
      }
    });

    quantityInput.addEventListener('change', function() {
      let value = parseInt(this.value);
      if (isNaN(value) || value < 1) this.value = 1;
      if (value > 10) this.value = 10;
    });
  }

  // ========== ADD TO CART ==========
  const addToCartBtn = document.getElementById('addToCartBtn');
  const notification = document.getElementById('notification');
  const cartCount = document.querySelector('.cart-count');
  
  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', function() {
      // Show loading state
      this.innerHTML = '<i class="fi fi-br-spinner loading"></i><span>Agregando...</span>';
      this.disabled = true;

      // Simulate API call
      setTimeout(() => {
        // Reset button
        this.innerHTML = '<i class="fi fi-rs-shopping-cart"></i><span>Agregar al Carrito</span>';
        this.disabled = false;

        // Update cart count
        if (cartCount) {
          const currentCount = parseInt(cartCount.textContent);
          cartCount.textContent = currentCount + parseInt(quantityInput?.value || 1);
        }

        // Show notification
        if (notification) {
          notification.classList.add('show');
          setTimeout(() => {
            notification.classList.remove('show');
          }, 3000);
        }
      }, 1000);
    });
  }

  // ========== CAROUSEL FUNCTIONALITY ==========
  const carouselTrack = document.getElementById('carouselTrack');
  const prevCarousel = document.getElementById('prevCarousel');
  const nextCarousel = document.getElementById('nextCarousel');
  
  if (carouselTrack && prevCarousel && nextCarousel) {
    const scrollAmount = 300;
    
    prevCarousel.addEventListener('click', function() {
      carouselTrack.scrollBy({
        left: -scrollAmount,
        behavior: 'smooth'
      });
    });

    nextCarousel.addEventListener('click', function() {
      carouselTrack.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
      });
    });

    // Auto-scroll carousel
    let autoScrollInterval;
    
    function startAutoScroll() {
      autoScrollInterval = setInterval(() => {
        const maxScroll = carouselTrack.scrollWidth - carouselTrack.clientWidth;
        if (carouselTrack.scrollLeft >= maxScroll) {
          carouselTrack.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          carouselTrack.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
      }, 4000);
    }

    function stopAutoScroll() {
      clearInterval(autoScrollInterval);
    }

    // Start auto-scroll
    startAutoScroll();

    // Pause on hover
    carouselTrack.addEventListener('mouseenter', stopAutoScroll);
    carouselTrack.addEventListener('mouseleave', startAutoScroll);

    // Touch support for mobile
    let touchStartX = 0;
    let touchEndX = 0;

    carouselTrack.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      stopAutoScroll();
    });

    carouselTrack.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
      startAutoScroll();
    });

    function handleSwipe() {
      const swipeThreshold = 50;
      const diff = touchStartX - touchEndX;
      
      if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
          carouselTrack.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        } else {
          carouselTrack.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        }
      }
    }
  }

  // ========== PRODUCT CARDS INTERACTION ==========
  const productCards = document.querySelectorAll('.product-card');
  
  productCards.forEach(card => {
    card.addEventListener('click', function() {
      // In a real application, this would navigate to the product page
      const productName = this.querySelector('h3').textContent;
      console.log('Producto seleccionado:', productName);
    });
  });

  // ========== SMOOTH SCROLL FOR ANCHOR LINKS ==========
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

  // ========== LAZY LOADING FOR IMAGES ==========
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          }
          observer.unobserve(img);
        }
      });
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }

  // ========== ANIMATION ON SCROLL ==========
  const animateOnScroll = () => {
    const elements = document.querySelectorAll('.product-card, .feature, .detail-item');
    
    elements.forEach(element => {
      const elementTop = element.getBoundingClientRect().top;
      const elementVisible = 150;
      
      if (elementTop < window.innerHeight - elementVisible) {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
      }
    });
  };

  // Initialize animations
  document.querySelectorAll('.product-card, .feature, .detail-item').forEach(element => {
    element.style.opacity = '0';
    element.style.transform = 'translateY(20px)';
    element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  });

  window.addEventListener('scroll', animateOnScroll);
  animateOnScroll(); // Initial check
});