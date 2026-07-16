/**
 * Pool de conexiones MySQL (mysql2/promise).
 * Se usa un pool en vez de conexiones individuales para soportar
 * concurrencia real en producción y reconexión automática.
 */
const mysql = require('mysql2/promise');
const { db } = require('./env');

const pool = mysql.createPool({
  host: db.host,
  port: db.port,
  user: db.user,
  password: db.password,
  database: db.database,
  waitForConnections: true,
  connectionLimit: db.connectionLimit,
  queueLimit: 0,
  dateStrings: true // devuelve DATE/DATETIME como string 'YYYY-MM-DD[ HH:mm:ss]'
});

/**
 * Verifica la conexión a la base de datos al iniciar el servidor.
 */
async function testConnection() {
  const conn = await pool.getConnection();
  try {
    await conn.query('SELECT 1');
    console.log(`[DB] Conectado a MySQL en ${db.host}:${db.port}/${db.database}`);
  } finally {
    conn.release();
  }
}

module.exports = { pool, testConnection };
