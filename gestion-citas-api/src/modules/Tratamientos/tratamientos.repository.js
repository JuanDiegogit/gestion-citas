// src/modules/tratamientos/tratamientos.repository.js
const { sql, poolPromise } = require('../../db');

/**
 * Lista todos los tratamientos.
 */
async function listarTratamientos() {
  const pool = await poolPromise;
  const result = await pool.request().query(`
    SELECT
      id_tratamiento,
      cve_trat,
      nombre,
      descripcion,
      precio_base,
      duracion_min,
      activo
    FROM Tratamiento
    ORDER BY nombre;
  `);

  return result.recordset;
}

/**
 * Obtiene un tratamiento por id.
 */
async function obtenerTratamientoPorId(id_tratamiento) {
  const pool = await poolPromise;
  const request = pool.request();

  request.input('id_tratamiento', sql.Int, id_tratamiento);

  const result = await request.query(`
    SELECT
      id_tratamiento,
      cve_trat,
      nombre,
      descripcion,
      precio_base,
      duracion_min,
      activo
    FROM Tratamiento
    WHERE id_tratamiento = @id_tratamiento;
  `);

  return result.recordset[0] || null;
}

/**
 * Crea un nuevo tratamiento y devuelve el registro completo.
 */
async function crearTratamiento(datos) {
  const {
    cve_trat,
    nombre,
    descripcion,
    precio_base,
    duracion_min,
    activo,
  } = datos;

  const pool = await poolPromise;
  const request = pool.request();

  request.input('cve_trat', sql.NVarChar(20), cve_trat);
  request.input('nombre', sql.NVarChar(120), nombre);
  request.input('descripcion', sql.NVarChar(400), descripcion || null);
  request.input('precio_base', sql.Decimal(10, 2), precio_base);
  request.input(
    'duracion_min',
    sql.Int,
    duracion_min !== null && duracion_min !== undefined ? duracion_min : null
  );
  request.input('activo', sql.Bit, activo ? 1 : 0);

  const result = await request.query(`
    INSERT INTO Tratamiento (
      cve_trat,
      nombre,
      descripcion,
      precio_base,
      duracion_min,
      activo
    )
    VALUES (
      @cve_trat,
      @nombre,
      @descripcion,
      @precio_base,
      @duracion_min,
      @activo
    );

    SELECT
      id_tratamiento,
      cve_trat,
      nombre,
      descripcion,
      precio_base,
      duracion_min,
      activo
    FROM Tratamiento
    WHERE id_tratamiento = SCOPE_IDENTITY();
  `);

  return result.recordset[0] || null;
}

module.exports = {
  listarTratamientos,
  obtenerTratamientoPorId,
  crearTratamiento,
};
//fin del documento