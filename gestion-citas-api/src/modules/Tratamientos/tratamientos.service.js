// src/modules/tratamientos/tratamientos.service.js
const tratamientosRepository = require('./tratamientos.repository');
const atencionClinicaClient = require('../../integrations/atencionClinica.client');

/**
 * Lista de tratamientos.
 */
async function listarTratamientos() {
  // Si en algún momento quieres filtros/paginación,
  // aquí se los pasas al repo.
  const resultado = await tratamientosRepository.listarTratamientos();
  // Para mantener compatibilidad con tu controller,
  // devolvemos solo el array cuando no hace falta paginación.
  return resultado.data || resultado;
}

/**
 * Detalle de un tratamiento.
 */
async function obtenerTratamiento(idParam) {
  const id = parseInt(idParam, 10);
  if (Number.isNaN(id)) {
    const err = new Error('El id del tratamiento debe ser un entero válido');
    err.statusCode = 400;
    throw err;
  }

  const tratamiento = await tratamientosRepository.obtenerTratamientoPorId(id);
  if (!tratamiento) {
    const err = new Error('Tratamiento no encontrado');
    err.statusCode = 404;
    throw err;
  }

  return tratamiento;
}

/**
 * Crea un tratamiento.
 */
async function crearTratamiento(payload) {
  const {
    cve_trat,
    nombre,
    descripcion,
    precio_base,
    duracion_min,
    activo,
  } = payload || {};

  if (!cve_trat || !nombre) {
    const err = new Error('cve_trat y nombre son obligatorios');
    err.statusCode = 400;
    throw err;
  }

  const parsedPrecio = Number(precio_base);
  if (Number.isNaN(parsedPrecio) || parsedPrecio <= 0) {
    const err = new Error('precio_base debe ser un número mayor que 0');
    err.statusCode = 400;
    throw err;
  }

  let parsedDuracion = null;
  if (
    duracion_min !== undefined &&
    duracion_min !== null &&
    duracion_min !== ''
  ) {
    const val = parseInt(duracion_min, 10);
    if (Number.isNaN(val) || val < 0) {
      const err = new Error(
        'duracion_min debe ser un entero mayor o igual a 0'
      );
      err.statusCode = 400;
      throw err;
    }
    parsedDuracion = val;
  }

  const tratamiento = await tratamientosRepository.crearTratamiento({
    cve_trat,
    nombre,
    descripcion: descripcion || null,
    precio_base: parsedPrecio,
    duracion_min: parsedDuracion,
    activo: typeof activo === 'boolean' ? activo : true,
  })
  try {
    if (
      atencionClinicaClient &&
      typeof atencionClinicaClient.sincronizarTratamiento === 'function'
    ) {
      await atencionClinicaClient.sincronizarTratamiento({
        id_tratamiento: tratamiento.id_tratamiento,
        cve_trat: tratamiento.cve_trat,
        nombre: tratamiento.nombre,
        descripcion: tratamiento.descripcion,
        precio_base: tratamiento.precio_base,
        duracion_min: tratamiento.duracion_min,
        activo: tratamiento.activo,
      });

      console.log('[SIGCD] Tratamiento sincronizado con ATENCIÓN CLÍNICA');
    } else {
      console.warn(
        '[SIGCD] atencionClinicaClient.sincronizarTratamiento no está definido (no se sincroniza tratamiento)'
      );
    }
  } catch (syncErr) {
    console.error(
      '[SIGCD] Error al sincronizar tratamiento con ATENCIÓN CLÍNICA:',
      syncErr.cause?.response?.data ||
        syncErr.response?.data ||
        syncErr.message ||
        syncErr
    );
    // Best-effort: no rompemos la creación del tratamiento
  }

  return tratamiento;
}

module.exports = {
  listarTratamientos,
  obtenerTratamiento,
  crearTratamiento,
};
//fin del documento