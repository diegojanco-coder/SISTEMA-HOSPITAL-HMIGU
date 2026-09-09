const { pool } = require('../config/db');
async function main() {
 try {
  for (const [nombre, definicion] of [
   ['edad_recomendada_valor', 'INT UNSIGNED NULL'],
   ['edad_recomendada_unidad', "ENUM('dias','semanas','meses','anios') NULL"]
  ]) {
   const [rows] = await pool.query('SHOW COLUMNS FROM dosis LIKE ?', [nombre]);
   if (!rows.length) await pool.query(`ALTER TABLE dosis ADD COLUMN ${nombre} ${definicion}`);
  }
  // Solo convierte valores originales conocidos. No cambia identidades ni historial.
  for (const [numero, dias, valor, unidad] of [[1,60,2,'meses'],[2,120,4,'meses'],[3,180,6,'meses'],[4,540,18,'meses'],[5,1460,4,'anios']]) {
   await pool.query(`UPDATE dosis d JOIN vacunas v ON v.id=d.vacuna_id
    SET d.edad_recomendada_valor=?, d.edad_recomendada_unidad=?
    WHERE v.nombre_corto='PENTA' AND d.numero_dosis=? AND d.edad_recomendada_dias=?
    AND d.edad_recomendada_valor IS NULL AND d.edad_recomendada_unidad IS NULL`, [valor,unidad,numero,dias]);
  }
  console.log('Unidades exactas disponibles; pentavalente original convertida sin alterar historial.');
 } finally { await pool.end(); }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
