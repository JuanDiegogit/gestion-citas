// src/api/citasApi.js
import axios from 'axios';

// Instancia base de Axios apuntando a tu API de SIGCD
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

// ====================== C I T A S ======================

/**
 * Obtiene el resumen paginado de citas.
 * params puede incluir:
 *  - page, pageSize
 *  - estado_cita
 *  - id_medico
 *  - fecha_desde, fecha_hasta
 */
export async function fetchCitasResumen(params = {}) {
  const { data } = await api.get('/citas/resumen', { params });
  // data = { total, page, pageSize, citas: [...] }
  return data;
}

/**
 * Detalle de una cita específica.
 * Devuelve el objeto cita completo:
 * { cita: { ... } } → retornamos solo data.cita
 */
export async function fetchCitaDetalle(id) {
  const { data } = await api.get(`/citas/${id}`);
  return data.cita;
}

/**
 * Marca una cita como "en atención".
 */
export async function iniciarAtencion(idCita) {
  const { data } = await api.post(`/citas/${idCita}/iniciar-atencion`);
  return data;
}

/**
 * Marca una cita como "ATENDIDA".
 */
export async function marcarAtendida(idCita) {
  const { data } = await api.post(`/citas/${idCita}/atendida`);
  return data;
}

/**
 * Crear una nueva cita.
 * payload: { id_paciente, id_medico, id_tratamiento, fecha_cita, ... }
 */
export async function crearCita(payload) {
  const { data } = await api.post('/citas', payload);
  // se asume data = { message, cita }
  return data;
}

/**
 * Registrar un pago parcial asociado a una cita.
 * payload: { monto, id_pago_caja?, origen?, observaciones? }
 * backend responde, por ejemplo:
 * {
 *   message,
 *   estado_pago,
 *   monto_pagado,
 *   saldo_pendiente
 * }
 */
export async function registrarPagoParcial(idCita, payload) {
  const { data } = await api.post(`/citas/${idCita}/pagos`, payload);
  return data;
}

// =================== P A G O S  /  C A J A ===================

/**
 * Confirmar el pago de una cita contra un id_pago en Caja.
 * Usa el endpoint /citas/:id/confirmar-pago
 */
export async function confirmarPago(idCita, idPagoCaja) {
  const payload = { id_pago: idPagoCaja };
  const { data } = await api.post(`/citas/${idCita}/confirmar-pago`, payload);
  return data;
}

/**
 * Obtener el saldo del paciente en el sistema de Caja (vía SIGCD).
 * Endpoint: GET /pacientes/:idPaciente/saldo-caja
 * Se asume que el backend ya normaliza los nombres a algo como:
 * {
 *   totalTratamientos,
 *   totalPagado,
 *   saldoPendiente
 * }
 * y retornamos data tal cual.
 */
export async function obtenerSaldoPacienteCaja(idPaciente) {
  const { data } = await api.get(`/pacientes/${idPaciente}/saldo-caja`);
  return data;
}

/**
 * Registrar el cobro del anticipo de una cita directamente en Caja
 * desde SIGCD.
 * Endpoint: POST /citas/:idCita/registrar-pago-anticipo-caja
 *
 * La respuesta puede ser algo como:
 * {
 *   mensaje,
 *   caja: { mensaje, idCobro, ... }
 * }
 */
export async function registrarPagoAnticipoEnCaja(idCita) {
  try {
    const { data } = await api.post(
      `/citas/${idCita}/registrar-pago-anticipo-caja`
    );
    return data;
  } catch (error) {
    // Error de servidor con respuesta JSON
    if (error.response && error.response.data) {
      const errData = error.response.data;
      throw new Error(
        errData.error ||
          errData.mensaje ||
          'Error registrando pago en Caja'
      );
    }

    // Error de red / timeout, etc.
    throw new Error('Error registrando pago en Caja');
  }
}

// =================== P A C I E N T E S ===================

/**
 * Listado paginado de pacientes.
 * params puede incluir { page, pageSize, q, canal_preferente }
 */
export async function getPacientes(params = {}) {
  const { data } = await api.get('/pacientes', { params });
  return data;
}

/**
 * Detalle de un paciente.
 */
export async function getPaciente(id) {
  const { data } = await api.get(`/pacientes/${id}`);
  return data;
}

/**
 * Crear un paciente.
 */
export async function crearPaciente(payload) {
  const { data } = await api.post('/pacientes', payload);
  return data;
}

/**
 * Actualizar un paciente.
 */
export async function actualizarPaciente(id, payload) {
  const { data } = await api.put(`/pacientes/${id}`, payload);
  return data;
}

// ====================== M É D I C O S ======================

/**
 * Crear médico.
 */
export async function crearMedico(payload) {
  const { data } = await api.post('/medicos', payload);
  // se asume data = { medico: {...} }
  return data.medico;
}

/**
 * Listar médicos.
 */
export async function getMedicos() {
  const { data } = await api.get('/medicos');
  // data = { medicos: [...] }
  return data.medicos;
}

/**
 * Obtener médico por id.
 */
export async function getMedico(id) {
  const { data } = await api.get(`/medicos/${id}`);
  // data = { medico: {...} }
  return data.medico;
}

// =================== T R A T A M I E N T O S ===================

/**
 * Listar tratamientos.
 */
export async function getTratamientos() {
  const { data } = await api.get('/tratamientos');
  // data = { tratamientos: [...] }
  return data.tratamientos;
}

/**
 * Obtener tratamiento por id.
 */
export async function getTratamiento(id) {
  const { data } = await api.get(`/tratamientos/${id}`);
  // data = { tratamiento: {...} }
  return data.tratamiento;
}

/**
 * Crear tratamiento.
 */
export async function crearTratamiento(payload) {
  const { data } = await api.post('/tratamientos', payload);
  // data = { tratamiento: {...} }
  return data.tratamiento;
}

// Export default por si lo necesitas en algún punto
export default api;
//fin del documento