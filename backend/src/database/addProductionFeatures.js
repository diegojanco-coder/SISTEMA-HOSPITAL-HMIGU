const { pool } = require('../config/db');

async function columnaExiste(tabla, columna) {
  const [[row]] = await pool.query(`SELECT COUNT(*) total FROM information_schema.columns
    WHERE table_schema=DATABASE() AND table_name=? AND column_name=?`, [tabla, columna]);
  return Boolean(row.total);
}

async function indiceExiste(tabla, indice) {
  const [[row]] = await pool.query(`SELECT COUNT(*) total FROM information_schema.statistics
    WHERE table_schema=DATABASE() AND table_name=? AND index_name=?`, [tabla, indice]);
  return Boolean(row.total);
}

(async () => {
  try {
    if (!await columnaExiste('pacientes', 'certificado_nacimiento')) {
      await pool.query('ALTER TABLE pacientes ADD COLUMN certificado_nacimiento VARCHAR(50) NULL AFTER carnet_identidad');
    }
    if (!await indiceExiste('pacientes', 'uq_pacientes_certificado')) {
      await pool.query('ALTER TABLE pacientes ADD UNIQUE INDEX uq_pacientes_certificado (certificado_nacimiento)');
    }
    if (!await columnaExiste('alertas', 'estado_dosis')) {
      await pool.query("ALTER TABLE alertas ADD COLUMN estado_dosis ENUM('proxima','pendiente','atrasada') NULL AFTER estado_semaforo");
    }

    await pool.query(`CREATE TABLE IF NOT EXISTS mermas_lote (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      lote_id INT UNSIGNED NOT NULL,
      usuario_id INT UNSIGNED NOT NULL,
      cantidad_dosis_perdidas INT UNSIGNED NOT NULL,
      motivo ENUM('frasco_abierto_vencido','rotura_accidental','falla_cadena_frio','otro') NOT NULL,
      observaciones TEXT NULL,
      fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT ck_merma_cantidad CHECK (cantidad_dosis_perdidas > 0),
      CONSTRAINT fk_merma_lote FOREIGN KEY (lote_id) REFERENCES lotes_vacuna(id) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT fk_merma_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT ON UPDATE CASCADE,
      INDEX idx_mermas_lote_fecha (lote_id, fecha_registro)
    ) ENGINE=InnoDB`);

    if (!await columnaExiste('notificacion_intentos', 'canal')) {
      await pool.query("ALTER TABLE notificacion_intentos ADD COLUMN canal ENUM('email','whatsapp') NOT NULL DEFAULT 'email' AFTER notificacion_id");
    }
    if (!await columnaExiste('notificacion_intentos', 'destinatario')) {
      await pool.query('ALTER TABLE notificacion_intentos ADD COLUMN destinatario VARCHAR(50) NULL AFTER canal');
    }
    if (!await columnaExiste('notificacion_intentos', 'mensaje')) {
      await pool.query('ALTER TABLE notificacion_intentos ADD COLUMN mensaje VARCHAR(500) NULL AFTER destinatario');
    }
    await pool.query('ALTER TABLE notificacion_intentos MODIFY COLUMN notificacion_id BIGINT UNSIGNED NULL');
    await pool.query("ALTER TABLE notificacion_intentos MODIFY COLUMN resultado ENUM('enviado','error','fallido') NOT NULL");
    console.log('Funciones de producción (mermas, documentos y WhatsApp) disponibles.');
  } finally {
    await pool.end();
  }
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
