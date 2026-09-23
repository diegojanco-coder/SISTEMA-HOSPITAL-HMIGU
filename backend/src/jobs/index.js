const programarJobAlertas = require('./alertas.job');
const programarJobBackup = require('./backup.job');

function iniciarJobs() {
  const config=require('../config/env'),cron=require('node-cron');
  if(!cron.validate(config.alertasCron)||!cron.validate(config.backup.cron))throw new Error('Revise ALERTAS_CRON y BACKUP_CRON: expresión cron inválida.');
  new Intl.DateTimeFormat('es-BO',{timeZone:config.timezone}).format(new Date());
  const jobs=[];
  try{
    jobs.push(programarJobAlertas());
    jobs.push(programarJobBackup());
    jobs.push(cron.schedule('*/5 * * * *', () => {
      require('../services/notificacion.service').procesarPendientes().catch(error => console.error('[JOB correos]', error.code || 'ERROR'));
    },{timezone:config.timezone}));
    return jobs;
  }catch(error){for(const job of jobs)job.stop();throw error;}
}

module.exports = { iniciarJobs };
