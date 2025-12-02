// src/modules/tratamientos/tratamientos.controller.js
const tratamientosService = require('./tratamientos.service');

/**
 * GET /tratamientos
 */
async function listarTratamientos(req, res, next) {
  try {
    const tratamientos = await tratamientosService.listarTratamientos();
    // El front espera { tratamientos: [...] }
    return res.json({ tratamientos });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /tratamientos/:id
 */
async function obtenerTratamiento(req, res, next) {
  try {
    const { id } = req.params;
    const tratamiento = await tratamientosService.obtenerTratamiento(id);
    return res.json({ tratamiento });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /tratamientos
 */
async function crearTratamiento(req, res, next) {
  try {
    const tratamiento = await tratamientosService.crearTratamiento(req.body);
    return res.status(201).json({ tratamiento });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listarTratamientos,
  obtenerTratamiento,
  crearTratamiento,
};
