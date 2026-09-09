const programarJobAlertas = require('./alertas.job');
const programarJobBackup = require('./backup.job');

function iniciarJobs() {
  programarJobAlertas();
  programarJobBackup();
  require('node-cron').schedule('*/5 * * * *', () => {
    require('../services/notificacion.service').procesarPendientes().catch(error => console.error('[JOB correos]', error.code || 'ERROR'));
  });
}

module.exports = { iniciarJobs };
