// src/integrations/caja.client.js
const axios = require('axios');
const { CAJA_BASE_URL } = require('../config/env');

/*
  Instancia de Axios para la API de Caja
  (un solo punto para configurar baseURL, timeout, headers, etc.)
 */
const http = axios.create({
  baseURL: CAJA_BASE_URL,
  timeout: 5000, // puedes ajustar este valor si lo necesitas
});

/*
  Helper genérico para POST a Caja con manejo de errores consistente.
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
 Helper genérico para GET a Caja con manejo de errores consistente.
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

/* ──────────────────────────────────────────────
   FUNCIONES ESPECÍFICAS DE LA API DE CAJA
   (ajusta los paths si en tu API usan otros)
   ────────────────────────────────────────────── 
  Registrar un paciente en la API de Caja.
  Equivale al POST /api/pacientes/registrar
 */
async function registrarPaciente(paciente) {
  // aquí NO validamos campos; esa validación es de tu servicio de Pacientes
  return safePost('/api/pacientes/registrar', paciente);
}

/*
 Crear un presupuesto en Caja.
 Equivale al POST /api/presupuestos/crear
 body esperado (según lo que ya usas en server.js):
   { idPaciente, tratamientos }
 */
async function crearPresupuesto({ idPaciente, tratamientos }) {
  if (!idPaciente || !Array.isArray(tratamientos) || tratamientos.length === 0) {
    const err = new Error('idPaciente y tratamientos son obligatorios para crear un presupuesto en Caja');
    err.statusCode = 400;
    throw err;
  }

  return safePost('/api/presupuestos/crear', { idPaciente, tratamientos });
}

/*
 Obtener saldo en Caja (si tu otra API ya expone este endpoint).
 Equivale al GET /api/caja/saldo?idPaciente=...
 */
async function obtenerSaldoCaja(idPaciente) {
  if (!idPaciente) {
    const err = new Error('idPaciente es obligatorio para consultar el saldo en Caja');
    err.statusCode = 400;
    throw err;
  }

  return safeGet('/api/caja/saldo', { idPaciente });
}

/*
 Bloquear un monto en Caja (reservar saldo, por ejemplo para anticipo).
 Equivale al POST /api/caja/bloquear-monto
 body esperado: { idPaciente, monto }
 */
async function bloquearMonto({ idPaciente, monto }) {
  if (!idPaciente || !monto || Number(monto) <= 0) {
    const err = new Error('idPaciente y monto (> 0) son obligatorios para bloquear monto en Caja');
    err.statusCode = 400;
    throw err;
  }

  return safePost('/api/caja/bloquear-monto', { idPaciente, monto });
}

module.exports = {
  registrarPaciente,
  crearPresupuesto,
  obtenerSaldoCaja,
  bloquearMonto,
};
