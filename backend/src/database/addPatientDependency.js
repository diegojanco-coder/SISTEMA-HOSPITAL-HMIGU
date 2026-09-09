const { pool } = require('../config/db');
async function main() {
 try {
  const [rows]=await pool.query("SHOW COLUMNS FROM pacientes LIKE 'es_dependiente'");
  if(!rows.length) await pool.query('ALTER TABLE pacientes ADD COLUMN es_dependiente TINYINT(1) NOT NULL DEFAULT 0');
  console.log('Campo de dependencia disponible; datos existentes conservados.');
 } finally { await pool.end(); }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
