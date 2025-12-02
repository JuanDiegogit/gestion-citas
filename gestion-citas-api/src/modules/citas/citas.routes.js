// src/modules/citas/citas.routes.js
const express = require('express');
const router = express.Router();
const citasController = require('./citas.controller');

// POST /citas
// Crea una nueva cita (con o sin anticipo)
router.post('/', citasController.crearCita);

// GET /citas
// Listado general de citas con filtros opcionales
router.get('/', citasController.listarCitas);

// IMPORTANTE: rutas más específicas ANTES de '/:id'

// GET /citas/resumen
// Listado resumido paginado (para front y Caja)
router.get('/resumen', citasController.listarResumenCitas);

// GET /citas/:id
// Detalle completo de una cita
router.get('/:id', citasController.obtenerDetalleCita);

// POST /citas/:id/confirmar-pago
// Confirmar pago de la cita (lo llama Caja)
router.post('/:id/confirmar-pago', citasController.confirmarPagoCita);

module.exports = router;
