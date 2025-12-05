// src/modules/citas/citas.repository.js
const { pool } = require('../../config/db');

// Si viene una conexión de transacción la usamos, si no, usamos el pool global
function getConn(conn) {
  return conn || pool;
}

/**
 * Crear una cita.
 * Tabla `citas`:
 *  - folio_cita, id_paciente, id_medico, id_tratamiento (NULL),
 *  - fecha_cita, medio_solicitud, motivo_cita, info_relevante,
 *  - observaciones, responsable_registro,
 *  - estado_cita, estado_pago, monto_cobro
 */
async function crearCita(datos, conn) {
  const db = getConn(conn);

  const {
    folio_cita,
    id_paciente,
    id_medico,
    id_tratamiento = null,
    fecha_cita,
    medio_solicitud,
    motivo_cita = null,
    info_relevante = null,
    observaciones = null,
    responsable_registro = 'SISTEMA',
    estado_cita,
    estado_pago,
    monto_cobro = null,
  } = datos;

  const sql = `
    INSERT INTO citas (
      folio_cita,
      id_paciente,
      id_medico,
      id_tratamiento,
      fecha_cita,
      medio_solicitud,
      motivo_cita,
      info_relevante,
      observaciones,
      responsable_registro,
      estado_cita,
      estado_pago,
      monto_cobro
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    folio_cita,
    id_paciente,
    id_medico,
    id_tratamiento,
    fecha_cita,
    medio_solicitud,
    motivo_cita,
    info_relevante,
    observaciones,
    responsable_registro,
    estado_cita,
    estado_pago,
    monto_cobro,
  ];

  const [result] = await db.query(sql, params);
  return result.insertId; // id_cita
}

/**
 * Inserta un anticipo en `anticipo_cita`.
 */
async function crearAnticipo(
  { id_cita, id_paciente, monto_anticipo, estado = 'PENDIENTE', id_pago_caja = null },
  conn
) {
  const db = getConn(conn);

  const sql = `
    INSERT INTO anticipo_cita (
      id_cita,
      id_paciente,
      monto_anticipo,
      estado,
      id_pago_caja,
      fecha_solicitud
    )
    VALUES (?, ?, ?, ?, ?, NOW())
  `;

  const params = [
    id_cita,
    id_paciente,
    monto_anticipo,
    estado,
    id_pago_caja,
  ];

  const [result] = await db.query(sql, params);
  return result.insertId; // id_anticipo
}

/**
 * Listado general de citas SIN paginación, con filtros básicos.
 */
async function listarCitas({ fechaDesde, fechaHasta, estadoCita, idPaciente, idMedico }) {
  const db = getConn();

  const where = [];
  const params = [];

  if (fechaDesde) {
    where.push('c.fecha_cita >= ?');
    params.push(fechaDesde);
  }
  if (fechaHasta) {
    where.push('c.fecha_cita <= ?');
    params.push(fechaHasta);
  }
  if (estadoCita) {
    where.push('c.estado_cita = ?');
    params.push(estadoCita);
  }
  if (idPaciente) {
    where.push('c.id_paciente = ?');
    params.push(idPaciente);
  }
  if (idMedico) {
    where.push('c.id_medico = ?');
    params.push(idMedico);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const sql = `
    SELECT
      c.id_cita,
      c.folio_cita,
      c.fecha_cita,
      c.estado_cita,
      c.estado_pago,
      c.monto_cobro,
      p.id_paciente,
      p.nombre    AS nombre_paciente,
      p.apellidos AS apellidos_paciente,
      m.id_medico,
      m.nombre    AS nombre_medico,
      m.apellidos AS apellidos_medico
    FROM citas c
    INNER JOIN paciente p ON p.id_paciente = c.id_paciente
    INNER JOIN medico   m ON m.id_medico   = c.id_medico
    ${whereSql}
    ORDER BY c.fecha_cita DESC
  `;

  const [rows] = await db.query(sql, params);
  return rows;
}

/**
 * Listado RESUMEN con paginación.
 */
async function listarResumenCitas(filtros, paginacion) {
  const db = getConn();

  const {
    idPaciente,
    idMedico,
    estadoCita,
    estadoPago,
    fechaDesde,
    fechaHasta,
  } = filtros;

  const page = parseInt(paginacion.page, 10) || 1;
  const pageSize = parseInt(paginacion.pageSize, 10) || 20;
  const offset = (page - 1) * pageSize;

  const where = [];
  const params = [];

  if (idPaciente) {
    where.push('c.id_paciente = ?');
    params.push(idPaciente);
  }
  if (idMedico) {
    where.push('c.id_medico = ?');
    params.push(idMedico);
  }
  if (estadoCita) {
    where.push('c.estado_cita = ?');
    params.push(estadoCita);
  }
  if (estadoPago) {
    where.push('c.estado_pago = ?');
    params.push(estadoPago);
  }
  if (fechaDesde) {
    where.push('c.fecha_cita >= ?');
    params.push(fechaDesde);
  }
  if (fechaHasta) {
    where.push('c.fecha_cita <= ?');
    params.push(fechaHasta);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const baseFrom = `
    FROM citas c
    INNER JOIN paciente p ON p.id_paciente = c.id_paciente
    INNER JOIN medico   m ON m.id_medico   = c.id_medico
    ${whereSql}
  `;

  const [rows] = await db.query(
    `
    SELECT
      c.id_cita,
      c.folio_cita,
      c.fecha_cita,
      c.estado_cita,
      c.estado_pago,
      c.monto_cobro,
      p.nombre    AS nombre_paciente,
      p.apellidos AS apellidos_paciente,
      m.nombre    AS nombre_medico,
      m.apellidos AS apellidos_medico
    ${baseFrom}
    ORDER BY c.fecha_cita DESC
    LIMIT ? OFFSET ?
  `,
    [...params, pageSize, offset]
  );

  const [[countRow]] = await db.query(
    `
    SELECT COUNT(*) AS total
    ${baseFrom}
  `,
    params
  );

  const total = Number(countRow.total || 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    data: rows,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
    },
  };
}

/**
 * Actualiza el estado de la cita (PROGRAMADA / CONFIRMADA / CANCELADA / ATENDIDA).
 */
async function actualizarEstadoCita(id_cita, nuevoEstado, conn) {
  const db = getConn(conn);

  const sql = `
    UPDATE citas
    SET estado_cita = ?
    WHERE id_cita = ?
  `;

  const [result] = await db.query(sql, [nuevoEstado, id_cita]);
  return result.affectedRows > 0;
}

/**
 * Cita básica para flujo de cobro.
 * Devuelve al menos: id_cita, id_paciente, monto_cobro, estado_pago.
 */
async function obtenerCitaPorId(id_cita, conn) {
  const db = getConn(conn);

  const sql = `
    SELECT
      c.id_cita,
      c.folio_cita,
      c.fecha_cita,
      c.estado_cita,
      c.estado_pago,
      c.monto_cobro,
      c.id_paciente,
      c.id_medico,
      c.monto_pagado,
      c.saldo_pendiente
    FROM citas c
    WHERE c.id_cita = ?
  `;

  const [rows] = await db.query(sql, [id_cita]);
  return rows[0] || null;
}

/**
 * Anticipo pendiente para una cita (si existe).
 */
async function obtenerAnticipoPendientePorCita(id_cita, conn) {
  const db = getConn(conn);

  const sql = `
    SELECT
      a.*
    FROM anticipo_cita a
    WHERE a.id_cita = ?
      AND a.estado = 'PENDIENTE'
    ORDER BY a.fecha_solicitud DESC
    LIMIT 1
  `;

  const [rows] = await db.query(sql, [id_cita]);
  return rows[0] || null;
}

/**
 * Marca un anticipo como pagado.
 */
async function actualizarAnticipoComoPagado(id_anticipo, id_pago_caja, conn) {
  const db = getConn(conn);

  const sql = `
    UPDATE anticipo_cita
    SET estado = 'PAGADO',
        id_pago_caja = ?,
        fecha_confirmacion = NOW()
    WHERE id_anticipo = ?
  `;

  const [result] = await db.query(sql, [id_pago_caja, id_anticipo]);
  return result.affectedRows > 0;
}

/**
 * Marca la cita como pagada.
 * Actualiza estado_pago, id_pago_caja y opcionalmente monto_pagado.
 */
async function actualizarCitaComoPagada(
  { id_cita, id_pago_caja, monto_pagado = null },
  conn
) {
  const db = getConn(conn);

  const sql = `
    UPDATE citas
    SET estado_pago = 'PAGADO',
        id_pago_caja = ?,
        monto_pagado = ?
    WHERE id_cita = ?
  `;

  const [result] = await db.query(sql, [id_pago_caja, monto_pagado, id_cita]);
  return result.affectedRows > 0;
}

/**
 * Obtener anticipo por id (utilidad por si la quieres luego).
 */
async function obtenerAnticipoPorId(id_anticipo, conn) {
  const db = getConn(conn);

  const sql = `
    SELECT *
    FROM anticipo_cita
    WHERE id_anticipo = ?
  `;

  const [rows] = await db.query(sql, [id_anticipo]);
  return rows[0] || null;
}

/**
 * Verifica si el médico ya tiene una cita en un rango de tiempo alrededor
 * de la fecha/hora indicada.
 *
 * fechaCitaStr debe ser 'YYYY-MM-DD HH:MM:SS'
 * minutosAntes / minutosDespues definen la ventana.
 */
async function existeCitaEnRangoParaMedico(
  id_medico,
  fechaCitaStr,
  minutosAntes,
  minutosDespues,
  conn
) {
  const db = getConn(conn);

  const sql = `
    SELECT COUNT(*) AS total
    FROM citas
    WHERE id_medico = ?
      AND estado_cita <> 'CANCELADA'
      AND fecha_cita BETWEEN DATE_SUB(?, INTERVAL ? MINUTE)
                         AND DATE_ADD(?, INTERVAL ? MINUTE)
  `;

  const [rows] = await db.query(sql, [
    id_medico,
    fechaCitaStr,
    minutosAntes,
    fechaCitaStr,
    minutosDespues,
  ]);

  return Number(rows[0]?.total || 0) > 0;
}

/**
 * Verifica si el paciente ya tiene una cita exactamente en esa fecha/hora.
 */
async function existeCitaMismaFechaParaPaciente(
  id_paciente,
  fechaCitaStr,
  conn
) {
  const db = getConn(conn);

  const sql = `
    SELECT COUNT(*) AS total
    FROM citas
    WHERE id_paciente = ?
      AND estado_cita <> 'CANCELADA'
      AND fecha_cita = ?
  `;

  const [rows] = await db.query(sql, [id_paciente, fechaCitaStr]);
  return Number(rows[0]?.total || 0) > 0;
}

async function crearPagoCita(
  { id_cita, id_paciente, monto, origen = 'CAJA', id_pago_caja = null, observaciones = null },
  conn
) {
  const db = getConn(conn);

  const sql = `
    INSERT INTO pagos_cita (
      id_cita,
      id_paciente,
      monto,
      origen,
      id_pago_caja,
      observaciones
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  const params = [id_cita, id_paciente, monto, origen, id_pago_caja, observaciones];

  const [result] = await db.query(sql, params);
  return result.insertId; // id_pago_cita
}
async function actualizarMontosCita(
  { id_cita, monto_pagado, saldo_pendiente, estado_pago },
  conn
) {
  const db = getConn(conn);

  const sql = `
    UPDATE citas
    SET monto_pagado = ?,
        saldo_pendiente = ?,
        estado_pago = ?
    WHERE id_cita = ?
  `;

  const [result] = await db.query(sql, [
    monto_pagado,
    saldo_pendiente,
    estado_pago,
    id_cita,
  ]);

  return result.affectedRows > 0;
}

module.exports = {
  crearCita,
  crearAnticipo,
  listarCitas,
  listarResumenCitas,
  actualizarEstadoCita,
  obtenerCitaPorId,
  obtenerAnticipoPendientePorCita,
  actualizarAnticipoComoPagado,
  actualizarCitaComoPagada,
  obtenerAnticipoPorId,
  existeCitaEnRangoParaMedico,
  existeCitaMismaFechaParaPaciente,
  crearPagoCita,
  actualizarMontosCita,
};
//fin del documento