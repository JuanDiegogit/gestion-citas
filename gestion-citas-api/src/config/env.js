// src/config/env.js
require('dotenv').config();

const PORT = process.env.PORT || 3001;

const CAJA_BASE_URL =
  process.env.CAJA_BASE_URL || 'https://api-presupuesto.onrender.com';

const ATENCION_CLINICA_URL =
  process.env.ATENCION_CLINICA_URL ||
  'http://apiatencionclinica.rtakabinetsolutions.com/api/atencion/notificaciones-cita';

const ATENCION_CLINICA_PACIENTES_URL =
  process.env.ATENCION_CLINICA_PACIENTES_URL ||
  'http://apiatencionclinica.rtakabinetsolutions.com/api/atencion/pacientes/sincronizar';

module.exports = {
  PORT,
  CAJA_BASE_URL,
  ATENCION_CLINICA_URL,
  ATENCION_CLINICA_PACIENTES_URL,
};
//fin del documento