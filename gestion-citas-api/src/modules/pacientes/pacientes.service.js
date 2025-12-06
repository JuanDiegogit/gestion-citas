// src/modules/pacientes/pacientes.service.js
const pacientesRepository = require('./pacientes.repository');
const cajaClient = require('../../integrations/caja.client');
const atencionClinicaClient = require('../../integrations/atencionClinica.client');

/**
 * Listado paginado de pacientes.
 */
async function listarPacientes(query) {
  const {
    q,
    canal_preferente,
    page = 1,
    pageSize = 20,
  } = query || {};

  const pageNumber = parseInt(page, 10) || 1;
  const sizeNumber = parseInt(pageSize, 10) || 20;

  const resultado = await pacientesRepository.listarPacientes(
    {
      q: q || null,
      canalPreferente: canal_preferente || null,
    },
    { page: pageNumber, pageSize: sizeNumber }
  );

  return resultado;
}

/**
 * Detalle de un paciente.
 */
async function obtenerPaciente(idParam) {
  const id = parseInt(idParam, 10);
  if (Number.isNaN(id)) {
    const err = new Error('El id del paciente debe ser un entero válido');
    err.statusCode = 400;
    throw err;
  }

  const paciente = await pacientesRepository.obtenerPacientePorId(id);
  if (!paciente) {
    const err = new Error('Paciente no encontrado');
    err.statusCode = 404;
    throw err;
  }

  return paciente;
}

/**
 * Crea un paciente y sincroniza (best-effort) con
 * Atención Clínica y Caja.
 *
 * IMPORTANTE:
 *  - Primero se crea en SIGCD → obtenemos id_paciente.
 *  - Luego se intenta mandar a las APIs externas incluyendo ese id_paciente.
 *  - Si falla la sincronización, NO se rompe la creación local.
 */
async function crearPaciente(payload) {
  const {
    nombre,
    apellidos,
    fecha_nacimiento,
    telefono,
    email,
    canal_preferente,
  } = payload || {};

  if (!nombre || !apellidos) {
    const err = new Error('nombre y apellidos son obligatorios');
    err.statusCode = 400;
    throw err;
  }

  // 1) Crear en SIGCD (SQL Server) y recuperar el ID generado
  const id_paciente = await pacientesRepository.crearPaciente({
    nombre,
    apellidos,
    fecha_nacimiento,
    telefono,
    email,
    canal_preferente,
  });

  // ---------- Sincronización con ATENCIÓN CLÍNICA ----------
  try {
    if (
      atencionClinicaClient &&
      typeof atencionClinicaClient.sincronizarPaciente === 'function'
    ) {
      await atencionClinicaClient.sincronizarPaciente({
        id_paciente,
        nombre,
        apellidos,
        fecha_nacimiento: fecha_nacimiento || null,
        telefono: telefono || null,
        correo: email || null, // respetamos el campo 'correo' que ya usabas
      });
      console.log('[GCITAS] Paciente sincronizado con ATENCIÓN CLÍNICA');
    } else {
      console.warn(
        '[GCITAS] atencionClinicaClient.sincronizarPaciente no está definido (no se sincroniza paciente)'
      );
    }
  } catch (syncErr) {
    console.error(
      '[GCITAS] Error al sincronizar con ATENCIÓN CLÍNICA:',
      syncErr.response?.data || syncErr.message || syncErr
    );
    // Igual que antes: no se rompe la creación del paciente
  }

  // ---------- Sincronización con CAJA ----------
  try {
    if (cajaClient && typeof cajaClient.registrarPaciente === 'function') {
      await cajaClient.registrarPaciente({
        id_paciente, // también mandamos el id_paciente para que Caja pueda relacionar
        nombre,
        apellido: apellidos,
        fecha_nac: fecha_nacimiento || null,
        direccion: 'SIN_DIRECCION',
        correo: email || null,
      });
      console.log('[GCITAS] Paciente sincronizado con CAJA');
    } else {
      console.warn(
        '[GCITAS] cajaClient.registrarPaciente no está definido (no se sincroniza paciente en CAJA)'
      );
    }
  } catch (cajaErr) {
    console.error(
      '[GCITAS] Error al sincronizar paciente con CAJA:',
      cajaErr.cause?.response?.data ||
        cajaErr.response?.data ||
        cajaErr.message ||
        cajaErr
    );
    // Best-effort: tampoco rompemos la creación
  }

  return {
    id_paciente,
    nombre,
    apellidos,
    fecha_nacimiento: fecha_nacimiento || null,
    telefono: telefono || null,
    email: email || null,
    canal_preferente: canal_preferente || null,
  };
}

/**
 * Actualización parcial de datos de un paciente.
 */
async function actualizarPaciente(idParam, payload) {
  const id = parseInt(idParam, 10);
  if (Number.isNaN(id)) {
    const err = new Error('El id del paciente debe ser un entero válido');
    err.statusCode = 400;
    throw err;
  }

  const {
    nombre,
    apellidos,
    fecha_nacimiento,
    telefono,
    email,
    canal_preferente,
  } = payload || {};

  const campos = {};

  if (nombre !== undefined) campos.nombre = nombre;
  if (apellidos !== undefined) campos.apellidos = apellidos;
  if (fecha_nacimiento !== undefined) campos.fecha_nacimiento = fecha_nacimiento;
  if (telefono !== undefined) campos.telefono = telefono;
  if (email !== undefined) campos.email = email;
  if (canal_preferente !== undefined)
    campos.canal_preferente = canal_preferente;

  if (Object.keys(campos).length === 0) {
    const err = new Error(
      'Debe enviarse al menos un campo para actualizar al paciente'
    );
    err.statusCode = 400;
    throw err;
  }

  const filas = await pacientesRepository.actualizarPaciente(id, campos);

  if (filas === 0) {
    const err = new Error('Paciente no encontrado');
    err.statusCode = 404;
    throw err;
  }

  // Si en algún momento quieres también re-sincronizar con las APIs externas,
  // aquí podrías leer el paciente y mandar algo tipo:
  //
  // const pacienteActualizado = await pacientesRepository.obtenerPacientePorId(id);
  // try {
  //   await atencionClinicaClient.sincronizarPaciente({
  //     id_paciente: id,
  //     nombre: pacienteActualizado.nombre,
  //     apellidos: pacienteActualizado.apellidos,
  //     fecha_nacimiento: pacienteActualizado.fecha_nacimiento,
  //     telefono: pacienteActualizado.telefono,
  //     correo: pacienteActualizado.email || null,
  //   });
  // } catch (e) { ... }
  //
  // y lo mismo para Caja si hace falta.

  return { id_paciente: id };
}

/**
 * Consulta del saldo del paciente en la API de Caja.
 */
async function obtenerSaldoPacienteCaja(idParam) {
  const id = parseInt(idParam, 10);
  if (Number.isNaN(id)) {
    const err = new Error('El id del paciente debe ser un entero válido');
    err.statusCode = 400;
    throw err;
  }

  // Llamamos al cliente de CAJA
  try {
    const resp = await cajaClient.obtenerSaldoCaja(id);
    // Puedes adaptar este mapeo según lo que responda realmente tu API de Caja
    return resp; // por ejemplo { saldo: 123.45 } o lo que devuelva Caja
  } catch (error) {
    console.error(
      '[SIGCD] Error consultando saldo en CAJA:',
      error.cause?.response?.data ||
        error.response?.data ||
        error.message ||
        error
    );
    const err = new Error('No se pudo obtener el saldo desde Caja');
    err.statusCode = error.statusCode || 502;
    throw err;
  }
}

module.exports = {
  listarPacientes,
  obtenerPaciente,
  crearPaciente,
  actualizarPaciente,
  obtenerSaldoPacienteCaja,
};
// fin del documento
