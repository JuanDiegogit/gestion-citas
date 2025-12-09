// src/config/env.js
require('dotenv').config();

const PORT = process.env.PORT || 3001;

const CAJA_BASE_URL =
  process.env.CAJA_BASE_URL || 'https://api-presupuesto.onrender.com';

const CAJA_SALDO_PACIENTE_URL =
  process.env.CAJA_SALDO_PACIENTE_URL ||
  'https://api-presupuesto.onrender.com/api/saldo';

const ATENCION_CLINICA_URL =
  process.env.ATENCION_CLINICA_URL ||
  'http://apiatencionclinica.rtakabinetsolutions.com/api/atencion';

const ATENCION_CLINICA_PACIENTES_URL =
  process.env.ATENCION_CLINICA_PACIENTES_URL ||
  'http://apiatencionclinica.rtakabinetsolutions.com/api/atencion/pacientes/sincronizar';

const ATENCION_CLINICA_TRATAMIENTOS_URL =
  process.env.ATENCION_CLINICA_TRATAMIENTOS_URL ||
  'http://apiatencionclinica.rtakabinetsolutions.com/api/atencion/integracion/tratamientos';

module.exports = {
  PORT,
  CAJA_BASE_URL,
  CAJA_SALDO_PACIENTE_URL,
  ATENCION_CLINICA_URL,
  ATENCION_CLINICA_PACIENTES_URL,
  ATENCION_CLINICA_TRATAMIENTOS_URL,
};
//fin del documento