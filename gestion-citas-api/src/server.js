// src/server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const { pool } = require('./config/db');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

// Rutas de módulos
const medicosRoutes = require('./modules/Medicos/medicos.routes');
const pacientesRoutes = require('./modules/pacientes/pacientes.routes');
const tratamientosRoutes = require('./modules/Tratamientos/tratamientos.routes');
const citasRoutes = require('./modules/citas/citas.routes');

const app = express();

// ───────────────────────────────
// Middlewares base
// ───────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log sencillo de peticiones (útil en Render)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ───────────────────────────────
// Healthcheck (Render / monitoreo)
// ───────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SIGCD',
    timestamp: new Date().toISOString(),
  });
});

// ───────────────────────────────
// Rutas de la API
// ───────────────────────────────
app.use('/medicos', medicosRoutes);
app.use('/pacientes', pacientesRoutes);
app.use('/tratamientos', tratamientosRoutes);
app.use('/citas', citasRoutes);

// ───────────────────────────────
// Middlewares finales
// ───────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ───────────────────────────────
// Arrancar servidor
// ───────────────────────────────
const PORT = process.env.PORT || 3001;

// Solo levantar el servidor si este archivo se ejecuta directamente
if (require.main === module) {
  (async () => {
    try {
      // Prueba rápida de conexión a MySQL
      await pool.query('SELECT 1');
      console.log('Conexión a MySQL OK');

      app.listen(PORT, () => {
        console.log(`API SIGCD escuchando en http://0.0.0.0:${PORT}`);
      });
    } catch (err) {
      console.error('Error al conectar a MySQL al iniciar:', err);
      // Si falla la conexión, Render ve que el proceso termina y marca el deploy como fallido
      process.exit(1);
    }
  })();
}

module.exports = app;
// fin del documento