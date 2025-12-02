// src/modules/medicos/medicos.controller.js
const medicosService = require('./medicos.service');

/**
 * GET /medicos
 */
async function listarMedicos(req, res, next) {
  try {
    const medicos = await medicosService.listarMedicos();
    // El front espera { medicos: [...] }
    return res.json({ medicos });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /medicos/:id
 */
async function obtenerMedico(req, res, next) {
  try {
    const { id } = req.params;
    const medico = await medicosService.obtenerMedico(id);
    return res.json({ medico });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /medicos
 */
async function crearMedico(req, res, next) {
  try {
    const medico = await medicosService.crearMedico(req.body);
    return res.status(201).json({ medico });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listarMedicos,
  obtenerMedico,
  crearMedico,
};
//fin del documento