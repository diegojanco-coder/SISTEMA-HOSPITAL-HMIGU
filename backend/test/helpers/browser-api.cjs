// Servidor exclusivo de E2E: sin jobs y con correo desactivado.
if (!/^hmgu_e2e_[a-f0-9]{16}$/.test(process.env.DB_NAME || '') || process.env.SMTP_ENABLED !== 'false') throw new Error('Entorno E2E no aislado');
const app = require('../../src/app');
const { pool } = require('../../src/config/db');
const server = app.listen(0, '127.0.0.1', () => process.send({ port: server.address().port }));
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  try {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await pool.end();
    process.exit(0);
  } catch { process.exit(1); }
}
process.on('message', message => { if (message === 'close') close(); });
process.on('disconnect', close);
