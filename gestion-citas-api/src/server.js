// src/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { PORT } = require('./config/env');

const citasRoutes = require('./modules/citas/citas.routes');
const pacientesRoutes = require('./modules/pacientes/pacientes.routes');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');
const medicosRoutes = require('./modules/Medicos/medicos.routes');           
const tratamientosRoutes = require('./modules/Tratamientos/tratamientos.routes'); 

const app = express();

// ──────────────────────────────────────────────
//  Middlewares globales
// ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ──────────────────────────────────────────────
//  Health check
// ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SIGCD',
    timestamp: new Date().toISOString(),
  });
});

// ──────────────────────────────────────────────
//  Rutas de dominio
// ──────────────────────────────────────────────
app.use('/citas', citasRoutes);
app.use('/pacientes', pacientesRoutes);
app.use('/medicos', medicosRoutes);           // ← nuevo
app.use('/tratamientos', tratamientosRoutes); // ← nuevo

// ──────────────────────────────────────────────
//  Middlewares finales
// ──────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ──────────────────────────────────────────────
//  Arrancar servidor
// ──────────────────────────────────────────────
const listenPort = PORT || process.env.PORT || 3001;

app.listen(listenPort, () => {
  console.log(`API SIGCD escuchando en http://localhost:${listenPort}`);
});


module.exports = app;
//fin del documento