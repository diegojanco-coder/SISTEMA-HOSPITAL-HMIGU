const programarJobAlertas = require('./alertas.job');
const programarJobBackup = require('./backup.job');

function iniciarJobs() {
  programarJobAlertas();
  programarJobBackup();
}

module.exports = { iniciarJobs };
