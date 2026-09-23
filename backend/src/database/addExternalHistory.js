const { pool } = require('../config/db');

async function migrar(db = pool) {
 const [columnas] = await db.query('SHOW COLUMNS FROM historial_vacunacion');
 const cambios = [];
 if (!columnas.some(c => c.Field === 'origen')) cambios.push("ADD COLUMN origen ENUM('local','externo') NOT NULL DEFAULT 'local'");
 if (!columnas.some(c => c.Field === 'documento_referencia')) cambios.push('ADD COLUMN documento_referencia VARCHAR(200) NULL');
 for (const nombre of ['cita_id','lote_vacuna_id']) {
  if (columnas.find(c => c.Field === nombre)?.Null === 'NO') cambios.push(`MODIFY COLUMN ${nombre} INT UNSIGNED NULL`);
 }
 const [[restriccion]]=await db.query("SELECT COUNT(*) n FROM information_schema.table_constraints WHERE constraint_schema=DATABASE() AND table_name='historial_vacunacion' AND constraint_name='ck_historial_documento' AND constraint_type='CHECK'");
 if(!restriccion.n)cambios.push("ADD CONSTRAINT ck_historial_documento CHECK ((origen='local' AND documento_referencia IS NULL) OR (origen='externo' AND documento_referencia IS NOT NULL AND CHAR_LENGTH(TRIM(documento_referencia))>0))");
 if (cambios.length) await db.query('ALTER TABLE historial_vacunacion ' + cambios.join(', '));
}

if (require.main === module) migrar().then(() => console.log('Antecedentes externos disponibles; aplicaciones y existencias conservadas.'))
 .catch(error => { console.error(error.code || error.message); process.exitCode = 1; }).finally(() => pool.end());
module.exports = { migrar };
