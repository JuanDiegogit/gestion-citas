// src/modules/tratamientos/tratamientos.service.js
const tratamientosRepository = require('./tratamientos.repository');
const atencionClinicaClient = require('../../integrations/atencionClinica.client');
const cajaClient = require('../../integrations/caja.client');

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

  // 1) Crear en SIGCD (MySQL)
  const tratamiento = await tratamientosRepository.crearTratamiento({
    cve_trat,
    nombre,
    descripcion: descripcion || null,
    precio_base: parsedPrecio,
    duracion_min: parsedDuracion,
    activo: typeof activo === 'boolean' ? activo : true,
  });

  // tratamiento debería tener esta forma:
  // {
  //   id_tratamiento,
  //   cve_trat,
  //   nombre,
  //   descripcion,
  //   precio_base,
  //   duracion_min,
  //   activo
  // }

  // 2) Sincronizar con Atención Clínica (best-effort)
  try {
    if (
      atencionClinicaClient &&
      typeof atencionClinicaClient.sincronizarTratamiento === 'function'
    ) {
      await atencionClinicaClient.sincronizarTratamiento(tratamiento);
      console.log('[SIGCD] Tratamiento sincronizado con ATENCIÓN CLÍNICA');
    } else {
      console.warn(
        '[SIGCD] atencionClinicaClient.sincronizarTratamiento no está definido'
      );
    }
  } catch (errAtencion) {
    console.error(
      '[SIGCD] Error al sincronizar tratamiento con ATENCIÓN CLÍNICA:',
      errAtencion.cause?.response?.data ||
        errAtencion.response?.data ||
        errAtencion.message ||
        errAtencion
    );
    // No rompemos la creación local
  }

  // 3) Sincronizar con CAJA (best-effort)
  try {
    if (
      cajaClient &&
      typeof cajaClient.sincronizarTratamientoEnCaja === 'function'
    ) {
      await cajaClient.sincronizarTratamientoEnCaja(tratamiento);
      console.log('[SIGCD] Tratamiento sincronizado con CAJA');
    } else {
      console.warn(
        '[SIGCD] cajaClient.sincronizarTratamientoEnCaja no está definido'
      );
    }
  } catch (errCaja) {
    console.error(
      '[SIGCD] Error al sincronizar tratamiento con CAJA:',
      errCaja.cause?.response?.data ||
        errCaja.response?.data ||
        errCaja.message ||
        errCaja
    );
    // También best-effort: no rompemos la creación local
  }

  return tratamiento;
}

module.exports = {
  listarTratamientos,
  obtenerTratamiento,
  crearTratamiento,
};
//fin del documento