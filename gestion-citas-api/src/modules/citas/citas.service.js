// src/modules/citas/citas.service.js
const { sql, poolPromise } = require('../../db');
const { generarFolioCita } = require('../../utils/generarFolioCita');
const citasRepository = require('./citas.repository');
const atencionClinicaClient = require('../../integrations/atencionClinica.client');

/**
 * Normaliza un valor booleano que puede venir como:
 *  true / false / "true" / "false" / 1 / "1" / 0 / "0"
 */
function toBoolean(value) {
  if (value === true || value === false) return value;
  if (value === 1 || value === '1') return true;
  if (value === 0 || value === '0') return false;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value.toLowerCase() === 'on';
  }
  return false;
}

/**
 * Crea una cita (con o sin anticipo) y notifica a Atención Clínica.
 * Devuelve los datos que el controller mandará al front.
 */
async function crearCita(payload) {
  const {
    id_paciente,
    id_medico,
    id_tratamiento,
    fecha_cita,
    medio_solicitud,
    motivo_cita,
    info_relevante,
    observaciones,
    responsable_registro,
    requiere_anticipo,
    monto_anticipo,
  } = payload;

  // Validación de negocio básica
  if (!id_paciente || !id_medico || !fecha_cita || !medio_solicitud) {
    const error = new Error(
      'id_paciente, id_medico, fecha_cita y medio_solicitud son obligatorios'
    );
    error.statusCode = 400;
    throw error;
  }

  const requiereAnticipoBool = toBoolean(requiere_anticipo);
  const montoAnticipoNum =
    monto_anticipo != null && monto_anticipo !== ''
      ? Number(monto_anticipo)
      : null;

  if (requiereAnticipoBool) {
    if (!montoAnticipoNum || Number.isNaN(montoAnticipoNum) || montoAnticipoNum <= 0) {
      const error = new Error(
        'monto_anticipo debe ser un número mayor que 0 cuando requiere_anticipo es true'
      );
      error.statusCode = 400;
      throw error;
    }
  }

  const fechaCitaDate = new Date(fecha_cita);
  if (Number.isNaN(fechaCitaDate.getTime())) {
    const error = new Error('fecha_cita no tiene un formato de fecha válido');
    error.statusCode = 400;
    throw error;
  }

  const folio = generarFolioCita();
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  const estadoCita = 'PROGRAMADA';
  const estadoPago = requiereAnticipoBool ? 'PENDIENTE' : 'SIN_PAGO';
  const montoCobro = requiereAnticipoBool ? montoAnticipoNum : null;

  try {
    await transaction.begin();

    // 1) Insertar Cita
    const id_cita = await citasRepository.crearCita(
      {
        folio_cita: folio,
        id_paciente,
        id_medico,
        id_tratamiento,
        fecha_cita: fechaCitaDate,
        medio_solicitud,
        motivo_cita,
        info_relevante,
        observaciones,
        responsable_registro,
        estado_cita: estadoCita,
        estado_pago: estadoPago,
        monto_cobro: montoCobro,
      },
      transaction
    );

    // 2) (Opcional) Insertar Anticipo
    let id_anticipo = null;
    if (requiereAnticipoBool && montoAnticipoNum && montoAnticipoNum > 0) {
      id_anticipo = await citasRepository.crearAnticipo(
        {
          id_cita,
          id_paciente,
          monto_anticipo: montoAnticipoNum,
        },
        transaction
      );
    }

    // 3) Commit
    await transaction.commit();

    // 4) Notificar a Atención Clínica (fuera de la transacción)
    await atencionClinicaClient.notificarNuevaCita({
      id_cita,
      folio_cita: folio,
      id_paciente,
      id_medico,
      id_tratamiento: id_tratamiento || null,
      fecha_cita: fechaCitaDate,
      medio_solicitud,
      motivo_cita: motivo_cita || null,
      info_relevante: info_relevante || null,
      observaciones: observaciones || null,
      responsable_registro: responsable_registro || 'SISTEMA',
      requiere_anticipo: requiereAnticipoBool,
      monto_anticipo: requiereAnticipoBool ? montoAnticipoNum || 0 : 0,
    });

    return {
      id_cita,
      folio_cita: folio,
      estado_cita: estadoCita,
      estado_pago: estadoPago,
      requiere_anticipo: requiereAnticipoBool,
      id_anticipo,
    };
  } catch (err) {
    try {
      await transaction.rollback();
    } catch (rbErr) {
      console.error('Error en rollback crearCita:', rbErr);
    }
    throw err;
  }
}

/**
 * Listar citas con filtros similares a tu endpoint actual /citas.
 */
async function listarCitas(rawFilters) {
  const {
    fecha_desde,
    fecha_hasta,
    estado_cita,
    id_paciente,
    id_medico,
  } = rawFilters;

  let idPacienteNum = null;
  let idMedicoNum = null;

  if (id_paciente !== undefined && id_paciente !== '') {
    idPacienteNum = parseInt(id_paciente, 10);
    if (Number.isNaN(idPacienteNum)) {
      const err = new Error(
        'El id_paciente debe ser un número entero válido'
      );
      err.statusCode = 400;
      throw err;
    }
  }

  if (id_medico !== undefined && id_medico !== '') {
    idMedicoNum = parseInt(id_medico, 10);
    if (Number.isNaN(idMedicoNum)) {
      const err = new Error(
        'El id_medico debe ser un número entero válido'
      );
      err.statusCode = 400;
      throw err;
    }
  }

  const filtrosNormalizados = {
    fechaDesde: fecha_desde ? new Date(fecha_desde) : null,
    fechaHasta: fecha_hasta ? new Date(fecha_hasta) : null,
    estadoCita: estado_cita || null,
    idPaciente: idPacienteNum,
    idMedico: idMedicoNum,
  };

  const citas = await citasRepository.listarCitas(filtrosNormalizados);
  return citas;
}

/**
 * Listado RESUMEN de citas (para listas del front y para CAJA),
 * equivalente a tu GET /citas/resumen actual pero encapsulado en el service.
 */
async function listarResumenCitas(rawFilters) {
  const {
    id_paciente,
    id_medico,
    estado_cita,
    estado_pago,
    fecha_desde,
    fecha_hasta,
    page = 1,
    pageSize = 20,
  } = rawFilters;

  const idPacienteNum =
    id_paciente != null && id_paciente !== '' ? parseInt(id_paciente, 10) : null;
  const idMedicoNum =
    id_medico != null && id_medico !== '' ? parseInt(id_medico, 10) : null;

  if (idPacienteNum !== null && Number.isNaN(idPacienteNum)) {
    const err = new Error('id_paciente debe ser un entero válido');
    err.statusCode = 400;
    throw err;
  }

  if (idMedicoNum !== null && Number.isNaN(idMedicoNum)) {
    const err = new Error('id_medico debe ser un entero válido');
    err.statusCode = 400;
    throw err;
  }

  const filtros = {
    idPaciente: idPacienteNum,
    idMedico: idMedicoNum,
    estadoCita: estado_cita || null,
    estadoPago: estado_pago || null,
    fechaDesde: fecha_desde ? new Date(fecha_desde) : null,
    fechaHasta: fecha_hasta ? new Date(fecha_hasta) : null,
  };

  const paging = {
    page: parseInt(page, 10) || 1,
    pageSize: parseInt(pageSize, 10) || 20,
  };

  const resultado = await citasRepository.listarResumenCitas(filtros, paging);
  return resultado;
}

/**
 * Detalle de una cita (GET /citas/:id en tu server actual).
 */
async function obtenerDetalleCita(idRaw) {
  if (!/^\d+$/.test(String(idRaw))) {
    const err = new Error('El id de la cita debe ser un entero positivo');
    err.statusCode = 400;
    throw err;
  }

  const id = parseInt(idRaw, 10);
  const pool = await poolPromise;
  const request = pool.request();

  request.input('id_cita', sql.Int, id);

  const query = `
    SELECT
      c.id_cita,
      c.folio_cita,
      c.fecha_registro,
      c.fecha_cita,
      c.estado_cita,
      c.estado_pago,
      c.monto_cobro,
      ISNULL(c.saldo_paciente, 0) AS saldo_paciente,
      p.id_paciente,
      p.nombre           AS nombre_paciente,
      p.apellidos        AS apellidos_paciente,
      p.telefono         AS telefono_paciente,
      p.email            AS email_paciente,
      p.canal_preferente AS canal_preferente,
      m.id_medico,
      m.nombre           AS nombre_medico,
      m.apellidos        AS apellidos_medico,
      m.especialidad,
      m.cedula_profesional,
      t.id_tratamiento,
      t.cve_trat,
      t.nombre           AS nombre_tratamiento,
      t.descripcion      AS descripcion_tratamiento,
      t.precio_base,
      t.duracion_min,
      a.id_anticipo,
      a.monto_anticipo,
      a.estado          AS estado_anticipo,
      a.id_pago_caja,
      a.fecha_solicitud,
      a.fecha_confirmacion
    FROM Cita c
    INNER JOIN Paciente p ON p.id_paciente = c.id_paciente
    INNER JOIN Medico   m ON m.id_medico   = c.id_medico
    INNER JOIN Tratamiento t ON t.id_tratamiento = c.id_tratamiento
    LEFT JOIN AnticipoCita a ON a.id_cita = c.id_cita
    WHERE c.id_cita = @id_cita;
  `;

  const result = await request.query(query);

  if (result.recordset.length === 0) {
    const err = new Error('Cita no encontrada');
    err.statusCode = 404;
    throw err;
  }

  const row = result.recordset[0];

  const cita = {
    id_cita: row.id_cita,
    folio_cita: row.folio_cita,
    fecha_registro: row.fecha_registro,
    fecha_cita: row.fecha_cita,
    estado_cita: row.estado_cita,
    estado_pago: row.estado_pago,
    monto_cobro: row.monto_cobro,
    saldo_paciente: row.saldo_paciente,
    paciente: {
      id_paciente: row.id_paciente,
      nombre: row.nombre_paciente,
      apellidos: row.apellidos_paciente,
      telefono: row.telefono_paciente,
      email: row.email_paciente,
      canal_preferente: row.canal_preferente,
    },
    medico: {
      id_medico: row.id_medico,
      nombre: row.nombre_medico,
      apellidos: row.apellidos_medico,
      especialidad: row.especialidad,
      cedula_profesional: row.cedula_profesional,
    },
    tratamiento: {
      id_tratamiento: row.id_tratamiento,
      clave: row.cve_trat,
      nombre: row.nombre_tratamiento,
      descripcion: row.descripcion_tratamiento,
      precio_base: row.precio_base,
      duracion_min: row.duracion_min,
    },
    anticipo: row.id_anticipo
      ? {
          id_anticipo: row.id_anticipo,
          monto_anticipo: row.monto_anticipo,
          estado: row.estado_anticipo,
          id_pago_caja: row.id_pago_caja,
          fecha_solicitud: row.fecha_solicitud,
          fecha_confirmacion: row.fecha_confirmacion,
        }
      : null,
  };

  return cita;
}

/**
 * Confirmar el pago de una cita (lo que hoy tienes en POST /citas/:id/confirmar-pago).
 */
async function confirmarPagoCita(idCitaRaw, payload) {
  const { id_pago, monto_pagado, origen } = payload || {};

  if (!/^\d+$/.test(String(idCitaRaw))) {
    const err = new Error('El id de la cita debe ser un entero positivo');
    err.statusCode = 400;
    throw err;
  }

  if (!id_pago) {
    const err = new Error('id_pago es obligatorio para confirmar el pago');
    err.statusCode = 400;
    throw err;
  }

  const idCita = parseInt(idCitaRaw, 10);
  const montoPagadoNum =
    monto_pagado != null && monto_pagado !== ''
      ? Number(monto_pagado)
      : null;

  if (montoPagadoNum != null && (Number.isNaN(montoPagadoNum) || montoPagadoNum < 0)) {
    const err = new Error('monto_pagado debe ser un número mayor o igual a 0');
    err.statusCode = 400;
    throw err;
  }

  const pool = await poolPromise;
  let transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    // 1) Buscar anticipo pendiente (si lo hay)
    const anticipo = await citasRepository.obtenerAnticipoPendientePorCita(
      idCita,
      transaction
    );

    // 2) Si hay anticipo pendiente, marcarlo como PAGADO
    if (anticipo) {
      await citasRepository.actualizarAnticipoComoPagado(
        anticipo.id_anticipo,
        id_pago,
        transaction
      );
    }

    // 3) Actualizar Cita -> PAGADO
    await citasRepository.actualizarCitaComoPagada(
      {
        id_cita: idCita,
        id_pago_caja: id_pago,
        monto_pagado: montoPagadoNum,
      },
      transaction
    );

    await transaction.commit();
    transaction = null;

    return {
      message: 'Pago confirmado correctamente para la cita',
      id_cita: idCita,
      id_pago_caja: id_pago,
      origen: origen || 'CAJA',
      anticipo: anticipo
        ? {
            id_anticipo: anticipo.id_anticipo,
            id_cita: idCita,
            id_paciente: anticipo.id_paciente,
          }
        : null,
    };
  } catch (err) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rbErr) {
        console.error('Error al hacer rollback en confirmarPagoCita:', rbErr);
      }
    }
    throw err;
  }
}

const ESTADOS_CITA_VALIDOS = ['PROGRAMADA', 'CONFIRMADA', 'CANCELADA', 'ATENDIDA'];

async function cambiarEstadoCita(idRaw, nuevoEstado) {
  if (!/^\d+$/.test(String(idRaw))) {
    const err = new Error('El id de la cita debe ser un entero positivo');
    err.statusCode = 400;
    throw err;
  }

  if (!ESTADOS_CITA_VALIDOS.includes(nuevoEstado)) {
    const err = new Error(`Estado de cita no válido: ${nuevoEstado}`);
    err.statusCode = 400;
    throw err;
  }

  const id = parseInt(idRaw, 10);
  const cita = await citasRepository.actualizarEstadoCita(id, nuevoEstado);

  if (!cita) {
    const err = new Error('Cita no encontrada');
    err.statusCode = 404;
    throw err;
  }

  return cita;
}

async function iniciarAtencion(idCitaRaw) {
  // Para tu modelo de datos, usaré CONFIRMADA como "en atención"
  return cambiarEstadoCita(idCitaRaw, 'CONFIRMADA');
}

async function marcarAtendida(idCitaRaw) {
  return cambiarEstadoCita(idCitaRaw, 'ATENDIDA');
}


module.exports = {
  crearCita,
  listarCitas,
  listarResumenCitas,
  obtenerDetalleCita,
  confirmarPagoCita,
  iniciarAtencion,
  marcarAtendida,
};