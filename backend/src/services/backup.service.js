const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { db, backup } = require('../config/env');

/**
 * Módulo de respaldo automático de la base de datos.
 * Ejecuta `mysqldump` como subproceso y guarda el .sql resultante
 * en el directorio configurado (BACKUP_DIR), con marca de tiempo.
 * Se invoca tanto desde el endpoint administrativo POST /backup
 * como desde el job programado (node-cron).
 */
function runBackup() {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(backup.dir)) {
      fs.mkdirSync(backup.dir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const nombreArchivo = `backup_${db.database}_${timestamp}.sql`;
    const rutaCompleta = path.join(backup.dir, nombreArchivo);

    const args = [
      `-h${db.host}`,
      `-P${db.port}`,
      `-u${db.user}`,
      db.password ? `-p${db.password}` : null,
      '--routines',
      '--events',
      '--single-transaction',
      db.database
    ].filter(Boolean);

    const dump = spawn(backup.mysqldumpPath, args);
    const writeStream = fs.createWriteStream(rutaCompleta);
    dump.stdout.pipe(writeStream);

    let errorOutput = '';
    dump.stderr.on('data', (chunk) => { errorOutput += chunk.toString(); });

    dump.on('error', (err) => reject(new Error(`No se pudo ejecutar mysqldump: ${err.message}`)));

    dump.on('close', (code) => {
      if (code === 0) {
        resolve({ archivo: nombreArchivo, ruta: rutaCompleta, fecha: new Date().toISOString() });
      } else {
        reject(new Error(`mysqldump finalizó con código ${code}: ${errorOutput}`));
      }
    });
  });
}

function listarBackups() {
  if (!fs.existsSync(backup.dir)) return [];
  return fs.readdirSync(backup.dir)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => {
      const stats = fs.statSync(path.join(backup.dir, f));
      return { archivo: f, tamanioBytes: stats.size, fecha: stats.mtime };
    })
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

module.exports = { runBackup, listarBackups };
