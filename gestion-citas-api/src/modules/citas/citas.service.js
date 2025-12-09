// src/modules/citas/citas.service.js
const { pool } = require('../../config/db');
const { generarFolioCita } = require('../../utils/generarFolioCita');
const citasRepository = require('./citas.repository');
const atencionClinicaClient = require('../../integrations/atencionClinica.client');
const cajaClient = require('../../integrations/caja.client');

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
 * Helper para trabajar con transacciones MySQL.
 */
async function withTransaction(callback) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try {
      await conn.rollback();
    } catch (rbErr) {
      console.error('[SIGCD] Error al hacer rollback de la transacción:', rbErr);
    }
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Crea una cita (con o sin anticipo) y notifica a Atención Clínica.
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
  } = payload || {};

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
    if (
      !montoAnticipoNum ||
      Number.isNaN(montoAnticipoNum) ||
      montoAnticipoNum <= 0
    ) {
      const error = new Error(
        'monto_anticipo debe ser un número mayor que 0 cuando requiere_anticipo es true'
      );
      error.statusCode = 400;
      throw error;
    }
  }

  const fechaCitaStr = normalizarFechaCita(fecha_cita);

  if (!fechaCitaStr) {
    const error = new Error('fecha_cita no tiene un formato de fecha válido');
    error.statusCode = 400;
    throw error;
  }

  // ─────────────────────────────────────────────
  //  REGLAS DE NEGOCIO SOBRE CHOQUE DE HORARIOS
  // ─────────────────────────────────────────────
  const MIN_GAP_MINUTES = 120; // 2 horas

  // 1) El médico no puede tener otra cita en ±2 horas
  const conflictoMedico = await citasRepository.existeCitaEnRangoParaMedico(
    id_medico,
    fechaCitaStr,
    MIN_GAP_MINUTES,
    MIN_GAP_MINUTES
  );

  if (conflictoMedico) {
    const error = new Error(
      'El médico ya tiene una cita programada en un rango de 2 horas respecto a la fecha y hora seleccionadas.'
    );
    error.statusCode = 409; // conflicto
    throw error;
  }

  // 2) El paciente no puede tener otra cita exactamente a la misma hora
  const conflictoPaciente =
    await citasRepository.existeCitaMismaFechaParaPaciente(
      id_paciente,
      fechaCitaStr
    );

  if (conflictoPaciente) {
    const error = new Error(
      'El paciente ya tiene una cita registrada exactamente en esa fecha y hora.'
    );
    error.statusCode = 409;
    throw error;
  }

  const folio = generarFolioCita();

  const estadoCita = 'PROGRAMADA';
  const estadoPago = requiereAnticipoBool ? 'PENDIENTE' : 'SIN_PAGO';
  const montoCobro = requiereAnticipoBool ? montoAnticipoNum : null;

  const { id_cita, id_anticipo } = await withTransaction(async (conn) => {
    const id_cita = await citasRepository.crearCita(
      {
        folio_cita: folio,
        id_paciente,
        id_medico,
        id_tratamiento: id_tratamiento || null,
        fecha_cita: fechaCitaStr,
        medio_solicitud,
        motivo_cita,
        info_relevante,
        observaciones,
        responsable_registro: responsable_registro || 'SISTEMA',
        estado_cita: estadoCita,
        estado_pago: estadoPago,
        monto_cobro: montoCobro,
      },
      conn
    );

    let id_anticipo = null;
    if (requiereAnticipoBool && montoAnticipoNum && montoAnticipoNum > 0) {
      id_anticipo = await citasRepository.crearAnticipo(
        {
          id_cita,
          id_paciente,
          monto_anticipo: montoAnticipoNum,
          estado: 'PENDIENTE',
          id_pago_caja: null,
        },
        conn
      );
    }

    return { id_cita, id_anticipo };
  });

  // Notificación a Atención Clínica (best-effort, fuera de la transacción)
  try {
    await atencionClinicaClient.notificarNuevaCita({
      id_cita,
      folio_cita: folio,
      id_paciente,
      id_medico,
      id_tratamiento: id_tratamiento || null,
      fecha_cita: fechaCitaStr,
      medio_solicitud,
      motivo_cita: motivo_cita || null,
      info_relevante: info_relevante || null,
      observaciones: observaciones || null,
      responsable_registro: responsable_registro || 'SISTEMA',
      requiere_anticipo: requiereAnticipoBool,
      monto_anticipo: requiereAnticipoBool ? montoAnticipoNum || 0 : 0,
    });
  } catch (notifyErr) {
    console.error(
      '[SIGCD] Error al notificar nueva cita a ATENCIÓN CLÍNICA:',
      notifyErr.cause?.response?.data ||
        notifyErr.response?.data ||
        notifyErr.message ||
        notifyErr
    );
  }

  return {
    id_cita,
    folio_cita: folio,
    estado_cita: estadoCita,
    estado_pago: estadoPago,
    requiere_anticipo: requiereAnticipoBool,
    id_anticipo,
  };
}

/**
 * Listar citas (versión sin paginación).
 */
async function listarCitas(rawFilters) {
  const {
    fecha_desde,
    fecha_hasta,
    estado_cita,
    id_paciente,
    id_medico,
  } = rawFilters || {};

  let idPacienteNum = null;
  let idMedicoNum = null;

  if (id_paciente !== undefined && id_paciente !== '') {
    idPacienteNum = parseInt(id_paciente, 10);
    if (Number.isNaN(idPacienteNum)) {
      const err = new Error('El id_paciente debe ser un número entero válido');
      err.statusCode = 400;
      throw err;
    }
  }

  if (id_medico !== undefined && id_medico !== '') {
    idMedicoNum = parseInt(id_medico, 10);
    if (Number.isNaN(idMedicoNum)) {
      const err = new Error('El id_medico debe ser un número entero válido');
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
 * Listado RESUMEN de citas (para tabla del front y consumo de Caja).
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
  } = rawFilters || {};

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
 * Detalle de una cita (incluye paciente, médico, tratamiento, anticipo
 *  y saldo general del paciente consultado en Caja).
 */
async function obtenerDetalleCita(idRaw) {
  if (!/^\d+$/.test(String(idRaw))) {
    const err = new Error('El id de la cita debe ser un entero positivo');
    err.statusCode = 400;
    throw err;
  }

  const id = parseInt(idRaw, 10);

  const [rows] = await pool.query(
    `
    SELECT
      c.id_cita,
      c.folio_cita,
      c.fecha_registro,
      c.fecha_cita,
      c.estado_cita,
      c.estado_pago,
      c.monto_cobro,
      c.monto_pagado,
      c.saldo_pendiente,
      IFNULL(c.saldo_paciente, 0) AS saldo_paciente,
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
      t.precio_base      AS precio_base,
      t.duracion_min     AS duracion_min,
      a.id_anticipo,
      a.monto_anticipo,
      a.estado           AS estado_anticipo,
      a.id_pago_caja,
      a.fecha_solicitud,
      a.fecha_confirmacion
    FROM citas c
    INNER JOIN paciente p    ON p.id_paciente    = c.id_paciente
    INNER JOIN medico   m    ON m.id_medico      = c.id_medico
    INNER JOIN tratamiento t ON t.id_tratamiento = c.id_tratamiento
    LEFT JOIN anticipo_cita a ON a.id_cita       = c.id_cita
    WHERE c.id_cita = ?
    LIMIT 1
    `,
    [id]
  );

  if (!rows.length) {
    const err = new Error('Cita no encontrada');
    err.statusCode = 404;
    throw err;
  }

  const row = rows[0];

  const citaBase = {
    id_cita: row.id_cita,
    folio_cita: row.folio_cita,
    fecha_registro: row.fecha_registro,
    fecha_cita: row.fecha_cita,
    estado_cita: row.estado_cita,
    estado_pago: row.estado_pago,
    monto_pagado: row.monto_pagado,
    saldo_pendiente: row.saldo_pendiente,
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
      cve_trat: row.cve_trat,
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

  // ────────────────────────────────
  // Consultar saldo general en Caja
  // ────────────────────────────────
  let saldoPacienteCaja = null;
  try {
    saldoPacienteCaja = await cajaClient.obtenerSaldoPaciente(row.id_paciente);
  } catch (saldoErr) {
    console.error(
      '[SIGCD] Error consultando saldo del paciente en CAJA:',
      saldoErr.cause?.response?.data ||
        saldoErr.response?.data ||
        saldoErr.message ||
        saldoErr
    );
  }

  return {
    ...citaBase,
    saldo_paciente_caja: saldoPacienteCaja,
  };
}

/**
 * Confirmar el pago de una cita (lo llama CAJA).
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

  if (
    montoPagadoNum != null &&
    (Number.isNaN(montoPagadoNum) || montoPagadoNum < 0)
  ) {
    const err = new Error(
      'monto_pagado debe ser un número mayor o igual a 0'
    );
    err.statusCode = 400;
    throw err;
  }

  const { anticipo } = await withTransaction(async (conn) => {
    const anticipo = await citasRepository.obtenerAnticipoPendientePorCita(
      idCita,
      conn
    );

    if (anticipo) {
      await citasRepository.actualizarAnticipoComoPagado(
        anticipo.id_anticipo,
        id_pago,
        conn
      );
    }

    await citasRepository.actualizarCitaComoPagada(
      {
        id_cita: idCita,
        id_pago_caja: id_pago,
        monto_pagado: montoPagadoNum,
      },
      conn
    );

    return { anticipo };
  });

  return {
    message: 'Pago confirmado correctamente para la cita',
    id_cita: idCita,
    id_pago_caja: id_pago,
    origen: origen || 'CAJA',
    anticipo: anticipo
      ? {
          id_anticipo: anticipo.id_anticipo,
          id_cita: anticipo.id_cita,
          id_paciente: anticipo.id_paciente,
        }
      : null,
  };
}

const ESTADOS_CITA_VALIDOS = [
  'PROGRAMADA',
  'CONFIRMADA',
  'CANCELADA',
  'ATENDIDA',
];

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
  const updated = await citasRepository.actualizarEstadoCita(id, nuevoEstado);

  if (!updated) {
    const err = new Error('Cita no encontrada');
    err.statusCode = 404;
    throw err;
  }

  const cita = await obtenerDetalleCita(id);
  return cita;
}

async function iniciarAtencion(idCitaRaw) {
  return cambiarEstadoCita(idCitaRaw, 'CONFIRMADA');
}

async function marcarAtendida(idCitaRaw) {
  return cambiarEstadoCita(idCitaRaw, 'ATENDIDA');
}

/**
 * SIGCD → CAJA: registrar el cobro del anticipo en la API de Caja.
 */
async function registrarPagoAnticipoEnCaja(idCita) {
  const cita = await citasRepository.obtenerCitaPorId(idCita);

  if (!cita) {
    const err = new Error('Cita no encontrada');
    err.statusCode = 404;
    throw err;
  }

  if (cita.estado_pago === 'PAGADO') {
    const err = new Error('La cita ya tiene el pago registrado');
    err.statusCode = 400;
    throw err;
  }

  if (!cita.monto_cobro || Number(cita.monto_cobro) <= 0) {
    const err = new Error('La cita no tiene monto de cobro configurado');
    err.statusCode = 400;
    throw err;
  }

  const payloadCobro = {
    idCita: cita.id_cita,
    idPaciente: cita.id_paciente,
    monto: Number(cita.monto_cobro),
    metodoPago: 'EFECTIVO',
  };

  const resultadoCaja = await cajaClient.crearCobroEnCaja(payloadCobro);

  return {
    mensaje: resultadoCaja.timeout
      ? 'Cobro enviado a Caja (respuesta no confirmada; revisar en Caja).'
      : 'Cobro enviado a Caja correctamente',
    caja: resultadoCaja,
  };
}

// Normaliza la fecha/hora que viene del front (datetime-local)
// a un string 'YYYY-MM-DD HH:MM:SS' sin tocar timezones.
function normalizarFechaCita(fecha_cita) {
  if (!fecha_cita) return null;

  if (typeof fecha_cita === 'string') {
    let f = fecha_cita.trim();
    if (!f) return null;

    // Aceptar tanto "2025-12-05T16:00" como "2025-12-05 16:00"
    f = f.replace('T', ' ');

    // Si viene sin segundos, se los agregamos
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(f)) {
      f = `${f}:00`;
    }

    // Validación mínima de formato final
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(f)) {
      return null;
    }

    return f;
  }

  return null;
}

async function registrarPagoParcial(idCitaRaw, payload) {
  const { monto, id_pago_caja, origen = 'CAJA', observaciones } = payload || {};

  if (!/^\d+$/.test(String(idCitaRaw))) {
    const err = new Error('El id de la cita debe ser un entero positivo');
    err.statusCode = 400;
    throw err;
  }

  const idCita = parseInt(idCitaRaw, 10);

  const montoNum = Number(monto);
  if (!monto || Number.isNaN(montoNum) || montoNum <= 0) {
    const err = new Error('monto debe ser un número mayor que 0');
    err.statusCode = 400;
    throw err;
  }

  return withTransaction(async (conn) => {
    // 1) Leer cita actual
    const cita = await citasRepository.obtenerCitaPorId(idCita, conn);

    if (!cita) {
      const err = new Error('Cita no encontrada');
      err.statusCode = 404;
      throw err;
    }

    if (!cita.monto_cobro || Number(cita.monto_cobro) <= 0) {
      const err = new Error('La cita no tiene monto_cobro configurado');
      err.statusCode = 400;
      throw err;
    }

    const montoCobro = Number(cita.monto_cobro);
    const montoPagadoActual = Number(cita.monto_pagado || 0);

    const nuevoMontoPagado = montoPagadoActual + montoNum;
    const nuevoSaldo = montoCobro - nuevoMontoPagado;

    const saldoNormalizado = nuevoSaldo < 0 ? 0 : nuevoSaldo;

    let nuevoEstadoPago = 'PAGO_PARCIAL';
    if (saldoNormalizado === 0) {
      nuevoEstadoPago = 'PAGADO';
    }

    // 2) Insertar el pago en pagos_cita
    const id_pago_cita = await citasRepository.crearPagoCita(
      {
        id_cita: idCita,
        id_paciente: cita.id_paciente,
        monto: montoNum,
        origen,
        id_pago_caja: id_pago_caja || null,
        observaciones: observaciones || null,
      },
      conn
    );

    // 3) Actualizar montos acumulados de la cita
    await citasRepository.actualizarMontosCita(
      {
        id_cita: idCita,
        monto_pagado: nuevoMontoPagado,
        saldo_pendiente: saldoNormalizado,
        estado_pago: nuevoEstadoPago,
      },
      conn
    );

    return {
      message: 'Pago registrado correctamente',
      id_cita: idCita,
      id_pago_cita,
      estado_pago: nuevoEstadoPago,
      monto_pagado: nuevoMontoPagado,
      saldo_pendiente: saldoNormalizado,
    };
  });
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
  registrarPagoParcial,
};
// fin del documento