/**
 * Script de utilidad para inicializar la base de datos:
 *   node src/database/runMigrations.js          -> crea el esquema (schema.sql)
 *   node src/database/runMigrations.js --seed    -> además carga datos semilla (seed.sql)
 *
 * Ejecuta los .sql directamente contra el servidor MySQL usando las
 * credenciales de .env (sin depender de la CLI `mysql`).
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { db } = require('../config/env');

async function ejecutarArchivoSQL(connection, rutaArchivo) {
  const sql = fs.readFileSync(rutaArchivo, 'utf8');
  console.log(`[MIGRATE] Ejecutando ${path.basename(rutaArchivo)} ...`);
  await connection.query(sql);
  console.log(`[MIGRATE] OK: ${path.basename(rutaArchivo)}`);
}

async function main() {
  const incluirSeed = process.argv.includes('--seed');

  // Conexión sin base de datos seleccionada, porque schema.sql la crea.
  const connection = await mysql.createConnection({
    host: db.host,
    port: db.port,
    user: db.user,
    password: db.password,
    multipleStatements: true
  });

  try {
    await ejecutarArchivoSQL(connection, path.join(__dirname, 'schema.sql'));
    if (incluirSeed) {
      await ejecutarArchivoSQL(connection, path.join(__dirname, 'seed.sql'));
    }
    console.log('[MIGRATE] Base de datos inicializada correctamente.');
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('[MIGRATE] Error:', err.message);
  process.exit(1);
});
