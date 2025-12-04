// src/modules/medicos/medicos.repository.js
const { pool } = require('../../config/db');

/**
 * Lista todos los médicos (por ahora sin paginación).
 */
async function listarMedicos() {
  const sql = `
    SELECT
      id_medico,
      nombre,
      apellidos,
      especialidad,
      cedula_profesional,
      activo
    FROM medico
    ORDER BY nombre, apellidos;
  `;

  const [rows] = await pool.query(sql);
  return rows;
}

/**
 * Obtiene un médico por id.
 */
async function obtenerMedicoPorId(id_medico) {
  const sql = `
    SELECT
      id_medico,
      nombre,
      apellidos,
      especialidad,
      cedula_profesional,
      activo
    FROM medico
    WHERE id_medico = ?;
  `;

  const [rows] = await pool.query(sql, [id_medico]);
  return rows[0] || null;
}

/**
 * Crea un nuevo médico y devuelve el registro completo.
 */
async function crearMedico(datos) {
  const {
    nombre,
    apellidos,
    especialidad,
    cedula_profesional,
    activo,
  } = datos;

  // 1) Insertar
  const insertSql = `
    INSERT INTO medico (
      nombre,
      apellidos,
      especialidad,
      cedula_profesional,
      activo
    )
    VALUES (?, ?, ?, ?, ?);
  `;

  const insertParams = [
    nombre,
    apellidos,
    especialidad || null,
    cedula_profesional || null,
    activo ? 1 : 0,
  ];

  const [insertResult] = await pool.query(insertSql, insertParams);
  const idGenerado = insertResult.insertId;

  // 2) Volver a leer el registro completo
  return obtenerMedicoPorId(idGenerado);
}

module.exports = {
  listarMedicos,
  obtenerMedicoPorId,
  crearMedico,
};
//fin del documento 