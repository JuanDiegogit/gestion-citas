// src/integrations/atencionClinica.client.js
const axios = require('axios');
const {
  ATENCION_CLINICA_URL,
  ATENCION_CLINICA_PACIENTES_URL,
} = require('../config/env');

/*
  Helper genérico para hacer POST con manejo de errores coherente.
  Aquí usamos URLs completas (no baseURL + path).
 */
async function safePost(fullUrl, body, context = 'ATENCION_CLINICA') {
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
  Notifica una nueva cita a la API de Atención Clínica.
  Se está usando desde citas.service.js → notificarNuevaCita(...)
 */
async function notificarNuevaCita(payload) {
  // best-effort: si por alguna razón no hay URL configurada, solo logueamos
  if (!ATENCION_CLINICA_URL) {
    console.warn(
      '[ATENCION_CLINICA] ATENCION_CLINICA_URL no está configurada; no se enviará la notificación de cita.'
    );
    return;
  }

  return safePost(
    ATENCION_CLINICA_URL,
    payload,
    'ATENCION_CLINICA_NOTIFICAR_CITA'
  );
}

/*
  Sincroniza los datos de un paciente con la API de Atención Clínica.
  Se usa desde pacientes.service.js → sincronización "best-effort".
 
  payload esperado (lo arma pacientes.service.js):
  {
    nombre,
    apellidos,
    fecha_nacimiento,
    telefono,
    correo
  }
 */
async function sincronizarPaciente(paciente) {
  if (!ATENCION_CLINICA_PACIENTES_URL) {
    console.warn(
      '[ATENCION_CLINICA] ATENCION_CLINICA_PACIENTES_URL no está configurada; no se sincronizará el paciente.'
    );
    return;
  }

  // opcional: validación mínima
  if (!paciente || !paciente.nombre || !paciente.apellidos) {
    console.warn(
      '[ATENCION_CLINICA] Datos insuficientes para sincronizar paciente:',
      paciente
    );
    return;
  }

  return safePost(
    ATENCION_CLINICA_PACIENTES_URL,
    paciente,
    'ATENCION_CLINICA_SINCRONIZAR_PACIENTE'
  );
}

module.exports = {
  notificarNuevaCita,
  sincronizarPaciente,
};
