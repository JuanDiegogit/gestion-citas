// src/modules/medicos/medicos.repository.js
const { sql, poolPromise } = require('../../db');

/**
 * Lista todos los médicos (por ahora sin paginación).
 */
async function listarMedicos() {
  const pool = await poolPromise;
  const result = await pool.request().query(`
    SELECT
      id_medico,
      nombre,
      apellidos,
      especialidad,
      cedula_profesional,
      activo
    FROM Medico
    ORDER BY nombre, apellidos;
  `);

  return result.recordset;
}

/**
 * Obtiene un médico por id.
 */
async function obtenerMedicoPorId(id_medico) {
  const pool = await poolPromise;
  const request = pool.request();

  request.input('id_medico', sql.Int, id_medico);

  const result = await request.query(`
    SELECT
      id_medico,
      nombre,
      apellidos,
      especialidad,
      cedula_profesional,
      activo
    FROM Medico
    WHERE id_medico = @id_medico;
  `);

  return result.recordset[0] || null;
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

  const pool = await poolPromise;
  const request = pool.request();

  request.input('nombre', sql.NVarChar(80), nombre);
  request.input('apellidos', sql.NVarChar(120), apellidos);
  request.input('especialidad', sql.NVarChar(80), especialidad || null);
  request.input(
    'cedula_profesional',
    sql.NVarChar(30),
    cedula_profesional || null
  );
  request.input('activo', sql.Bit, activo ? 1 : 0);

  const result = await request.query(`
    INSERT INTO Medico (
      nombre,
      apellidos,
      especialidad,
      cedula_profesional,
      activo
    )
    VALUES (@nombre, @apellidos, @especialidad, @cedula_profesional, @activo);

    SELECT
      id_medico,
      nombre,
      apellidos,
      especialidad,
      cedula_profesional,
      activo
    FROM Medico
    WHERE id_medico = SCOPE_IDENTITY();
  `);

  return result.recordset[0] || null;
}

module.exports = {
  listarMedicos,
  obtenerMedicoPorId,
  crearMedico,
};
