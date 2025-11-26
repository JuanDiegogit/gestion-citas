// src/api/citasApi.js
import axios from 'axios';


const api = axios.create({
  baseURL: 'http://localhost:3001',
});

// ----- Citas -----
export async function fetchCitasResumen(params = {}) {
  const { data } = await api.get('/citas/resumen', { params });
  return data; // { total, page, pageSize, citas: [...] }
}

export async function fetchCitaDetalle(id) {
  const { data } = await api.get(`/citas/${id}`);
  return data.cita;
}

export async function iniciarAtencion(idCita) {
  const { data } = await api.post(`/citas/${idCita}/iniciar-atencion`);
  return data;
}

export async function marcarAtendida(idCita) {
  const { data } = await api.post(`/citas/${idCita}/atendida`);
  return data;
}

// crea una nueva cita
export async function crearCita(payload) {
  const res = await api.post('/citas', payload);
  return res.data; // { message, cita }
}


// ----- Pagos -----
// Confirma el pago de UNA cita concreta (usa /citas/:id/confirmar-pago)
export async function confirmarPago(idCita, idPagoCaja) {
  const payload = {
    id_pago: idPagoCaja,
  };
  const { data } = await api.post(`/citas/${idCita}/confirmar-pago`, payload);
  return data;
}


// --- PACIENTES ---
export async function getPacientes(params = {}) {
  // params puede incluir { page, pageSize, q, canal_preferente }
  const response = await api.get('/pacientes', { params });
  return response.data;
}

export async function getPaciente(id) {
  const response = await api.get(`/pacientes/${id}`);
  return response.data;
}


export async function crearPaciente(payload) {
  const response = await api.post('/pacientes', payload);
  return response.data;
}


export async function actualizarPaciente(id, payload) {
  const response = await api.put(`/pacientes/${id}`, payload);
  return response.data;
}

// Crear médico
export async function crearMedico(payload) {
  const { data } = await api.post('/medicos', payload);
  return data.medico; // el objeto que te regresó el backend
}

// ===== MÉDICOS =====

// Listar médicos
export async function getMedicos() {
  const { data } = await api.get('/medicos');
  // data = { medicos: [...] }
  return data.medicos;
}

// Obtener médico por id
export async function getMedico(id) {
  const { data } = await api.get(`/medicos/${id}`);
  // data = { medico: { ... } }
  return data.medico;
}

// ===== TRATAMIENTOS =====

export async function getTratamientos() {
  const { data } = await api.get('/tratamientos');
  // backend responde { tratamientos: [...] }
  return data.tratamientos;
}

export async function getTratamiento(id) {
  const { data } = await api.get(`/tratamientos/${id}`);
  // backend responde { tratamiento: { ... } }
  return data.tratamiento;
}

export async function crearTratamiento(payload) {
  const { data } = await api.post('/tratamientos', payload);
  return data.tratamiento;
}

export default api;
