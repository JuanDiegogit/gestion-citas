// src/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sql, poolPromise } = require('./db');

const app = express();
const port = process.env.PORT || 3000;

function generarFolioCita() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');

  return `CITA-${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

app.use(cors());
app.use(express.json());

// Helper para generar folio tipo CITA-YYYYMMDD-HHMMSS
function generarFolioCita(fecha = new Date()) {
  const pad = (n) => n.toString().padStart(2, '0');

  const anio = fecha.getFullYear();
  const mes = pad(fecha.getMonth() + 1);
  const dia = pad(fecha.getDate());
  const hora = pad(fecha.getHours());
  const min = pad(fecha.getMinutes());
  const seg = pad(fecha.getSeconds());

  return `CITA-${anio}${mes}${dia}-${hora}${min}${seg}`;
}

// Crear nueva cita
app.post('/citas', async (req, res) => {
  try {
    const {
      id_paciente,
      id_medico,
      id_tratamiento,
      fecha_cita,          // string ISO: "2025-11-20T17:30"
      medio_solicitud,     // PRESENCIAL / WHATSAPP / TELEFONO...
      motivo_cita,
      info_relevante,
      observaciones,
      responsable_registro // Recepción, Doctor, etc.
    } = req.body;

    // Validaciones mínimas
    if (!id_paciente || !id_medico || !id_tratamiento || !fecha_cita) {
      return res.status(400).json({
        error: 'id_paciente, id_medico, id_tratamiento y fecha_cita son obligatorios'
      });
    }

    const pool = await poolPromise;

    const folio = generarFolioCita();

    const request = pool.request();
    request
      .input('folio_cita',          sql.VarChar(30), folio)
      .input('id_paciente',         sql.Int,         id_paciente)
      .input('id_medico',           sql.Int,         id_medico)
      .input('id_tratamiento',      sql.Int,         id_tratamiento)
      .input('fecha_cita',          sql.DateTime2,   fecha_cita)
      .input('medio_solicitud',     sql.VarChar(20),  medio_solicitud || null)
      .input('motivo_cita',         sql.VarChar(200), motivo_cita || null)
      .input('info_relevante',      sql.VarChar(500), info_relevante || null)
      .input('observaciones',       sql.VarChar(500), observaciones || null)
      .input('responsable_registro',sql.VarChar(100), responsable_registro || 'Recepción')
      .input('estado_cita',         sql.VarChar(20),  'PROGRAMADA');

    // Ajusta nombres de columnas según tu tabla Cita
    const insertQuery = `
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
        estado_cita
      )
      OUTPUT INSERTED.*
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
        @estado_cita
      );
    `;

    const result = await request.query(insertQuery);
    const nuevaCita = result.recordset[0];

    res.status(201).json({
      message: 'Cita creada correctamente',
      cita: nuevaCita
    });
  } catch (err) {
    console.error('Error al crear cita:', err);
    res.status(500).json({ error: 'Error interno al crear la cita' });
  }
});

// ======================================================
//                   PACIENTES
// ======================================================

/*
   GET /pacientes
*/
app.get('/pacientes', async (req, res) => {
  try {
    const pool = await poolPromise;

    const {
      q,
      canal_preferente,
      page = 1,
      pageSize = 20
    } = req.query;

    const filtros = [];
    const params = {};

    if (q) {
      filtros.push('(p.nombre LIKE @q OR p.apellidos LIKE @q OR p.email LIKE @q)');
      params.q = `%${q}%`;
    }

    if (canal_preferente) {
      filtros.push('p.canal_preferente = @canal_preferente');
      params.canal_preferente = canal_preferente;
    }

    const whereClause = filtros.length ? 'WHERE ' + filtros.join(' AND ') : '';

    const pageNumber = parseInt(page, 10) || 1;
    const sizeNumber = parseInt(pageSize, 10) || 20;
    const offset = (pageNumber - 1) * sizeNumber;

    // -------- total de registros --------
    const countReq = pool.request();
    if (params.q) countReq.input('q', sql.NVarChar(200), params.q);
    if (params.canal_preferente) {
      countReq.input('canal_preferente', sql.NVarChar(16), params.canal_preferente);
    }

    const countResult = await countReq.query(`
      SELECT COUNT(*) AS total
      FROM Paciente p
      ${whereClause};
    `);

    const total = countResult.recordset[0].total;

    // -------- página de datos --------
    const dataReq = pool.request();
    if (params.q) dataReq.input('q', sql.NVarChar(200), params.q);
    if (params.canal_preferente) {
      dataReq.input('canal_preferente', sql.NVarChar(16), params.canal_preferente);
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
      OFFSET @offset ROWS
      FETCH NEXT @pageSize ROWS ONLY;
    `);

    res.json({
      total,
      page: pageNumber,
      pageSize: sizeNumber,
      pacientes: dataResult.recordset
    });
  } catch (err) {
    console.error('Error al listar pacientes:', err);
    res.status(500).json({ error: 'Error interno al listar pacientes' });
  }
});

/*
   GET /pacientes/:id
   Detalle de un paciente
 */
app.get('/pacientes/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'El id del paciente debe ser un entero válido' });
    }

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

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error al obtener paciente:', err);
    res.status(500).json({ error: 'Error interno al obtener el paciente' });
  }
});

/*
    POST /pacientes
    Crea un nuevo paciente
 */
app.post('/pacientes', async (req, res) => {
  try {
    const {
      nombre,
      apellidos,
      fecha_nacimiento, // string 'YYYY-MM-DD' o null
      telefono,
      email,
      canal_preferente
    } = req.body;

    // Validaciones básicas
    if (!nombre || !apellidos || !canal_preferente) {
      return res.status(400).json({
        error: 'nombre, apellidos y canal_preferente son obligatorios'
      });
    }

    const pool = await poolPromise;
    const request = pool.request();

    request.input('nombre', sql.NVarChar(80), nombre);
    request.input('apellidos', sql.NVarChar(120), apellidos);

    if (fecha_nacimiento) {
      request.input('fecha_nacimiento', sql.Date, fecha_nacimiento);
    } else {
      request.input('fecha_nacimiento', sql.Date, null);
    }

    request.input('telefono', sql.NVarChar(20), telefono || null);
    request.input('email', sql.NVarChar(120), email || null);
    request.input('canal_preferente', sql.NVarChar(16), canal_preferente);

    const insertResult = await request.query(`
      INSERT INTO Paciente (
        nombre,
        apellidos,
        fecha_nacimiento,
        telefono,
        email,
        canal_preferente,
        fecha_registro
      )
      VALUES (
        @nombre,
        @apellidos,
        @fecha_nacimiento,
        @telefono,
        @email,
        @canal_preferente,
        SYSDATETIME()
      );

      SELECT CAST(SCOPE_IDENTITY() AS int) AS id_paciente;
    `);

    const newId = insertResult.recordset[0].id_paciente;

    res.status(201).json({
      id_paciente: newId,
      nombre,
      apellidos,
      fecha_nacimiento: fecha_nacimiento || null,
      telefono: telefono || null,
      email: email || null,
      canal_preferente
    });
  } catch (err) {
    console.error('Error al crear paciente:', err);
    res.status(500).json({ error: 'Error interno al crear el paciente' });
  }
});

/**
 * PUT /pacientes/:id
 * Actualiza datos de un paciente (parcial)
 */
app.put('/pacientes/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'El id del paciente debe ser un entero válido' });
    }

    const {
      nombre,
      apellidos,
      fecha_nacimiento,
      telefono,
      email,
      canal_preferente
    } = req.body;

    const pool = await poolPromise;
    const request = pool.request();

    request.input('id_paciente', sql.Int, id);

    const sets = [];

    if (nombre !== undefined) {
      sets.push('nombre = @nombre');
      request.input('nombre', sql.NVarChar(80), nombre);
    }

    if (apellidos !== undefined) {
      sets.push('apellidos = @apellidos');
      request.input('apellidos', sql.NVarChar(120), apellidos);
    }

    if (fecha_nacimiento !== undefined) {
      sets.push('fecha_nacimiento = @fecha_nacimiento');
      request.input('fecha_nacimiento', sql.Date, fecha_nacimiento || null);
    }

    if (telefono !== undefined) {
      sets.push('telefono = @telefono');
      request.input('telefono', sql.NVarChar(20), telefono || null);
    }

    if (email !== undefined) {
      sets.push('email = @email');
      request.input('email', sql.NVarChar(120), email || null);
    }

    if (canal_preferente !== undefined) {
      sets.push('canal_preferente = @canal_preferente');
      request.input('canal_preferente', sql.NVarChar(16), canal_preferente);
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    const updateSql = `
      UPDATE Paciente
      SET ${sets.join(', ')}
      WHERE id_paciente = @id_paciente;
    `;

    const result = await request.query(updateSql);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    res.json({ message: 'Paciente actualizado correctamente' });
  } catch (err) {
    console.error('Error al actualizar paciente:', err);
    res.status(500).json({ error: 'Error interno al actualizar el paciente' });
  }
});


/* ---------- POST /citas (Endpoint 1) ---------- */
app.post('/citas', async (req, res) => {
  let transaction;

  try {
    const {
      id_paciente,
      id_medico,
      id_tratamiento,
      fecha_cita,
      medio_solicitud,
      motivo_cita,
      info_relevante,
      observaciones,
      responsable_registro,
      requiere_anticipo,
      monto_anticipo
    } = req.body;

    if (!id_paciente || !id_medico || !fecha_cita || !medio_solicitud) {
      return res.status(400).json({
        error:
          'id_paciente, id_medico, fecha_cita y medio_solicitud son obligatorios'
      });
    }

    const folio = generarFolioCita();
    const pool = await poolPromise;
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // Insertar Cita
    const reqCita = new sql.Request(transaction);
    reqCita.input('folio_cita', sql.NVarChar(20), folio);
    reqCita.input('id_paciente', sql.Int, id_paciente);
    reqCita.input('id_medico', sql.Int, id_medico);
    reqCita.input('id_tratamiento', sql.Int, id_tratamiento || null);
    reqCita.input('fecha_cita', sql.DateTime2, new Date(fecha_cita));
    reqCita.input('medio_solicitud', sql.NVarChar(20), medio_solicitud);
    reqCita.input('motivo_cita', sql.NVarChar(200), motivo_cita || null);
    reqCita.input('info_relevante', sql.NVarChar(500), info_relevante || null);
    reqCita.input('observaciones', sql.NVarChar(500), observaciones || null);
    reqCita.input(
      'responsable_registro',
      sql.NVarChar(100),
      responsable_registro || null
    );
    reqCita.input('estado_cita', sql.NVarChar(20), 'PROGRAMADA');
    reqCita.input(
      'estado_pago',
      sql.NVarChar(20),
      requiere_anticipo ? 'PENDIENTE' : 'SIN_PAGO'
    );
    reqCita.input(
      'monto_cobro',
      sql.Decimal(10, 2),
      requiere_anticipo ? monto_anticipo || 0 : null
    );

    const insertCitaQuery = `
      INSERT INTO Cita (
        folio_cita, id_paciente, id_medico, id_tratamiento,
        fecha_cita, medio_solicitud,
        motivo_cita, info_relevante, observaciones, responsable_registro,
        estado_cita, estado_pago, monto_cobro
      )
      OUTPUT INSERTED.id_cita
      VALUES (
        @folio_cita, @id_paciente, @id_medico, @id_tratamiento,
        @fecha_cita, @medio_solicitud,
        @motivo_cita, @info_relevante, @observaciones, @responsable_registro,
        @estado_cita, @estado_pago, @monto_cobro
      );
    `;

    const resultCita = await reqCita.query(insertCitaQuery);
    const id_cita = resultCita.recordset[0].id_cita;

    let id_anticipo = null;

    // Si requiere anticipo, registrar en AnticipoCita
    if (requiere_anticipo && monto_anticipo && monto_anticipo > 0) {
      const reqAnt = new sql.Request(transaction);
      reqAnt.input('id_cita', sql.Int, id_cita);
      reqAnt.input('id_paciente', sql.Int, id_paciente);
      reqAnt.input('monto_anticipo', sql.Decimal(10, 2), monto_anticipo);
      reqAnt.input('estado', sql.NVarChar(20), 'PENDIENTE');

      const insertAntQuery = `
        INSERT INTO AnticipoCita (id_cita, id_paciente, monto_anticipo, estado)
        OUTPUT INSERTED.id_anticipo
        VALUES (@id_cita, @id_paciente, @monto_anticipo, @estado);
      `;

      const resultAnt = await reqAnt.query(insertAntQuery);
      id_anticipo = resultAnt.recordset[0].id_anticipo;
    }

    await transaction.commit();

    res.status(201).json({
      message: 'Cita creada correctamente',
      cita: { id_cita, folio_cita: folio },
      anticipo: id_anticipo ? { id_anticipo } : null
    });
  } catch (err) {
    console.error('Error en POST /citas:', err);
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rbErr) {
        console.error('Error al hacer rollback /citas:', rbErr);
      }
    }
    res.status(500).json({ error: 'Error al crear la cita' });
  }
});

/* ---------- POST /citas/:id/confirmar-pago (Endpoint intermedio) ---------- */
/*
   Uso pensado para el FRONT de Gestión de Citas:

   - El usuario ya tiene el id de pago que generó Caja (id_pago_caja).
   - Llama a este endpoint con la cita concreta.
   - El backend:
        1) Busca el AnticipoCita PENDIENTE de esa cita.
        2) Lo marca como PAGADO y guarda el id_pago_caja.
        3) Actualiza la Cita.estado_pago -> 'PAGADO'.

   En una integración real, este flujo lo dispararía Caja vía webhook,
   pero aquí lo usamos como confirmación "manual" desde Gestión de Citas.
*/
app.post('/citas/:id/confirmar-pago', async (req, res) => {
  const idCita = parseInt(req.params.id, 10);
  const { id_pago } = req.body;
  let transaction;

  // Validaciones básicas
  if (isNaN(idCita)) {
    return res.status(400).json({
      error: 'El id de la cita debe ser un número entero válido',
    });
  }

  if (!id_pago) {
    return res.status(400).json({
      error: 'id_pago es obligatorio',
    });
  }

  try {
    const pool = await poolPromise;
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // 1) Buscar el anticipo PENDIENTE asociado a esta cita
    const reqSelect = new sql.Request(transaction);
    reqSelect.input('id_cita', sql.Int, idCita);

    const resultAnt = await reqSelect.query(`
      SELECT TOP 1 id_anticipo, id_paciente, monto_anticipo, estado
      FROM AnticipoCita
      WHERE id_cita = @id_cita AND estado = 'PENDIENTE'
      ORDER BY fecha_solicitud DESC;
    `);

    if (resultAnt.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({
        error: 'No hay anticipo pendiente para esta cita',
      });
    }

    const anticipo = resultAnt.recordset[0];

    // 2) Actualizar AnticipoCita -> PAGADO
    const reqUpdateAnt = new sql.Request(transaction);
    reqUpdateAnt.input('id_anticipo', sql.Int, anticipo.id_anticipo);
    reqUpdateAnt.input('id_pago_caja', sql.NVarChar(50), id_pago);

    await reqUpdateAnt.query(`
      UPDATE AnticipoCita
      SET estado = 'PAGADO',
          id_pago_caja = @id_pago_caja,
          fecha_confirmacion = SYSDATETIME()
      WHERE id_anticipo = @id_anticipo;
    `);

    // 3) Actualizar Cita.estado_pago -> PAGADO
    const reqUpdateCita = new sql.Request(transaction);
    reqUpdateCita.input('id_cita', sql.Int, idCita);
    reqUpdateCita.input('id_pago_caja', sql.NVarChar(50), id_pago);

    await reqUpdateCita.query(`
      UPDATE Cita
      SET estado_pago = 'PAGADO',
          id_pago_caja = @id_pago_caja
      WHERE id_cita = @id_cita;
    `);

    await transaction.commit();

    return res.json({
      message: 'Pago confirmado correctamente para la cita',
      anticipo: {
        id_anticipo: anticipo.id_anticipo,
        id_cita: idCita,
        id_paciente: anticipo.id_paciente,
      },
    });
  } catch (err) {
    console.error('Error en POST /citas/:id/confirmar-pago:', err);
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rbErr) {
        console.error(
          'Error al hacer rollback /citas/:id/confirmar-pago:',
          rbErr
        );
      }
    }
    return res.status(500).json({
      error: 'Error al confirmar el pago de la cita',
    });
  }
});


/* ---------- POST /pagos/notificacion (Endpoint 2) ---------- */
/*
   Caja llama a este endpoint cuando el pago del anticipo fue exitoso.
*/
app.post('/pagos/notificacion', async (req, res) => {
  const { id_paciente, id_pago } = req.body;
  let transaction;

  if (!id_paciente || !id_pago) {
    return res.status(400).json({
      error: 'id_paciente e id_pago son obligatorios'
    });
  }

  try {
    const pool = await poolPromise;
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // 1) Buscar el anticipo PENDIENTE más reciente del paciente
    const reqSelect = new sql.Request(transaction);
    reqSelect.input('id_paciente', sql.Int, id_paciente);

    const resultAnt = await reqSelect.query(`
      SELECT TOP 1 id_anticipo, id_cita, monto_anticipo, estado
      FROM AnticipoCita
      WHERE id_paciente = @id_paciente AND estado = 'PENDIENTE'
      ORDER BY fecha_solicitud DESC;
    `);

    if (resultAnt.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({
        error: 'No hay anticipo pendiente para este paciente'
      });
    }

    const anticipo = resultAnt.recordset[0];

    // 2) Actualizar AnticipoCita -> PAGADO
    const reqUpdateAnt = new sql.Request(transaction);
    reqUpdateAnt.input('id_anticipo', sql.Int, anticipo.id_anticipo);
    reqUpdateAnt.input('id_pago_caja', sql.NVarChar(50), id_pago);

    await reqUpdateAnt.query(`
      UPDATE AnticipoCita
      SET estado = 'PAGADO',
          id_pago_caja = @id_pago_caja,
          fecha_confirmacion = SYSDATETIME()
      WHERE id_anticipo = @id_anticipo;
    `);

    // 3) Actualizar Cita.estado_pago -> PAGADO
    const reqUpdateCita = new sql.Request(transaction);
    reqUpdateCita.input('id_cita', sql.Int, anticipo.id_cita);
    reqUpdateCita.input('id_pago_caja', sql.NVarChar(50), id_pago);

    await reqUpdateCita.query(`
      UPDATE Cita
      SET estado_pago = 'PAGADO',
          id_pago_caja = @id_pago_caja
      WHERE id_cita = @id_cita;
    `);

    await transaction.commit();

    res.json({
      message: 'Pago de anticipo registrado correctamente',
      anticipo: {
        id_anticipo: anticipo.id_anticipo,
        id_cita: anticipo.id_cita,
        id_paciente
      }
    });
  } catch (err) {
    console.error('Error en POST /pagos/notificacion:', err);
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rbErr) {
        console.error('Error al hacer rollback /pagos/notificacion:', rbErr);
      }
    }
    res.status(500).json({
      error: 'Error al registrar el pago del anticipo'
    });
  }
});

// Endpoint 3: POST /citas/:id/iniciar-atencion
app.post('/citas/:id/iniciar-atencion', async (req, res) => {
  const idCita = parseInt(req.params.id, 10);

  if (isNaN(idCita)) {
    return res.status(400).json({ message: 'id_cita inválido' });
  }

  let pool;
  try {
    pool = await poolPromise;

    // 1. Obtener la cita
    const citaResult = await pool.request()
      .input('id_cita', sql.Int, idCita)
      .query(`
        SELECT *
        FROM Cita
        WHERE id_cita = @id_cita
      `);

    if (citaResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Cita no encontrada' });
    }

    const cita = citaResult.recordset[0];

    // 2. Validar estado de la cita
    if (cita.estado_cita === 'CANCELADA') {
      return res.status(409).json({
        message: 'No se puede iniciar la atención de una cita cancelada'
      });
    }

    if (cita.estado_cita === 'ATENDIDA') {
      return res.status(409).json({
        message: 'Esta cita ya fue atendida'
      });
    }

    // 3. Verificar si hay anticipo asociado
    const anticipoResult = await pool.request()
      .input('id_cita', sql.Int, idCita)
      .query(`
        SELECT TOP 1 *
        FROM AnticipoCita
        WHERE id_cita = @id_cita
        ORDER BY fecha_solicitud DESC
      `);

    if (anticipoResult.recordset.length > 0) {
      const anticipo = anticipoResult.recordset[0];

      if (anticipo.estado !== 'PAGADO') {
        return res.status(409).json({
          message: 'La cita requiere anticipo y aún no está pagado',
          anticipo: {
            id_anticipo: anticipo.id_anticipo,
            estado: anticipo.estado
          }
        });
      }
    }

    // 4. (Aquí iría la verificación real de saldo con Caja, cuando exista su API)
    // Por ahora asumimos que si el anticipo está PAGADO, el saldo es suficiente.

    // 5. Actualizar estado de la cita a CONFIRMADA
    await pool.request()
      .input('id_cita', sql.Int, idCita)
      .query(`
        UPDATE Cita
        SET estado_cita = 'CONFIRMADA'
        WHERE id_cita = @id_cita
      `);

    return res.status(200).json({
      message: 'Cita lista para iniciar atención en clínica',
      cita: {
        id_cita: cita.id_cita,
        folio_cita: cita.folio_cita,
        estado_cita: 'CONFIRMADA'
      }
    });

  } catch (err) {
    console.error('Error al iniciar atención:', err);
    return res.status(500).json({
      message: 'Error al intentar iniciar la atención de la cita'
    });
  }
});

// GET /citas  -> lista de citas con filtros opcionales
app.get('/citas', async (req, res) => {
  const {
    fecha_desde,
    fecha_hasta,
    estado_cita,
    id_paciente,
    id_medico
  } = req.query;

  try {
    const pool = await poolPromise;

    // Construimos la consulta base
    let query = `
      SELECT 
        c.id_cita,
        c.folio_cita,
        c.fecha_registro,
        c.fecha_cita,
        c.estado_cita,
        c.medio_solicitud,
        c.motivo_cita,
        c.info_relevante,
        c.observaciones,
        c.responsable_registro,
        c.saldo_paciente,
        c.monto_cobro,
        c.estado_pago,

        p.id_paciente,
        p.nombre AS nombre_paciente,
        p.apellidos AS apellidos_paciente,

        m.id_medico,
        m.nombre AS nombre_medico,
        m.apellidos AS apellidos_medico,

        t.id_tratamiento,
        t.nombre AS nombre_tratamiento
      FROM Cita c
      INNER JOIN Paciente p   ON c.id_paciente = p.id_paciente
      INNER JOIN Medico   m   ON c.id_medico   = m.id_medico
      LEFT  JOIN Tratamiento t ON c.id_tratamiento = t.id_tratamiento
      WHERE 1 = 1
    `;

    const request = pool.request();

    // Filtros opcionales

    // Rango de fechas (sobre fecha_cita)
    if (fecha_desde) {
      query += ' AND c.fecha_cita >= @fecha_desde';
      request.input('fecha_desde', sql.DateTime2, new Date(fecha_desde));
    }

    if (fecha_hasta) {
      query += ' AND c.fecha_cita <= @fecha_hasta';
      request.input('fecha_hasta', sql.DateTime2, new Date(fecha_hasta));
    }

    // Estado de la cita (PROGRAMADA, CONFIRMADA, CANCELADA, ATENDIDA)
    if (estado_cita) {
      query += ' AND c.estado_cita = @estado_cita';
      request.input('estado_cita', sql.NVarChar(20), estado_cita);
    }

    // Filtro por paciente
    if (id_paciente) {
      query += ' AND c.id_paciente = @id_paciente';
      request.input('id_paciente', sql.Int, parseInt(id_paciente, 10));
    }

    // Filtro por médico
    if (id_medico) {
      query += ' AND c.id_medico = @id_medico';
      request.input('id_medico', sql.Int, parseInt(id_medico, 10));
    }

    // Ordenamos por fecha de cita
    query += ' ORDER BY c.fecha_cita DESC';

    const result = await request.query(query);

    return res.json({
      total: result.recordset.length,
      citas: result.recordset
    });

  } catch (err) {
    console.error('Error al listar citas:', err);
    return res.status(500).json({
      error: 'Error al obtener las citas'
    });
  }
});

// GET /citas/resumen - versión ligera para listas del front
app.get('/citas/resumen', async (req, res) => {
  const {
    id_paciente,
    id_medico,
    estado_cita,
    fecha_desde,
    fecha_hasta,
    page = 1,
    pageSize = 20,
  } = req.query;

  const offset = (page - 1) * pageSize;

  try {
    const pool = await poolPromise;

    // Filtros dinámicos
    const whereClauses = [];
    const params = {};

    if (id_paciente) {
      whereClauses.push('c.id_paciente = @id_paciente');
      params.id_paciente = parseInt(id_paciente, 10);
    }

    if (id_medico) {
      whereClauses.push('c.id_medico = @id_medico');
      params.id_medico = parseInt(id_medico, 10);
    }

    if (estado_cita) {
      whereClauses.push('c.estado_cita = @estado_cita');
      params.estado_cita = estado_cita;
    }

    if (fecha_desde) {
      whereClauses.push('c.fecha_cita >= @fecha_desde');
      params.fecha_desde = fecha_desde;
    }

    if (fecha_hasta) {
      whereClauses.push('c.fecha_cita < @fecha_hasta');
      params.fecha_hasta = fecha_hasta;
    }

    const whereSql = whereClauses.length > 0
      ? 'WHERE ' + whereClauses.join(' AND ')
      : '';

    // Query principal (solo campos ligeros)
    const sqlQuery = `
      SELECT
        c.id_cita,
        c.folio_cita,
        c.fecha_cita,
        c.estado_cita,
        ISNULL(a.estado, 'SIN_ANTICIPO') AS estado_pago,
        p.nombre AS nombre_paciente,
        m.nombre AS nombre_medico,
        t.nombre AS nombre_tratamiento
      FROM Cita c
      INNER JOIN Paciente p ON c.id_paciente = p.id_paciente
      INNER JOIN Medico m   ON c.id_medico   = m.id_medico
      INNER JOIN Tratamiento t ON c.id_tratamiento = t.id_tratamiento
      LEFT JOIN AnticipoCita a ON c.id_cita = a.id_cita
      ${whereSql}
      ORDER BY c.fecha_cita DESC, c.id_cita DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
    `;

    // Query para contar total (sin paginación)
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM Cita c
      ${whereSql};
    `;

    const request = pool.request();
    const countRequest = pool.request();

    // Parámetros compartidos
    Object.entries(params).forEach(([key, value]) => {
      request.input(key, value);
      countRequest.input(key, value);
    });

    request.input('offset', sql.Int, offset);
    request.input('pageSize', sql.Int, parseInt(pageSize, 10));

    const [result, countResult] = await Promise.all([
      request.query(sqlQuery),
      countRequest.query(countQuery),
    ]);

    const total = countResult.recordset[0].total;

    res.json({
      total,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10),
      citas: result.recordset,
    });
  } catch (error) {
    console.error('Error al obtener resumen de citas:', error);
    res.status(500).json({ error: 'Error al obtener resumen de citas' });
  }
});


// Endpoint 4: Obtener detalle de una cita por ID
app.get('/citas/:id', async (req, res) => {
  const { id } = req.params;

  // Validar que el id sea numérico
  if (!/^\d+$/.test(id)) {
    return res.status(400).json({
      error: "El id de la cita debe ser un número entero válido"
    });
  }

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('id_cita', sql.Int, parseInt(id, 10))
      .query(`
        SELECT 
          c.id_cita,
          c.folio_cita,
          c.fecha_registro,
          c.fecha_cita,
          c.estado_cita,
          c.medio_solicitud,
          c.motivo_cita,
          c.info_relevante,
          c.observaciones,
          c.responsable_registro,
          c.saldo_paciente,
          c.monto_cobro,
          c.estado_pago,

          -- Paciente
          p.id_paciente,
          p.nombre       AS nombre_paciente,
          p.apellidos    AS apellidos_paciente,
          p.telefono     AS telefono_paciente,
          p.email        AS email_paciente,
          p.canal_preferente,

          -- Médico
          m.id_medico,
          m.nombre       AS nombre_medico,
          m.apellidos    AS apellidos_medico,
          m.especialidad,
          m.cedula_profesional,

          -- Tratamiento
          t.id_tratamiento,
          t.cve_trat,
          t.nombre       AS nombre_tratamiento,
          t.descripcion  AS descripcion_tratamiento,
          t.precio_base,
          t.duracion_min,

          -- Anticipo (si existe)
          a.id_anticipo,
          a.monto_anticipo,
          a.estado       AS estado_anticipo,
          a.id_pago_caja,
          a.fecha_solicitud,
          a.fecha_confirmacion
        FROM Cita c
        INNER JOIN Paciente p ON c.id_paciente = p.id_paciente
        INNER JOIN Medico   m ON c.id_medico   = m.id_medico
        INNER JOIN Tratamiento t ON c.id_tratamiento = t.id_tratamiento
        LEFT JOIN AnticipoCita a ON c.id_cita = a.id_cita
        WHERE c.id_cita = @id_cita;
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        error: "Cita no encontrada"
      });
    }

    const row = result.recordset[0];

    // Estructuramos la respuesta bonita
    const cita = {
      id_cita: row.id_cita,
      folio_cita: row.folio_cita,
      fecha_registro: row.fecha_registro,
      fecha_cita: row.fecha_cita,
      estado_cita: row.estado_cita,
      medio_solicitud: row.medio_solicitud,
      motivo_cita: row.motivo_cita,
      info_relevante: row.info_relevante,
      observaciones: row.observaciones,
      responsable_registro: row.responsable_registro,
      saldo_paciente: row.saldo_paciente,
      monto_cobro: row.monto_cobro,
      estado_pago: row.estado_pago,
      paciente: {
        id_paciente: row.id_paciente,
        nombre: row.nombre_paciente,
        apellidos: row.apellidos_paciente,
        telefono: row.telefono_paciente,
        email: row.email_paciente,
        canal_preferente: row.canal_preferente
      },
      medico: {
        id_medico: row.id_medico,
        nombre: row.nombre_medico,
        apellidos: row.apellidos_medico,
        especialidad: row.especialidad,
        cedula_profesional: row.cedula_profesional
      },
      tratamiento: {
        id_tratamiento: row.id_tratamiento,
        clave: row.cve_trat,
        nombre: row.nombre_tratamiento,
        descripcion: row.descripcion_tratamiento,
        precio_base: row.precio_base,
        duracion_min: row.duracion_min
      },
      anticipo: row.id_anticipo ? {
        id_anticipo: row.id_anticipo,
        monto_anticipo: row.monto_anticipo,
        estado: row.estado_anticipo,
        id_pago_caja: row.id_pago_caja,
        fecha_solicitud: row.fecha_solicitud,
        fecha_confirmacion: row.fecha_confirmacion
      } : null
    };

    res.json({ cita });
  } catch (error) {
    console.error('Error al obtener detalle de cita:', error);
    res.status(500).json({
      error: "Error interno al obtener detalle de la cita"
    });
  }
});


// Endpoint 3b: Marcar cita como ATENDIDA
app.post('/citas/:id/atendida', async (req, res) => {
  const idCita = parseInt(req.params.id, 10);

  if (isNaN(idCita)) {
    return res.status(400).json({
      message: 'El id de la cita debe ser un número entero válido',
    });
  }

  try {
    const pool = await poolPromise;

    // 1) Traer la cita y verificar su estado actual + anticipo
    const checkReq = pool.request();
    checkReq.input('id_cita', sql.Int, idCita);

    const checkResult = await checkReq.query(`
      SELECT TOP 1 
        c.id_cita,
        c.folio_cita,
        c.estado_cita,
        c.estado_pago,
        a.id_anticipo,
        a.estado AS estado_anticipo
      FROM Cita c
      LEFT JOIN AnticipoCita a
        ON a.id_cita = c.id_cita
        AND a.estado = 'PENDIENTE'
      WHERE c.id_cita = @id_cita;
    `);

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Cita no encontrada' });
    }

    const cita = checkResult.recordset[0];

    // 2) Validaciones de negocio
    if (cita.estado_cita === 'ATENDIDA') {
      return res.status(400).json({ message: 'La cita ya está marcada como ATENDIDA' });
    }

    if (cita.estado_cita === 'CANCELADA') {
      return res.status(400).json({ message: 'No se puede marcar como ATENDIDA una cita CANCELADA' });
    }

    if (cita.estado_cita !== 'CONFIRMADA') {
      return res.status(400).json({
        message: `Solo se pueden marcar como ATENDIDA las citas en estado CONFIRMADA (estado actual: ${cita.estado_cita})`,
      });
    }

    if (cita.estado_anticipo === 'PENDIENTE') {
      return res.status(400).json({
        message: 'La cita tiene un anticipo PENDIENTE. Debe confirmarse el pago antes de marcarla como ATENDIDA.',
      });
    }

    // 3) Actualizar estado a ATENDIDA
    const updateReq = pool.request();
    updateReq.input('id_cita', sql.Int, idCita);

    const updateResult = await updateReq.query(`
      UPDATE Cita
      SET estado_cita = 'ATENDIDA'
          -- Si más adelante agregas columna fecha_atencion, aquí va:
          -- , fecha_atencion = GETDATE()
      OUTPUT INSERTED.id_cita,
             INSERTED.folio_cita,
             INSERTED.estado_cita,
             INSERTED.fecha_cita
      WHERE id_cita = @id_cita;
    `);

    const citaActualizada = updateResult.recordset[0];

    return res.json({
      message: 'Cita marcada como ATENDIDA correctamente',
      cita: citaActualizada,
    });
  } catch (error) {
    console.error('Error al marcar cita como ATENDIDA:', error);
    return res.status(500).json({
      message: 'Error al marcar la cita como ATENDIDA',
    });
  }
});



// Crear médico nuevo
app.post('/medicos', async (req, res) => {
  const {
    nombre,
    apellidos,
    especialidad,
    cedula_profesional,
    activo,
  } = req.body;

  // Validaciones básicas
  if (!nombre || !apellidos) {
    return res
      .status(400)
      .json({ message: 'nombre y apellidos son obligatorios' });
  }

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('nombre', sql.NVarChar(80), nombre)
      .input('apellidos', sql.NVarChar(120), apellidos)
      .input('especialidad', sql.NVarChar(80), especialidad || null)
      .input('cedula_profesional', sql.NVarChar(30), cedula_profesional || null)
      // si no mandas "activo", por defecto lo dejamos en 1 (TRUE)
      .input(
        'activo',
        sql.Bit,
        typeof activo === 'boolean' ? (activo ? 1 : 0) : 1
      )
      .query(`
        INSERT INTO Medico (nombre, apellidos, especialidad, cedula_profesional, activo)
        OUTPUT INSERTED.*
        VALUES (@nombre, @apellidos, @especialidad, @cedula_profesional, @activo)
      `);

    const medicoCreado = result.recordset[0];

    return res.status(201).json({ medico: medicoCreado });
  } catch (error) {
    console.error('Error al crear médico:', error);
    return res
      .status(500)
      .json({ message: 'Error al crear médico', error: error.message });
  }
});

// Listar médicos
app.get('/medicos', async (req, res) => {
  try {
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
      ORDER BY activo DESC, apellidos, nombre
    `);

    return res.json({ medicos: result.recordset });
  } catch (error) {
    console.error('Error al listar médicos:', error);
    return res
      .status(500)
      .json({ message: 'Error al listar médicos', error: error.message });
  }
});

// Obtener detalle de un médico por id
app.get('/medicos/:id', async (req, res) => {
  const { id } = req.params;

  if (isNaN(Number(id))) {
    return res.status(400).json({ message: 'id inválido' });
  }

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('id_medico', sql.Int, Number(id))
      .query(`
        SELECT
          id_medico,
          nombre,
          apellidos,
          especialidad,
          cedula_profesional,
          activo
        FROM Medico
        WHERE id_medico = @id_medico
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Médico no encontrado' });
    }

    return res.json({ medico: result.recordset[0] });
  } catch (error) {
    console.error('Error al obtener médico:', error);
    return res
      .status(500)
      .json({ message: 'Error al obtener médico', error: error.message });
  }
});

// Crear médico nuevo
app.post('/medicos', async (req, res) => {
  const {
    nombre,
    apellidos,
    especialidad,
    cedula_profesional,
    activo,
  } = req.body;

  if (!nombre || !apellidos) {
    return res
      .status(400)
      .json({ message: 'nombre y apellidos son obligatorios' });
  }

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('nombre', sql.NVarChar(80), nombre)
      .input('apellidos', sql.NVarChar(120), apellidos)
      .input('especialidad', sql.NVarChar(80), especialidad || null)
      .input('cedula_profesional', sql.NVarChar(30), cedula_profesional || null)
      .input(
        'activo',
        sql.Bit,
        typeof activo === 'boolean' ? (activo ? 1 : 0) : 1
      )
      .query(`
        INSERT INTO Medico (nombre, apellidos, especialidad, cedula_profesional, activo)
        OUTPUT INSERTED.*
        VALUES (@nombre, @apellidos, @especialidad, @cedula_profesional, @activo)
      `);

    const medicoCreado = result.recordset[0];

    return res.status(201).json({ medico: medicoCreado });
  } catch (error) {
    console.error('Error al crear médico:', error);
    return res
      .status(500)
      .json({ message: 'Error al crear médico', error: error.message });
  }
});

// Listar tratamientos
app.get('/tratamientos', async (req, res) => {
  try {
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
      ORDER BY activo DESC, nombre
    `);

    return res.json({ tratamientos: result.recordset });
  } catch (error) {
    console.error('Error al listar tratamientos:', error);
    return res
      .status(500)
      .json({ message: 'Error al listar tratamientos', error: error.message });
  }
});

// Obtener detalle de un tratamiento por id
app.get('/tratamientos/:id', async (req, res) => {
  const { id } = req.params;

  if (isNaN(Number(id))) {
    return res.status(400).json({ message: 'id inválido' });
  }

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('id_tratamiento', sql.Int, Number(id))
      .query(`
        SELECT
          id_tratamiento,
          cve_trat,
          nombre,
          descripcion,
          precio_base,
          duracion_min,
          activo
        FROM Tratamiento
        WHERE id_tratamiento = @id_tratamiento
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Tratamiento no encontrado' });
    }

    return res.json({ tratamiento: result.recordset[0] });
  } catch (error) {
    console.error('Error al obtener tratamiento:', error);
    return res
      .status(500)
      .json({ message: 'Error al obtener tratamiento', error: error.message });
  }
});

// Crear tratamiento nuevo
app.post('/tratamientos', async (req, res) => {
  const {
    cve_trat,
    nombre,
    descripcion,
    precio_base,
    duracion_min,
    activo,
  } = req.body;

  if (!cve_trat || !nombre || precio_base == null) {
    return res.status(400).json({
      message: 'cve_trat, nombre y precio_base son obligatorios',
    });
  }

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('cve_trat', sql.NVarChar(20), cve_trat)
      .input('nombre', sql.NVarChar(120), nombre)
      .input('descripcion', sql.NVarChar(400), descripcion || null)
      .input('precio_base', sql.Decimal(10, 2), Number(precio_base))
      .input('duracion_min', sql.Int, duracion_min != null ? Number(duracion_min) : null)
      .input(
        'activo',
        sql.Bit,
        typeof activo === 'boolean' ? (activo ? 1 : 0) : 1
      )
      .query(`
        INSERT INTO Tratamiento
          (cve_trat, nombre, descripcion, precio_base, duracion_min, activo)
        OUTPUT INSERTED.*
        VALUES
          (@cve_trat, @nombre, @descripcion, @precio_base, @duracion_min, @activo)
      `);

    const tratamientoCreado = result.recordset[0];

    return res.status(201).json({ tratamiento: tratamientoCreado });
  } catch (error) {
    console.error('Error al crear tratamiento:', error);
    // posible error de UNIQUE en cve_trat
    return res
      .status(500)
      .json({ message: 'Error al crear tratamiento', error: error.message });
  }
});


/* ---------- Arrancar servidor ---------- */
app.listen(port, () => {
  console.log(`API escuchando en http://localhost:${port}`);
});
