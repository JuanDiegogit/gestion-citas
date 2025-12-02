// src/db/index.js
const sql = require('mssql');

// Configuración de la base de datos tomada desde variables de entorno.
// Ajusta los nombres si tu .env usa otros.
const dbConfig = {
  user: process.env.DB_USER,          // ej. 'sa'
  password: process.env.DB_PASSWORD,  // ej. 'tu_password'
  server: process.env.DB_SERVER,      // ej. 'localhost' o '192.168.0.10'
  database: process.env.DB_NAME,      // ej. 'ClinicaDentalDB'
  port: parseInt(process.env.DB_PORT || '1433', 10),
  options: {
    // Para Azure u otros entornos que requieren encrypt:
    encrypt: process.env.DB_ENCRYPT === 'true',          // por defecto false
    // En desarrollo local normalmente se deja true:
    trustServerCertificate: process.env.DB_TRUST_CERT !== 'false',
  },
};

// Creamos un pool único para toda la app
const poolPromise = new sql.ConnectionPool(dbConfig)
  .connect()
  .then((pool) => {
    console.log('[DB] Conexión establecida con SQL Server');
    return pool;
  })
  .catch((err) => {
    console.error('[DB] Error al conectar con SQL Server:', err);
    // Propagamos el error para que falle el arranque si no hay BD
    throw err;
  });

// Manejo de errores globales del driver
sql.on('error', (err) => {
  console.error('[DB] Error global de SQL:', err);
});

module.exports = {
  sql,
  poolPromise,
};
