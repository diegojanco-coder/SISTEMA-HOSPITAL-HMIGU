const { pool } = require('../config/db');
(async () => {
 try {
  const [rows] = await pool.query("SHOW COLUMNS FROM paciente_tutor LIKE 'estado'");
  if (!rows.length) await pool.query("ALTER TABLE paciente_tutor ADD COLUMN estado ENUM('activo','inactivo') NOT NULL DEFAULT 'activo'");
  console.log('Estado de vínculos disponible; relaciones existentes conservadas.');
 } finally { await pool.end(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
