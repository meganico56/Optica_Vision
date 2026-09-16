/**
 * music-player.js
 * Reproductor de música flotante con loop sin fisuras para Boutique de la Visión.
 * - Crossfade al final del track para loop imperceptible.
 * - Guarda la posición de pausa en sessionStorage para reanudar desde ahí.
 */

(function () {
  'use strict';

  // ---------- Configuración ----------
  const AUDIO_SRC = '../audio/later-at-the-bar.mp3';
  const FADE_DURATION = 3.0;    // segundos de crossfade al final del track
  const DEFAULT_VOLUME = 0.55;  // volumen base (0 a 1)
  const KEY_PAUSED   = 'optica_music_paused';
  const KEY_OFFSET   = 'optica_music_offset'; // posición guardada en segundos
  const KEY_PAUSE_TS = 'optica_music_pause_ts'; // timestamp de cuando se pausó

  // ---------- Estado ----------
  let ctx, masterGain, buffer;
  let currentSource = null;
  let isPlaying = false;
  let trackStartTime = 0;   // ctx.currentTime cuando empezó la reproducción actual
  let trackOffset = 0;      // offset en segundos dentro del buffer
  let btn, btnIcon;

  // ---------- Calcular posición actual en el track ----------
  function getCurrentOffset() {
    if (!ctx || !isPlaying) return trackOffset;
    const elapsed = ctx.currentTime - trackStartTime;
    return (trackOffset + elapsed) % buffer.duration;
  }

  // ---------- Inicializar AudioContext ----------
  function initContext() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = DEFAULT_VOLUME;
    masterGain.connect(ctx.destination);
  }

  // ---------- Cargar buffer ----------
  async function loadBuffer() {
    const response = await fetch(AUDIO_SRC);
    const arrayBuffer = await response.arrayBuffer();
    buffer = await ctx.decodeAudioData(arrayBuffer);
  }

  // ---------- Crear y conectar fuente ----------
  function createSource(gainValue) {
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buffer;
    src.loop = false;
    gain.gain.value = gainValue;
    src.connect(gain);
    gain.connect(masterGain);
    return { src, gain };
  }

  // ---------- Reproducir con crossfade seamless ----------
  function playFromOffset(offset) {
    if (!buffer) return;

    const duration = buffer.duration;
    const timeLeft = duration - offset;
    const when = ctx.currentTime;

    // Registrar tiempo de inicio para calcular posición en pausa
    trackStartTime = when;
    trackOffset = offset;

    // Fuente principal
    const { src: mainSrc, gain: mainGain } = createSource(1.0);
    mainSrc.start(when, offset);

    // Fade-out suave al final del track
    const fadeStart = when + timeLeft - FADE_DURATION;
    mainGain.gain.setValueAtTime(1.0, Math.max(fadeStart, when));
    mainGain.gain.linearRampToValueAtTime(0.0, when + timeLeft);

    // Fuente siguiente (crossfade al inicio del loop)
    const { src: nextSrc, gain: nextGain } = createSource(0.0);
    const nextStart = Math.max(when + timeLeft - FADE_DURATION, when);
    nextSrc.start(nextStart, 0);
    nextGain.gain.setValueAtTime(0.0, nextStart);
    nextGain.gain.linearRampToValueAtTime(1.0, when + timeLeft);

    // Cuando termina el track principal, reiniciar desde 0
    mainSrc.onended = () => {
      if (isPlaying) {
        trackOffset = 0;
        trackStartTime = ctx.currentTime;
        playFromOffset(0);
      }
    };

    currentSource = { mainSrc, mainGain, nextSrc, nextGain };
  }

  // ---------- Detener fuentes activas ----------
  function stopSources() {
    if (!currentSource) return;
    try {
      currentSource.mainSrc.onended = null;
      currentSource.mainSrc.stop();
    } catch (e) {}
    try {
      currentSource.nextSrc.stop();
    } catch (e) {}
    currentSource = null;
  }

  // ---------- Controles ----------
  function play(fromOffset) {
    if (isPlaying) return;
    initContext();
    if (ctx.state === 'suspended') ctx.resume();
    isPlaying = true;
    updateBtn();
    sessionStorage.removeItem(KEY_PAUSED);
    sessionStorage.removeItem(KEY_OFFSET);
    sessionStorage.removeItem(KEY_PAUSE_TS);

    const startAt = (fromOffset !== undefined) ? fromOffset : 0;

    if (!buffer) {
      loadBuffer().then(() => playFromOffset(startAt));
    } else {
      playFromOffset(startAt);
    }
  }

  function pause() {
    if (!isPlaying) return;

    // Guardar posición actual antes de detener
    const savedOffset = getCurrentOffset();
    isPlaying = false;
    stopSources();
    trackOffset = savedOffset; // actualizar para la próxima vez

    // Persistir en sessionStorage
    sessionStorage.setItem(KEY_PAUSED, '1');
    sessionStorage.setItem(KEY_OFFSET, String(savedOffset));
    sessionStorage.setItem(KEY_PAUSE_TS, String(Date.now()));

    updateBtn();
  }

  function toggle() {
    if (isPlaying) {
      pause();
    } else {
      // Reanudar desde posición guardada en memoria (misma pestaña)
      play(trackOffset);
    }
  }

  // ---------- UI ----------
  function updateBtn() {
    if (!btn) return;
    if (isPlaying) {
      btnIcon.className = 'fa-solid fa-pause';
      btn.title = 'Pausar música';
      btn.classList.add('playing');
    } else {
      btnIcon.className = 'fa-solid fa-play';
      btn.title = 'Reproducir música';
      btn.classList.remove('playing');
    }
  }

  function injectUI() {
    const style = document.createElement('style');
    style.textContent = `
      #music-float-btn {
        position: fixed;
        bottom: 30px;
        right: 30px;
        z-index: 9999;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: linear-gradient(135deg, #cca43b, #b08c2f);
        color: #fff;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.1rem;
        box-shadow: 0 6px 20px rgba(204,164,59,0.45);
        transition: transform 0.25s ease, box-shadow 0.25s ease;
      }
      #music-float-btn:hover {
        transform: scale(1.12);
        box-shadow: 0 10px 28px rgba(204,164,59,0.6);
      }
      #music-float-btn .vinyl-ring {
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 2px solid rgba(255,255,255,0.25);
        pointer-events: none;
      }
      #music-float-btn.playing .vinyl-ring {
        animation: spin-ring 4s linear infinite;
      }
      @keyframes spin-ring {
        to { transform: rotate(360deg); }
      }
      #music-float-btn .music-tooltip {
        position: absolute;
        right: 58px;
        background: rgba(0,0,0,0.75);
        color: #fff;
        font-family: 'Inter', sans-serif;
        font-size: 0.78rem;
        padding: 5px 10px;
        border-radius: 8px;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
      }
      #music-float-btn:hover .music-tooltip {
        opacity: 1;
      }
    `;
    document.head.appendChild(style);

    btn = document.createElement('button');
    btn.id = 'music-float-btn';
    btn.title = 'Reproducir música';

    const ring = document.createElement('span');
    ring.className = 'vinyl-ring';

    btnIcon = document.createElement('i');
    btnIcon.className = 'fa-solid fa-play';

    const tooltip = document.createElement('span');
    tooltip.className = 'music-tooltip';
    tooltip.textContent = 'Later at the Bar';

    btn.appendChild(ring);
    btn.appendChild(btnIcon);
    btn.appendChild(tooltip);
    btn.addEventListener('click', toggle);
    document.body.appendChild(btn);
  }

  // ---------- Arranque ----------
  function init() {
    injectUI();

    const wasPaused  = sessionStorage.getItem(KEY_PAUSED) === '1';
    const savedOffset = parseFloat(sessionStorage.getItem(KEY_OFFSET) || '0');

    // Restaurar offset en memoria para cuando el usuario pulse play
    trackOffset = isNaN(savedOffset) ? 0 : savedOffset;

    if (!wasPaused) {
      // Autoplay (se activa en primer gesto si el navegador lo bloquea)
      initContext();
      loadBuffer().then(() => {
        // Intentar arrancar directamente
        try {
          play(trackOffset);
        } catch (e) {}
      }).catch(() => {});

      // Desbloquear en el primer gesto del usuario
      document.addEventListener('click', function unlock() {
        if (!isPlaying) play(trackOffset);
      }, { once: true });
    }
    // Si estaba pausado: el botón queda en estado "play" esperando interacción.
    // Al hacer click se reanuda desde trackOffset (posición guardada).
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
