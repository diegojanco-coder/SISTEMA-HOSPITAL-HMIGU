const cron = require('node-cron');
const { backup } = require('../config/env');
const backupService = require('../services/backup.service');

/**
 * Job programado: respaldo automático de la base de datos
 * (por defecto todos los días a las 02:00 am).
 */
function programarJobBackup() {
  cron.schedule(backup.cron, async () => {
    try {
      const resultado = await backupService.runBackup();
      console.log(`[JOB backup] Respaldo generado: ${resultado.archivo}`);
    } catch (error) {
      console.error('[JOB backup] Error al generar respaldo:', error.message);
    }
  });
  console.log(`[JOB backup] Programado con cron "${backup.cron}"`);
}

module.exports = programarJobBackup;
