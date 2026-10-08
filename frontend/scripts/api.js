
(function () {
    'use strict';
    const BASE = window.API_BASE !== undefined
        ? window.API_BASE
        : (location.port === '3000' ? '' : 'http://localhost:3000');

    const CLAVE_TOKEN = 'bv_token';

    class ApiError extends Error {
        constructor(mensaje, estado, datos) {
            super(mensaje);
            this.name = 'ApiError';
            this.estado = estado;
            this.datos = datos;
        }
    }

    function consulta(params) {
        if (!params) return '';
        const q = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== '') q.append(k, v);
        });
        const s = q.toString();
        return s ? '?' + s : '';
    }

    async function request(metodo, ruta, cuerpo) {
        const headers = { Accept: 'application/json' };
        const token = localStorage.getItem(CLAVE_TOKEN);
        if (token) headers.Authorization = 'Bearer ' + token;

        const opciones = { method: metodo, headers };
        if (cuerpo instanceof FormData) {
            // El navegador pone el Content-Type con su boundary (sirve para subir la fórmula).
            opciones.body = cuerpo;
        } else if (cuerpo !== undefined) {
            headers['Content-Type'] = 'application/json';
            opciones.body = JSON.stringify(cuerpo);
        }

        let respuesta;
        try {
            respuesta = await fetch(BASE + ruta, opciones);
        } catch (e) {
            throw new ApiError('No se pudo conectar con el servidor. Intenta de nuevo.', 0, null);
        }

        let datos = null;
        const texto = await respuesta.text();
        if (texto) {
            try { datos = JSON.parse(texto); } catch (e) { datos = { mensaje: texto }; }
        }

        if (!respuesta.ok) {
            // Con token y 401 la sesión venció: sesion.js escucha este evento y redirige al login.
            if (respuesta.status === 401 && token) {
                window.dispatchEvent(new CustomEvent('bv:sesion-expirada'));
            }
            const mensaje = (datos && (datos.mensaje || datos.error)) || ('Error ' + respuesta.status);
            throw new ApiError(mensaje, respuesta.status, datos);
        }
        return datos;
    }

    window.Api = {
        base: BASE,
        ApiError,
        request,
        get:   (ruta, params) => request('GET', ruta + consulta(params)),
        post:  (ruta, cuerpo) => request('POST', ruta, cuerpo === undefined ? {} : cuerpo),
        put:   (ruta, cuerpo) => request('PUT', ruta, cuerpo === undefined ? {} : cuerpo),
        patch: (ruta, cuerpo) => request('PATCH', ruta, cuerpo === undefined ? {} : cuerpo),
        del:   (ruta) => request('DELETE', ruta)
    };

    // ---------- Utilidades de formato ----------
    const formatoCOP = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    });

    window.BV = window.BV || {};

    // 890000 -> "$ 890.000"
    window.BV.moneda = (n) => formatoCOP.format(Number(n) || 0);

    // Escapa texto antes de meterlo en innerHTML (nombres, observaciones, etc.)
    window.BV.escapar = (valor) => String(valor === null || valor === undefined ? '' : valor)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
})();