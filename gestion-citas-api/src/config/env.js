// src/config/env.js
require('dotenv').config();

const PORT = process.env.PORT || 3001;

const CAJA_BASE_URL =
  process.env.CAJA_BASE_URL || 'http://192.168.25.70:3002';

const ATENCION_CLINICA_URL =
  process.env.ATENCION_CLINICA_URL ||
  'http://192.168.24.166:3000/api/atencion/notificaciones-cita';

const ATENCION_CLINICA_PACIENTES_URL =
  process.env.ATENCION_CLINICA_PACIENTES_URL ||
  'http://192.168.24.166:3000/api/atencion/pacientes/sincronizar';

module.exports = {
  PORT,
  CAJA_BASE_URL,
  ATENCION_CLINICA_URL,
  ATENCION_CLINICA_PACIENTES_URL,
};
//fin del documento