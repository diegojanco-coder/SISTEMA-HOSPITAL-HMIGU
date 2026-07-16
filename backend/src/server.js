const app = require('./app');
const { port } = require('./config/env');
const { testConnection } = require('./config/db');
const { iniciarJobs } = require('./jobs');

async function iniciar() {
  try {
    await testConnection();
    iniciarJobs();

    app.listen(port, () => {
      console.log('==============================================================');
      console.log(' Sistema de Vacunación Inteligente - Hospital Materno G. Urquidi');
      console.log(` API escuchando en http://localhost:${port}/api/v1`);
      console.log('==============================================================');
    });
  } catch (error) {
    console.error('[FATAL] No se pudo iniciar el servidor:', error.message);
    process.exit(1);
  }
}

iniciar();
