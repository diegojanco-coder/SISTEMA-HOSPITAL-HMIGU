const { pool } = require('../config/db');
async function main() {
 try {
  const [rows]=await pool.query("SHOW COLUMNS FROM dosis LIKE 'regla_calendario'");
  if (!rows.length) await pool.query('ALTER TABLE dosis ADD COLUMN regla_calendario JSON NULL');
  const regla=JSON.stringify({tipo:'regular',minMeses:0,maxMesesExclusivo:60,fuente:'https://minsalud.gob.bo/9237-bolivia-dona-255-000-dosis-de-vacuna-pentavalente-para-venezuela-y-haiti'});
  await pool.query(`UPDATE dosis d JOIN vacunas v ON v.id=d.vacuna_id SET d.regla_calendario=?
   WHERE v.nombre_corto='PENTA' AND d.numero_dosis BETWEEN 1 AND 5 AND d.edad_recomendada_valor IS NOT NULL AND d.regla_calendario IS NULL`,[regla]);
  console.log('Alcance del calendario disponible; no se activaron campañas.');
 } finally { await pool.end(); }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
