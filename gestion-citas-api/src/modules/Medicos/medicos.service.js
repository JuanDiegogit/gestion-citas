// src/modules/medicos/medicos.service.js
const medicosRepository = require('./medicos.repository');

/**
 * Devuelve la lista completa de médicos.
 */
async function listarMedicos() {
  const medicos = await medicosRepository.listarMedicos();
  return medicos;
}

/**
 * Detalle de un médico.
 */
async function obtenerMedico(idParam) {
  const id = parseInt(idParam, 10);
  if (Number.isNaN(id)) {
    const err = new Error('El id del médico debe ser un entero válido');
    err.statusCode = 400;
    throw err;
  }

  const medico = await medicosRepository.obtenerMedicoPorId(id);
  if (!medico) {
    const err = new Error('Médico no encontrado');
    err.statusCode = 404;
    throw err;
  }

  return medico;
}

/**
 * Crea un nuevo médico.
 */
async function crearMedico(payload) {
  const {
    nombre,
    apellidos,
    especialidad,
    cedula_profesional,
    activo,
  } = payload || {};

  if (!nombre || !apellidos) {
    const err = new Error('nombre y apellidos son obligatorios');
    err.statusCode = 400;
    throw err;
  }

  const medico = await medicosRepository.crearMedico({
    nombre,
    apellidos,
    especialidad: especialidad || null,
    cedula_profesional: cedula_profesional || null,
    activo: typeof activo === 'boolean' ? activo : true,
  });

  return medico;
}

module.exports = {
  listarMedicos,
  obtenerMedico,
  crearMedico,
};
//fin del documento