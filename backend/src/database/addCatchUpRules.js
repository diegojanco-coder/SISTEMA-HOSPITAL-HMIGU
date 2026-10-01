const { pool } = require('../config/db');

async function agregarSiFalta(nombre, definicion) {
  const [columnas] = await pool.query('SHOW COLUMNS FROM dosis LIKE ?', [nombre]);
  if (!columnas.length) await pool.query(`ALTER TABLE dosis ADD COLUMN ${nombre} ${definicion}`);
}

(async () => {
  try {
    await agregarSiFalta('edad_minima_dias', "INT UNSIGNED NULL COMMENT 'Edad mínima estricta para aplicar la dosis'");
    await agregarSiFalta('edad_maxima_dias', "INT UNSIGNED NULL COMMENT 'Edad máxima estricta; NULL permite catch-up tardío'");
    console.log('Límites estrictos de edad disponibles; los límites existentes no se convirtieron automáticamente.');
  } finally { await pool.end(); }
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
