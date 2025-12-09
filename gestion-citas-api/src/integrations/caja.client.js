// src/integrations/caja.client.js
const axios = require('axios');
const {
  CAJA_BASE_URL,
  CAJA_SALDO_PACIENTE_URL,
} = require('../config/env');

/*
  Instancia de Axios para la API de Caja
  (un solo punto para configurar baseURL, timeout, headers, etc.)
*/
const http = axios.create({
  baseURL: CAJA_BASE_URL,
  timeout: 2000, // puedes ajustar si lo necesitas
});

/*
  Helper genérico para POST a Caja (usando baseURL)
*/
async function safePost(path, body, options = {}) {
  try {
    const resp = await http.post(path, body, options);
    return resp.data;
  } catch (error) {
    const detalle = error.response?.data || error.message;
    console.error(`[CAJA] Error en POST ${path}:`, detalle);

    const err = new Error(`Error al comunicarse con CAJA (POST ${path})`);
    err.cause = error;
    err.statusCode = error.response?.status || 502;
    throw err;
  }
}

/*
  Helper genérico para GET a Caja (usando baseURL)
*/
async function safeGet(path, params = {}, options = {}) {
  try {
    const resp = await http.get(path, {
      ...options,
      params,
    });
    return resp.data;
  } catch (error) {
    const detalle = error.response?.data || error.message;
    console.error(`[CAJA] Error en GET ${path}:`, detalle);

    const err = new Error(`Error al comunicarse con CAJA (GET ${path})`);
    err.cause = error;
    err.statusCode = error.response?.status || 502;
    throw err;
  }
}

/*
  Helper para POST usando URL COMPLETA (para endpoints de integración)
*/
async function safePostFullUrl(fullUrl, body, context = 'CAJA') {
  try {
    const resp = await axios.post(fullUrl, body);
    return resp.data;
  } catch (error) {
    const detalle = error.response?.data || error.message;
    console.error(`[${context}] Error en POST ${fullUrl}:`, detalle);

    const err = new Error(`Error al comunicarse con ${context}`);
    err.cause = error;
    err.statusCode = error.response?.status || 502;
    throw err;
  }
}

/*
  Helper para GET usando URL COMPLETA (sin baseURL)
*/
async function safeGetFullUrl(fullUrl, context = 'CAJA') {
  try {
    const resp = await axios.get(fullUrl);
    return resp.data;
  } catch (error) {
    const detalle = error.response?.data || error.message;
    console.error(`[${context}] Error en GET ${fullUrl}:`, detalle);

    const err = new Error(`Error al comunicarse con ${context}`);
    err.cause = error;
    err.statusCode = error.response?.status || 502;
    throw err;
  }
}

/* ──────────────────────────────────────────────
   FUNCIONES ESPECÍFICAS DE LA API DE CAJA
   ────────────────────────────────────────────── */

/*
  Registrar un paciente en la API de Caja.
  En el proyecto de Caja actual:
  POST /api/pacientes
*/
async function registrarPaciente(paciente) {
  return safePost('/api/pacientes', paciente);
}

/*
  Crear un presupuesto en Caja.
  POST /api/presupuestos/crear

  body:
    { idPaciente, tratamientos }
*/
async function crearPresupuesto({ idPaciente, tratamientos }) {
  if (!idPaciente || !Array.isArray(tratamientos) || tratamientos.length === 0) {
    const err = new Error(
      'idPaciente y tratamientos son obligatorios para crear un presupuesto en Caja'
    );
    err.statusCode = 400;
    throw err;
  }

  return safePost('/api/presupuestos/crear', { idPaciente, tratamientos });
}

/*
  Obtener saldo del paciente usando la API de Caja.
  Caja expone: GET /api/saldo/:idPaciente
*/
async function obtenerSaldoPaciente(idPaciente) {
  if (!idPaciente) {
    const err = new Error(
      'idPaciente es obligatorio para consultar el saldo en Caja'
    );
    err.statusCode = 400;
    throw err;
  }

  const fullUrl = `${CAJA_SALDO_PACIENTE_URL}/${idPaciente}`;
  return safeGetFullUrl(fullUrl, 'CAJA_SALDO_PACIENTE');
}

/*
  Alias para no romper código antiguo que use "obtenerSaldoCaja"
*/
async function obtenerSaldoCaja(idPaciente) {
  return obtenerSaldoPaciente(idPaciente);
}

/*
  Bloquear un monto en Caja.
  (Solo si en el futuro crean este endpoint)
  POST /api/caja/bloquear-monto
  body: { idPaciente, monto }
*/
async function bloquearMonto({ idPaciente, monto }) {
  if (!idPaciente || !monto || Number(monto) <= 0) {
    const err = new Error(
      'idPaciente y monto (> 0) son obligatorios para bloquear monto en Caja'
    );
    err.statusCode = 400;
    throw err;
  }

  return safePost('/api/caja/bloquear-monto', { idPaciente, monto });
}

/*
  Crear un cobro en Caja.
  POST /api/cobros

  Maneja especialmente el timeout: si es ECONNABORTED,
  devolvemos un resultado "parcial" para no tronar SIGCD.
*/
async function crearCobroEnCaja({ idCita, idPaciente, monto, metodoPago }) {
  try {
    const resp = await http.post('/api/cobros', {
      idCita,
      idPaciente,
      monto,
      metodoPago,
    });

    return resp.data; // { mensaje, idCobro, ... }
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.warn(
        '[CAJA] Timeout esperando respuesta de /api/cobros; ' +
          'es probable que el cobro se haya creado correctamente en Caja.'
      );

      return {
        mensaje:
          'Cobro enviado a Caja (timeout al esperar la respuesta). Revisar en Caja si quedó registrado.',
        timeout: true,
      };
    }

    const detalle = error.response?.data || error.message;
    console.error('[CAJA] Error en POST /api/cobros:', detalle);

    const err = new Error('Error al comunicarse con CAJA (POST /api/cobros)');
    err.cause = error;
    err.statusCode = error.response?.status || 502;
    throw err;
  }
}

/*
  Sincronizar tratamiento con la API de Caja.
  POST /api/tratamientos/sync-desde-sigcd
*/
async function sincronizarTratamientoEnCaja(tratamiento) {
  if (!tratamiento || !tratamiento.nombre) {
    const err = new Error(
      'Tratamiento inválido: falta al menos el campo "nombre" para sincronizar en Caja'
    );
    err.statusCode = 400;
    throw err;
  }

  const payload = {
    tratamientos: [tratamiento],
  };

  return safePost('/api/tratamientos/sync-desde-sigcd', payload);
}

module.exports = {
  registrarPaciente,
  crearPresupuesto,
  obtenerSaldoPaciente,
  obtenerSaldoCaja,
  bloquearMonto,
  crearCobroEnCaja,
  sincronizarTratamientoEnCaja,
};
//fin del documento 