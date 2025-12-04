// src/modules/pacientes/pacientes.repository.js
const { pool } = require('../../config/db');

/**
 * Lista pacientes con filtros y paginación.
 */
async function listarPacientes({ q, canalPreferente }, { page, pageSize }) {
  const pageNumber = parseInt(page, 10) || 1;
  const sizeNumber = parseInt(pageSize, 10) || 20;
  const offset = (pageNumber - 1) * sizeNumber;

  let where = 'WHERE 1=1';
  const params = [];

  if (q) {
    // En MySQL normalmente el LIKE ya es case-insensitive según la collation
    const pattern = `%${q}%`;
    where +=
      ' AND (p.nombre LIKE ? OR p.apellidos LIKE ? OR p.email LIKE ?)';
    params.push(pattern, pattern, pattern);
  }

  if (canalPreferente) {
    where += ' AND p.canal_preferente = ?';
    params.push(canalPreferente);
  }

  // 1) Conteo total
  const countQuery = `
    SELECT COUNT(*) AS total
    FROM paciente p
    ${where};
  `;
  const [countRows] = await pool.query(countQuery, params);
  const total = Number(countRows[0]?.total || 0);

  // 2) Datos paginados
  const dataQuery = `
    SELECT
      p.id_paciente,
      p.nombre,
      p.apellidos,
      p.fecha_nacimiento,
      p.telefono,
      p.email,
      p.canal_preferente,
      p.fecha_registro
    FROM paciente p
    ${where}
    ORDER BY p.fecha_registro DESC
    LIMIT ? OFFSET ?;
  `;

  const [pacientes] = await pool.query(dataQuery, [
    ...params,
    sizeNumber,
    offset,
  ]);

  return {
    total,
    page: pageNumber,
    pageSize: sizeNumber,
    pacientes,
  };
}

/**
 * Obtiene un paciente por ID.
 */
async function obtenerPacientePorId(idPaciente) {
  const query = `
    SELECT
      p.id_paciente,
      p.nombre,
      p.apellidos,
      p.fecha_nacimiento,
      p.telefono,
      p.email,
      p.canal_preferente,
      p.fecha_registro
    FROM paciente p
    WHERE p.id_paciente = ?;
  `;

  const [rows] = await pool.query(query, [idPaciente]);
  return rows[0] || null;
}

/**
 * Crea un nuevo paciente.
 * Devuelve el ID insertado.
 */
async function crearPaciente({
  nombre,
  apellidos,
  fecha_nacimiento,
  telefono,
  email,
  canal_preferente,
}) {
  const query = `
    INSERT INTO paciente (
      nombre,
      apellidos,
      fecha_nacimiento,
      telefono,
      email,
      canal_preferente
    )
    VALUES (?, ?, ?, ?, ?, ?);
  `;

  const params = [
    nombre,
    apellidos,
    fecha_nacimiento || null,
    telefono || null,
    email || null,
    canal_preferente || null,
  ];

  const [result] = await pool.query(query, params);

  return result.insertId; // id_paciente generado
}

/**
 * Actualiza un paciente (solo campos enviados).
 * Devuelve el número de filas afectadas.
 */
async function actualizarPaciente(idPaciente, campos) {
  const sets = [];
  const params = [];

  if (campos.nombre !== undefined) {
    sets.push('nombre = ?');
    params.push(campos.nombre);
  }
  if (campos.apellidos !== undefined) {
    sets.push('apellidos = ?');
    params.push(campos.apellidos);
  }
  if (campos.fecha_nacimiento !== undefined) {
    sets.push('fecha_nacimiento = ?');
    params.push(campos.fecha_nacimiento || null);
  }
  if (campos.telefono !== undefined) {
    sets.push('telefono = ?');
    params.push(campos.telefono || null);
  }
  if (campos.email !== undefined) {
    sets.push('email = ?');
    params.push(campos.email || null);
  }
  if (campos.canal_preferente !== undefined) {
    sets.push('canal_preferente = ?');
    params.push(campos.canal_preferente || null);
  }

  if (sets.length === 0) {
    // Nada que actualizar
    return 0;
  }

  const query = `
    UPDATE paciente
    SET ${sets.join(', ')}
    WHERE id_paciente = ?;
  `;

  params.push(idPaciente);

  const [result] = await pool.query(query, params);
  return result.affectedRows || 0;
}

module.exports = {
  listarPacientes,
  obtenerPacientePorId,
  crearPaciente,
  actualizarPaciente,
};
//fin del documento 