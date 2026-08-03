const programarJobAlertas = require('./alertas.job');
const programarJobBackup = require('./backup.job');
const programarJobCitas = require('./citas.job');

function iniciarJobs() {
  programarJobAlertas();
  programarJobBackup();
  programarJobCitas();
}

module.exports = { iniciarJobs };
