// src/modules/medicos/medicos.routes.js
const express = require('express');
const router = express.Router();
const medicosController = require('./medicos.controller');

// Listar médicos
router.get('/', medicosController.listarMedicos);

// Detalle de médico
router.get('/:id', medicosController.obtenerMedico);

// Crear médico
router.post('/', medicosController.crearMedico);

module.exports = router;
//fin del documento