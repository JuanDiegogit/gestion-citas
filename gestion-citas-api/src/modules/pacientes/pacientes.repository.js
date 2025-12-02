// src/modules/pacientes/pacientes.repository.js
const { sql, poolPromise } = require('../../db');

/**
 * Listado paginado de pacientes con filtros por búsqueda y canal_preferente.
 */
async function listarPacientes({ q, canalPreferente }, { page, pageSize }) {
  const pool = await poolPromise;

  const filtros = [];
  const params = {};

  if (q) {
    filtros.push(
      '(p.nombre LIKE @q OR p.apellidos LIKE @q OR p.email LIKE @q)'
    );
    params.q = `%${q}%`;
  }

  if (canalPreferente) {
    filtros.push('p.canal_preferente = @canal_preferente');
    params.canal_preferente = canalPreferente;
  }

  const whereClause =
    filtros.length > 0 ? 'WHERE ' + filtros.join(' AND ') : '';

  const pageNumber = parseInt(page, 10) || 1;
  const sizeNumber = parseInt(pageSize, 10) || 20;
  const offset = (pageNumber - 1) * sizeNumber;

  // ----- COUNT -----
  const countReq = pool.request();
  if (params.q) {
    countReq.input('q', sql.NVarChar(255), params.q);
  }
  if (params.canal_preferente) {
    countReq.input(
      'canal_preferente',
      sql.NVarChar(16),
      params.canal_preferente
    );
  }

  const countResult = await countReq.query(`
    SELECT COUNT(*) AS total
    FROM Paciente p
    ${whereClause};
  `);

  const total = countResult.recordset[0]?.total || 0;

  // ----- DATA -----
  const dataReq = pool.request();
  if (params.q) {
    dataReq.input('q', sql.NVarChar(255), params.q);
  }
  if (params.canal_preferente) {
    dataReq.input(
      'canal_preferente',
      sql.NVarChar(16),
      params.canal_preferente
    );
  }
  dataReq.input('pageSize', sql.Int, sizeNumber);
  dataReq.input('offset', sql.Int, offset);

  const dataResult = await dataReq.query(`
    SELECT
      p.id_paciente,
      p.nombre,
      p.apellidos,
      p.fecha_nacimiento,
      p.telefono,
      p.email,
      p.canal_preferente,
      p.fecha_registro
    FROM Paciente p
    ${whereClause}
    ORDER BY p.fecha_registro DESC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
  `);

  return {
    total,
    page: pageNumber,
    pageSize: sizeNumber,
    pacientes: dataResult.recordset,
  };
}

/**
 * Obtiene el detalle de un paciente por id.
 */
async function obtenerPacientePorId(id) {
  const pool = await poolPromise;
  const request = pool.request();

  request.input('id_paciente', sql.Int, id);

  const result = await request.query(`
    SELECT
      p.id_paciente,
      p.nombre,
      p.apellidos,
      p.fecha_nacimiento,
      p.telefono,
      p.email,
      p.canal_preferente,
      p.fecha_registro
    FROM Paciente p
    WHERE p.id_paciente = @id_paciente;
  `);

  return result.recordset[0] || null;
}

/**
 * Crea un nuevo paciente y devuelve el id generado.
 */
async function crearPaciente({
  nombre,
  apellidos,
  fecha_nacimiento,
  telefono,
  email,
  canal_preferente,
}) {
  const pool = await poolPromise;
  const request = pool.request();

  request.input('nombre', sql.NVarChar(100), nombre);
  request.input('apellidos', sql.NVarChar(150), apellidos);
  request.input('fecha_nacimiento', sql.Date, fecha_nacimiento || null);
  request.input('telefono', sql.NVarChar(20), telefono || null);
  request.input('email', sql.NVarChar(150), email || null);
  request.input('canal_preferente', sql.NVarChar(16), canal_preferente || null);

  const insertResult = await request.query(`
    INSERT INTO Paciente (
      nombre,
      apellidos,
      fecha_nacimiento,
      telefono,
      email,
      canal_preferente
    )
    OUTPUT INSERTED.id_paciente
    VALUES (
      @nombre,
      @apellidos,
      @fecha_nacimiento,
      @telefono,
      @email,
      @canal_preferente
    );
  `);

  return insertResult.recordset[0].id_paciente;
}

/**
 * Actualiza parcialmente un paciente.
 * Devuelve el número de filas afectadas.
 */
async function actualizarPaciente(id, campos) {
  const pool = await poolPromise;
  const request = pool.request();

  request.input('id_paciente', sql.Int, id);

  const sets = [];

  if (Object.prototype.hasOwnProperty.call(campos, 'nombre')) {
    sets.push('nombre = @nombre');
    request.input('nombre', sql.NVarChar(100), campos.nombre);
  }

  if (Object.prototype.hasOwnProperty.call(campos, 'apellidos')) {
    sets.push('apellidos = @apellidos');
    request.input('apellidos', sql.NVarChar(150), campos.apellidos);
  }

  if (Object.prototype.hasOwnProperty.call(campos, 'fecha_nacimiento')) {
    sets.push('fecha_nacimiento = @fecha_nacimiento');
    request.input(
      'fecha_nacimiento',
      sql.Date,
      campos.fecha_nacimiento || null
    );
  }

  if (Object.prototype.hasOwnProperty.call(campos, 'telefono')) {
    sets.push('telefono = @telefono');
    request.input('telefono', sql.NVarChar(20), campos.telefono || null);
  }

  if (Object.prototype.hasOwnProperty.call(campos, 'email')) {
    sets.push('email = @email');
    request.input('email', sql.NVarChar(150), campos.email || null);
  }

  if (Object.prototype.hasOwnProperty.call(campos, 'canal_preferente')) {
    sets.push('canal_preferente = @canal_preferente');
    request.input(
      'canal_preferente',
      sql.NVarChar(16),
      campos.canal_preferente || null
    );
  }

  if (sets.length === 0) {
    // Que el service decida qué hacer con "0 campos"
    return 0;
  }

  const updateSql = `
    UPDATE Paciente
    SET ${sets.join(', ')}
    WHERE id_paciente = @id_paciente;
  `;

  const result = await request.query(updateSql);
  return result.rowsAffected[0] || 0;
}

module.exports = {
  listarPacientes,
  obtenerPacientePorId,
  crearPaciente,
  actualizarPaciente,
};
//fin del documento