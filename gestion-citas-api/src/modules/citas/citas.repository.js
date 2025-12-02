// src/modules/citas/citas.repository.js
const { sql, poolPromise } = require('../../db');

/**
 * Inserta una cita usando una transacción existente.
 * Devuelve el id_cita generado.
 */
async function crearCita(datos, transaction) {
  const {
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
  } = datos;

  const request = new sql.Request(transaction);

  request.input('folio_cita', sql.NVarChar(20), folio_cita);
  request.input('id_paciente', sql.Int, id_paciente);
  request.input('id_medico', sql.Int, id_medico);
  request.input('id_tratamiento', sql.Int, id_tratamiento || null);
  request.input('fecha_cita', sql.DateTime2, fecha_cita);
  request.input('medio_solicitud', sql.NVarChar(20), medio_solicitud);
  request.input('motivo_cita', sql.NVarChar(200), motivo_cita || null);
  request.input('info_relevante', sql.NVarChar(sql.MAX), info_relevante || null);
  request.input('observaciones', sql.NVarChar(sql.MAX), observaciones || null);
  request.input(
    'responsable_registro',
    sql.NVarChar(80),
    responsable_registro || 'SISTEMA'
  );
  request.input('estado_cita', sql.NVarChar(20), estado_cita);
  request.input('estado_pago', sql.NVarChar(20), estado_pago);
  request.input('monto_cobro', sql.Decimal(10, 2), monto_cobro);

  const query = `
    INSERT INTO Cita (
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
    OUTPUT INSERTED.id_cita
    VALUES (
      @folio_cita,
      @id_paciente,
      @id_medico,
      @id_tratamiento,
      @fecha_cita,
      @medio_solicitud,
      @motivo_cita,
      @info_relevante,
      @observaciones,
      @responsable_registro,
      @estado_cita,
      @estado_pago,
      @monto_cobro
    );
  `;

  const result = await request.query(query);
  return result.recordset[0].id_cita;
}

/**
 * Inserta un anticipo para una cita (si procede).
 * Devuelve el id_anticipo generado.
 */
async function crearAnticipo(datos, transaction) {
  const { id_cita, id_paciente, monto_anticipo } = datos;

  const request = new sql.Request(transaction);

  request.input('id_cita', sql.Int, id_cita);
  request.input('id_paciente', sql.Int, id_paciente);
  request.input('monto_anticipo', sql.Decimal(10, 2), monto_anticipo);
  request.input('estado', sql.NVarChar(20), 'PENDIENTE');

  const query = `
    INSERT INTO AnticipoCita (
      id_cita,
      id_paciente,
      monto_anticipo,
      estado,
      fecha_solicitud
    )
    OUTPUT INSERTED.id_anticipo
    VALUES (
      @id_cita,
      @id_paciente,
      @monto_anticipo,
      @estado,
      SYSDATETIME()
    );
  `;

  const result = await request.query(query);
  return result.recordset[0].id_anticipo;
}

/**
 * Devuelve el anticipo pendiente (TOP 1) para una cita dentro de una transacción.
 */
async function obtenerAnticipoPendientePorCita(id_cita, transaction) {
  const request = new sql.Request(transaction);
  request.input('id_cita', sql.Int, id_cita);

  const result = await request.query(`
    SELECT TOP 1
      id_anticipo,
      id_cita,
      id_paciente,
      monto_anticipo,
      estado
    FROM AnticipoCita
    WHERE id_cita = @id_cita
      AND estado = 'PENDIENTE'
    ORDER BY id_anticipo DESC;
  `);

  return result.recordset[0] || null;
}

/**
 * Marca un anticipo como PAGADO.
 */
async function actualizarAnticipoComoPagado(id_anticipo, id_pago_caja, transaction) {
  const request = new sql.Request(transaction);
  request.input('id_anticipo', sql.Int, id_anticipo);
  request.input('id_pago_caja', sql.NVarChar(50), String(id_pago_caja));

  await request.query(`
    UPDATE AnticipoCita
    SET estado = 'PAGADO',
        id_pago_caja = @id_pago_caja,
        fecha_confirmacion = SYSDATETIME()
    WHERE id_anticipo = @id_anticipo;
  `);
}

/**
 * Marca una cita como PAGADO y limpia el saldo.
 */
async function actualizarCitaComoPagada({ id_cita, id_pago_caja, monto_pagado }, transaction) {
  const request = new sql.Request(transaction);
  request.input('id_cita', sql.Int, id_cita);
  request.input('id_pago_caja', sql.NVarChar(50), String(id_pago_caja));

  if (monto_pagado != null) {
    request.input('monto_pagado', sql.Decimal(10, 2), monto_pagado);
  }

  const query = `
    UPDATE Cita
    SET estado_pago   = 'PAGADO',
        id_pago_caja  = @id_pago_caja,
        saldo_paciente = 0
        ${monto_pagado != null ? ', monto_pagado = @monto_pagado' : ''}
    WHERE id_cita = @id_cita;
  `;

  await request.query(query);
}

/**
 * Listado general de citas con filtros (equivalente a GET /citas original).
 */
async function listarCitas({ fechaDesde, fechaHasta, estadoCita, idPaciente, idMedico }) {
  const pool = await poolPromise;
  const request = pool.request();

  let where = 'WHERE 1=1';

  if (fechaDesde) {
    request.input('fecha_desde', sql.DateTime2, fechaDesde);
    where += ' AND c.fecha_cita >= @fecha_desde';
  }

  if (fechaHasta) {
    request.input('fecha_hasta', sql.DateTime2, fechaHasta);
    where += ' AND c.fecha_cita <= @fecha_hasta';
  }

  if (estadoCita) {
    request.input('estado_cita', sql.NVarChar(20), estadoCita);
    where += ' AND c.estado_cita = @estado_cita';
  }

  if (typeof idPaciente === 'number') {
    request.input('id_paciente', sql.Int, idPaciente);
    where += ' AND c.id_paciente = @id_paciente';
  }

  if (typeof idMedico === 'number') {
    request.input('id_medico', sql.Int, idMedico);
    where += ' AND c.id_medico = @id_medico';
  }

  const query = `
    SELECT
      c.id_cita,
      c.folio_cita,
      c.fecha_cita,
      c.estado_cita,
      c.estado_pago,
      c.monto_cobro,
      c.id_paciente,
      p.nombre    AS nombre_paciente,
      p.apellidos AS apellidos_paciente,
      c.id_medico,
      m.nombre    AS nombre_medico,
      m.apellidos AS apellidos_medico
    FROM Cita c
    INNER JOIN Paciente p ON p.id_paciente = c.id_paciente
    INNER JOIN Medico   m ON m.id_medico   = c.id_medico
    ${where}
    ORDER BY c.fecha_cita DESC;
  `;

  const result = await request.query(query);
  return result.recordset;
}

/**
 * Listado resumido de citas con paginación (GET /citas/resumen).
 */
async function listarResumenCitas(
  { idPaciente, idMedico, estadoCita, estadoPago, fechaDesde, fechaHasta },
  { page, pageSize }
) {
  const pool = await poolPromise;

  const whereClauses = [];
  const params = {};

  if (idPaciente) {
    whereClauses.push('c.id_paciente = @id_paciente');
    params.id_paciente = idPaciente;
  }

  if (idMedico) {
    whereClauses.push('c.id_medico = @id_medico');
    params.id_medico = idMedico;
  }

  if (estadoCita) {
    whereClauses.push('c.estado_cita = @estado_cita');
    params.estado_cita = estadoCita;
  }

  if (estadoPago) {
    whereClauses.push('c.estado_pago = @estado_pago');
    params.estado_pago = estadoPago;
  }

  if (fechaDesde) {
    whereClauses.push('c.fecha_cita >= @fecha_desde');
    params.fecha_desde = fechaDesde;
  }

  if (fechaHasta) {
    whereClauses.push('c.fecha_cita <= @fecha_hasta');
    params.fecha_hasta = fechaHasta;
  }

  const whereSql =
    whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

  const pageNumber = Number.isInteger(page) ? page : parseInt(page, 10) || 1;
  const sizeNumber = Number.isInteger(pageSize)
    ? pageSize
    : parseInt(pageSize, 10) || 20;
  const offset = (pageNumber - 1) * sizeNumber;

  // ---- Query de conteo total ----
  const countRequest = pool.request();
  Object.entries(params).forEach(([key, value]) => {
    if (key === 'id_paciente' || key === 'id_medico') {
      countRequest.input(key, sql.Int, value);
    } else if (key === 'estado_cita' || key === 'estado_pago') {
      countRequest.input(key, sql.NVarChar(20), value);
    } else if (key === 'fecha_desde' || key === 'fecha_hasta') {
      countRequest.input(key, sql.DateTime2, value);
    }
  });

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM Cita c
    INNER JOIN Paciente p ON p.id_paciente = c.id_paciente
    ${whereSql};
  `;

  const countResult = await countRequest.query(countQuery);
  const total = countResult.recordset[0]?.total || 0;

  // ---- Query de datos paginados ----
  const dataRequest = pool.request();

  // Parámetros compartidos
  Object.entries(params).forEach(([key, value]) => {
    if (key === 'id_paciente' || key === 'id_medico') {
      dataRequest.input(key, sql.Int, value);
    } else if (key === 'estado_cita' || key === 'estado_pago') {
      dataRequest.input(key, sql.NVarChar(20), value);
    } else if (key === 'fecha_desde' || key === 'fecha_hasta') {
      dataRequest.input(key, sql.DateTime2, value);
    }
  });

  dataRequest.input('offset', sql.Int, offset);
  dataRequest.input('pageSize', sql.Int, sizeNumber);

  const dataQuery = `
    SELECT
      c.id_cita           AS idCita,
      c.id_paciente       AS idPaciente,
      p.nombre            AS nombrePaciente,
      p.apellidos         AS apellidosPaciente,
      c.fecha_cita        AS fechaCita,
      c.estado_cita       AS estadoCita,
      c.estado_pago       AS estadoPago,
      c.monto_cobro       AS montoCobro,
      ISNULL(c.saldo_paciente, 0) AS saldoPaciente,
      c.id_pago_caja      AS idPagoCaja
    FROM Cita c
    INNER JOIN Paciente p ON p.id_paciente = c.id_paciente
    ${whereSql}
    ORDER BY c.fecha_cita DESC, c.id_cita DESC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
  `;

  const dataResult = await dataRequest.query(dataQuery);

  return {
    data: dataResult.recordset,
    pagination: {
      page: pageNumber,
      pageSize: sizeNumber,
      total,
      totalPages: sizeNumber > 0 ? Math.ceil(total / sizeNumber) : 0,
    },
  };
}

module.exports = {
  crearCita,
  crearAnticipo,
  obtenerAnticipoPendientePorCita,
  actualizarAnticipoComoPagado,
  actualizarCitaComoPagada,
  listarCitas,
  listarResumenCitas,
};
