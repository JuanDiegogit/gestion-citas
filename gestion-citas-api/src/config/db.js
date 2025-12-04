// src/config/db.js
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.MYSQLHOST,           // ej. ballast.proxy.rlwy.net
  port: Number(process.env.MYSQLPORT),   // ej. 15604
  user: process.env.MYSQLUSER,           // ej. root
  password: process.env.MYSQLPASSWORD,   // tu password
  database: process.env.MYSQLDATABASE,   // ej. railway
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = { pool };
//fin del documento