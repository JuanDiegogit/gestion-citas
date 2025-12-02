// src/modules/tratamientos/tratamientos.routes.js
const express = require('express');
const router = express.Router();
const tratamientosController = require('./tratamientos.controller');

// Listar tratamientos
router.get('/', tratamientosController.listarTratamientos);

// Detalle de tratamiento
router.get('/:id', tratamientosController.obtenerTratamiento);

// Crear tratamiento
router.post('/', tratamientosController.crearTratamiento);

module.exports = router;
