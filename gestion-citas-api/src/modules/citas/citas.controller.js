// src/modules/citas/citas.controller.js
const citasService = require('./citas.service');

/**
 * POST /citas
 * Crea una nueva cita (con o sin anticipo).
 */
async function crearCita(req, res, next) {
  try {
    const resultado = await citasService.crearCita(req.body);

    return res.status(201).json({
      message: 'Cita creada correctamente',
      ...resultado,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /citas
 * Listado general de citas con filtros opcionales.
 * Filtros por querystring:
 *  - fecha_desde
 *  - fecha_hasta
 *  - estado_cita
 *  - id_paciente
 *  - id_medico
 */
async function listarCitas(req, res, next) {
  try {
    const citas = await citasService.listarCitas(req.query);
    return res.json(citas);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /citas/resumen
 * Listado resumido con paginación (para tablas en el front / integración con Caja).
 * Querystring:
 *  - id_paciente
 *  - id_medico
 *  - estado_cita
 *  - estado_pago
 *  - fecha_desde
 *  - fecha_hasta
 *  - page
 *  - pageSize
 */
async function listarResumenCitas(req, res, next) {
  try {
    const resultado = await citasService.listarResumenCitas(req.query);
    // resultado = { data: [...], pagination: { page, pageSize, total, totalPages } }
    const { data, pagination } = resultado;

    return res.json({
      total: pagination.total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      citas: data,
    });
  } catch (error) {
    next(error);
  }
}
/**
 * GET /citas/:id
 * Detalle completo de una cita (paciente, médico, tratamiento, anticipo).
 */
async function obtenerDetalleCita(req, res, next) {
  try {
    const { id } = req.params;
    const cita = await citasService.obtenerDetalleCita(id);
    // MUY IMPORTANTE: responder con { cita: ... } porque el front hace data.cita
    return res.json({ cita });
  } catch (error) {
    next(error);
  }
}

// POST /citas/:id/iniciar-atencion
// Cambia estado_cita a 'CONFIRMADA'
async function iniciarAtencion(req, res, next) {
  try {
    const { id } = req.params;
    const citaActualizada = await citasService.iniciarAtencion(id);

    return res.json({
      message: 'Cita marcada como CONFIRMADA (en atención)',
      cita: citaActualizada,
    });
  } catch (error) {
    next(error);
  }
}

// POST /citas/:id/atendida
// Cambia estado_cita a 'ATENDIDA'
async function marcarAtendida(req, res, next) {
  try {
    const { id } = req.params;
    const citaActualizada = await citasService.marcarAtendida(id);

    return res.json({
      message: 'Cita marcada como ATENDIDA',
      cita: citaActualizada,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /citas/:id/confirmar-pago
 * Endpoint llamado por CAJA para confirmar un pago de la cita.
 * Body esperado:
 *  - id_pago     (obligatorio)
 *  - monto_pagado (opcional)
 *  - origen       (opcional, ej. 'CAJA')
 */
async function confirmarPagoCita(req, res, next) {
  try {
    const { id } = req.params;
    const resultado = await citasService.confirmarPagoCita(id, req.body);

    return res.json({
      message: 'Pago confirmado correctamente',
      ...resultado,
    });
  } catch (error) {
    next(error);
  }
}

async function registrarPagoAnticipoEnCaja(req, res, next) {
  try {
    const idCita = parseInt(req.params.id_cita, 10);

    if (Number.isNaN(idCita)) {
      return res.status(400).json({ error: 'ID de cita inválido' });
    }

    const resultado = await citasService.registrarPagoAnticipoEnCaja(idCita);

    return res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  crearCita,
  listarCitas,
  listarResumenCitas,
  obtenerDetalleCita,
  confirmarPagoCita,
  iniciarAtencion,
  marcarAtendida,
  registrarPagoAnticipoEnCaja,
};
//Fin del documento