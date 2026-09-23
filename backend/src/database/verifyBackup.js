const mysql = require('mysql2/promise');
const { db, backup } = require('../config/env');
const { runBackup } = require('../services/backup.service');
const { verifyBackup, inspectSchema } = require('../services/backupVerification.service');

async function main() {
  const c = await mysql.createConnection({ host: db.host, port: db.port, user: db.user, password: db.password });
  let schema;
  try { schema = await inspectSchema(c, db.database); } finally { await c.end(); }
  console.log('Creando respaldo de la instalación...');
  const file = await runBackup();
  console.log('Comprobando recuperación en una base temporal aislada...');
  const result = await verifyBackup({ file: file.ruta, directory: backup.dir, expectedSchema: schema });
  console.log(JSON.stringify(result, null, 2));
  console.log('OK: respaldo restaurado, estructura y referencias comprobadas; base y usuario temporales eliminados.');
}

main().catch(error => {
  console.error(error.name === 'Error' && error.constructor.name !== 'BackupVerificationError'
    ? 'No se completó la verificación. Revise conexión MySQL, permisos y rutas de las herramientas.'
    : error.message);
  process.exitCode = 1;
});
