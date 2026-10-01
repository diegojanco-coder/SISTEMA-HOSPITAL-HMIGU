const { pool } = require('../config/db');

async function migrar(db = pool) {
 await db.query(`CREATE TABLE IF NOT EXISTS lotes_vacuna (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vacuna_id INT UNSIGNED NOT NULL,
  numero_lote VARCHAR(50) NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  cantidad_disponible INT UNSIGNED NOT NULL,
  estado ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_lote_vacuna UNIQUE (vacuna_id, numero_lote),
  CONSTRAINT ck_lote_stock CHECK (cantidad_disponible >= 0),
  CONSTRAINT fk_lote_vacuna FOREIGN KEY (vacuna_id) REFERENCES vacunas(id)
   ON DELETE RESTRICT ON UPDATE CASCADE
 ) ENGINE=InnoDB`);
 await db.query(`CREATE TABLE IF NOT EXISTS citas (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  paciente_id INT UNSIGNED NOT NULL,
  usuario_id INT UNSIGNED NOT NULL,
  fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  observaciones TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cita_paciente FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
   ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_cita_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
   ON DELETE RESTRICT ON UPDATE CASCADE
 ) ENGINE=InnoDB`);
 const [loteIndexes] = await db.query("SHOW INDEX FROM lotes_vacuna WHERE Key_name='idx_lotes_disponibles'");
 if (!loteIndexes.length) await db.query('CREATE INDEX idx_lotes_disponibles ON lotes_vacuna (vacuna_id, fecha_vencimiento, cantidad_disponible)');
 const [citaIndexes] = await db.query("SHOW INDEX FROM citas WHERE Key_name='idx_citas_paciente_fecha'");
 if (!citaIndexes.length) await db.query('CREATE INDEX idx_citas_paciente_fecha ON citas (paciente_id, fecha_hora)');
 const [columnas] = await db.query('SHOW COLUMNS FROM historial_vacunacion');
 const cambios = [];
 if (!columnas.some(c => c.Field === 'origen')) cambios.push("ADD COLUMN origen ENUM('local','externo') NOT NULL DEFAULT 'local'");
 if (!columnas.some(c => c.Field === 'documento_referencia')) cambios.push('ADD COLUMN documento_referencia VARCHAR(200) NULL');
 if (!columnas.some(c => c.Field === 'cita_id')) cambios.push('ADD COLUMN cita_id INT UNSIGNED NULL');
 if (!columnas.some(c => c.Field === 'lote_vacuna_id')) cambios.push('ADD COLUMN lote_vacuna_id INT UNSIGNED NULL');
 for (const nombre of ['cita_id','lote_vacuna_id']) {
  if (columnas.find(c => c.Field === nombre)?.Null === 'NO') cambios.push(`MODIFY COLUMN ${nombre} INT UNSIGNED NULL`);
 }
 const [[restriccion]]=await db.query("SELECT COUNT(*) n FROM information_schema.table_constraints WHERE constraint_schema=DATABASE() AND table_name='historial_vacunacion' AND constraint_name='ck_historial_documento' AND constraint_type='CHECK'");
 if(!restriccion.n)cambios.push("ADD CONSTRAINT ck_historial_documento CHECK ((origen='local' AND documento_referencia IS NULL) OR (origen='externo' AND documento_referencia IS NOT NULL AND CHAR_LENGTH(TRIM(documento_referencia))>0))");
 if (cambios.length) await db.query('ALTER TABLE historial_vacunacion ' + cambios.join(', '));
 const [historialFks] = await db.query("SELECT CONSTRAINT_NAME FROM information_schema.table_constraints WHERE constraint_schema=DATABASE() AND table_name='historial_vacunacion' AND constraint_type='FOREIGN KEY'");
 if (!historialFks.some(c => c.CONSTRAINT_NAME === 'fk_historial_cita')) await db.query('ALTER TABLE historial_vacunacion ADD CONSTRAINT fk_historial_cita FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE RESTRICT ON UPDATE CASCADE');
 if (!historialFks.some(c => c.CONSTRAINT_NAME === 'fk_historial_lote')) await db.query('ALTER TABLE historial_vacunacion ADD CONSTRAINT fk_historial_lote FOREIGN KEY (lote_vacuna_id) REFERENCES lotes_vacuna(id) ON DELETE RESTRICT ON UPDATE CASCADE');
}

if (require.main === module) migrar().then(() => console.log('Antecedentes externos disponibles; aplicaciones y existencias conservadas.'))
 .catch(error => { console.error(error.code || error.message); process.exitCode = 1; }).finally(() => pool.end());
module.exports = { migrar };
