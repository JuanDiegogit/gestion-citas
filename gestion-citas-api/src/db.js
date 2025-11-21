const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '12345',
  server: 'localhost',                 // máquina local
  port: 1433,                          // puerto fijo que configuraste
  database: process.env.DB_NAME || 'Gestion_De_Cita',
  options: {
    encrypt: false,
    trustServerCertificate: true
    // OJO: aquí ya NO ponemos instanceName
  }
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('Conectado a SQL Server');
    return pool;
  })
  .catch(err => {
    console.error('Error al conectar a SQL Server:', err);
    throw err;
  });

module.exports = {
  sql,
  poolPromise
};
