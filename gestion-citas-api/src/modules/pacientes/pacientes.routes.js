// src/modules/pacientes/pacientes.routes.js
const express = require('express');
const router = express.Router();
const pacientesController = require('./pacientes.controller');

// Listado paginado con filtros
router.get('/', pacientesController.listarPacientes);

// Detalle
router.get('/:id', pacientesController.obtenerPaciente);

// Crear
router.post('/', pacientesController.crearPaciente);

// Actualizar parcial
router.put('/:id', pacientesController.actualizarPaciente);

module.exports = router;
//fin del documento