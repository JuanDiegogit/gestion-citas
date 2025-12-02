// src/modules/pacientes/pacientes.controller.js
const pacientesService = require('./pacientes.service');

/**
 * GET /pacientes
 */
async function listarPacientes(req, res, next) {
  try {
    const resultado = await pacientesService.listarPacientes(req.query);
    return res.json(resultado);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /pacientes/:id
 */
async function obtenerPaciente(req, res, next) {
  try {
    const { id } = req.params;
    const paciente = await pacientesService.obtenerPaciente(id);
    return res.json(paciente);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /pacientes
 * Crea al paciente y dispara la sincronización con otros servicios.
 */
async function crearPaciente(req, res, next) {
  try {
    const paciente = await pacientesService.crearPaciente(req.body);
    return res.status(201).json({
      message: 'Paciente creado correctamente',
      ...paciente,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /pacientes/:id
 * Actualización parcial.
 */
async function actualizarPaciente(req, res, next) {
  try {
    const { id } = req.params;
    await pacientesService.actualizarPaciente(id, req.body);

    return res.json({
      message: 'Paciente actualizado correctamente',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listarPacientes,
  obtenerPaciente,
  crearPaciente,
  actualizarPaciente,
};
