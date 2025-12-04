// src/modules/tratamientos/tratamientos.repository.js
const { pool } = require('../../config/db');

/**
 * Lista tratamientos con filtros y paginación.
 * @param {Object} filtros
 * @param {string} [filtros.q]           Búsqueda por nombre o clave.
 * @param {boolean} [filtros.soloActivos] Si true, solo tratamientos activos.
 * @param {Object} paginacion
 * @param {number} paginacion.page      Número de página (1-based).
 * @param {number} paginacion.pageSize  Tamaño de página.
 */
async function listarTratamientos(filtros = {}, paginacion = {}) {
  const { q, soloActivos } = filtros;
  const page = Number(paginacion.page) || 1;
  const pageSize = Number(paginacion.pageSize) || 50; // sin paginación estricta por defecto
  const offset = (page - 1) * pageSize;

  const whereClauses = [];
  const params = [];

  if (q && q.trim() !== '') {
    whereClauses.push('(t.nombre LIKE ? OR t.cve_trat LIKE ?)');
    const like = `%${q.trim()}%`;
    params.push(like, like);
  }

  if (soloActivos) {
    whereClauses.push('t.activo = 1');
  }

  const whereSql = whereClauses.length
    ? `WHERE ${whereClauses.join(' AND ')}`
    : '';

  const sqlBase = `
    FROM tratamiento t
    ${whereSql}
  `;

  const [rows] = await pool.query(
    `
    SELECT
      t.id_tratamiento,
      t.cve_trat,
      t.nombre,
      t.descripcion,
      t.precio_base,
      t.duracion_min,
      t.activo
    ${sqlBase}
    ORDER BY t.nombre ASC
    LIMIT ? OFFSET ?
  `,
    [...params, pageSize, offset]
  );

  const [[countRow]] = await pool.query(
    `
    SELECT COUNT(*) AS total
    ${sqlBase}
  `,
    params
  );

  const total = Number(countRow.total || 0);

  return {
    data: rows,
    total,
    page,
    pageSize,
  };
}

/**
 * Obtiene un tratamiento por ID.
 */
async function obtenerTratamientoPorId(idTratamiento) {
  const [rows] = await pool.query(
    `
    SELECT
      t.id_tratamiento,
      t.cve_trat,
      t.nombre,
      t.descripcion,
      t.precio_base,
      t.duracion_min,
      t.activo
    FROM tratamiento t
    WHERE t.id_tratamiento = ?
  `,
    [idTratamiento]
  );

  return rows[0] || null;
}

/**
 * Crea un nuevo tratamiento.
 * data debe traer: cve_trat, nombre, descripcion?, precio_base, duracion_min, activo?
 */
async function crearTratamiento(data) {
  const {
    cve_trat,
    nombre,
    descripcion = null,
    precio_base,
    duracion_min,
    activo = 1,
  } = data;

  const [result] = await pool.query(
    `
    INSERT INTO tratamiento (
      cve_trat,
      nombre,
      descripcion,
      precio_base,
      duracion_min,
      activo
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `,
    [cve_trat, nombre, descripcion, precio_base, duracion_min, activo ? 1 : 0]
  );

  const id_tratamiento = result.insertId;
  return obtenerTratamientoPorId(id_tratamiento);
}

/**
 * Actualiza un tratamiento existente.
 * fields puede traer cualquier subconjunto de:
 * { cve_trat, nombre, descripcion, precio_base, duracion_min, activo }
 */
async function actualizarTratamiento(idTratamiento, fields) {
  const allowedFields = [
    'cve_trat',
    'nombre',
    'descripcion',
    'precio_base',
    'duracion_min',
    'activo',
  ];

  const setParts = [];
  const params = [];

  for (const key of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      setParts.push(`${key} = ?`);
      params.push(fields[key]);
    }
  }

  if (setParts.length === 0) {
    // Nada que actualizar
    return obtenerTratamientoPorId(idTratamiento);
  }

  params.push(idTratamiento);

  await pool.query(
    `
    UPDATE tratamiento
    SET ${setParts.join(', ')}
    WHERE id_tratamiento = ?
  `,
    params
  );

  return obtenerTratamientoPorId(idTratamiento);
}

module.exports = {
  listarTratamientos,
  obtenerTratamientoPorId,
  crearTratamiento,
  actualizarTratamiento,
};
//fin del documento 