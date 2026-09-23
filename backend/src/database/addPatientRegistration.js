const { pool } = require('../config/db');

async function migrar(db = pool) {
  const [columnas] = await db.query('SHOW COLUMNS FROM pacientes');
  const nuevoContacto = !columnas.some(c => c.Field === 'contacto_alertas');
  const nuevoPendiente = !columnas.some(c => c.Field === 'registro_pendiente');
  const cambios = [];
  if (!columnas.some(c => c.Field === 'identidad_provisional')) cambios.push('ADD COLUMN identidad_provisional TINYINT(1) NOT NULL DEFAULT 0');
  if (nuevoPendiente) cambios.push('ADD COLUMN registro_pendiente TINYINT(1) NOT NULL DEFAULT 0');
  if (nuevoContacto) cambios.push("ADD COLUMN contacto_alertas ENUM('paciente','tutor') NOT NULL DEFAULT 'paciente'");
  if (cambios.length) await db.query('ALTER TABLE pacientes ' + cambios.join(', '));
  const [tutorCols] = await db.query('SHOW COLUMNS FROM tutores');
  const tutorCambios = [];
  if (tutorCols.find(c => c.Field === 'carnet_identidad')?.Null === 'NO') tutorCambios.push('MODIFY COLUMN carnet_identidad VARCHAR(20) NULL');
  if (tutorCols.find(c => c.Field === 'email')?.Null === 'NO') tutorCambios.push('MODIFY COLUMN email VARCHAR(150) NULL');
  if (tutorCambios.length) await db.query('ALTER TABLE tutores ' + tutorCambios.join(', '));
  // Solo se derivan las preferencias al incorporar las columnas: una segunda
  // ejecución conserva las elecciones hechas después por el personal.
  if (nuevoContacto) await db.query("UPDATE pacientes SET contacto_alertas=IF(TIMESTAMPDIFF(YEAR,fecha_nacimiento,CURDATE())<18 OR es_dependiente=1,'tutor','paciente')");
  if (nuevoPendiente) await db.query(`UPDATE pacientes p SET registro_pendiente =
    CASE WHEN p.identidad_provisional=1 THEN 1
    WHEN p.contacto_alertas='paciente' THEN (COALESCE(TRIM(p.email),'')='' OR COALESCE(TRIM(p.telefono_contacto),'')='')
    ELSE COALESCE((SELECT (COALESCE(TRIM(t.email),'')='' OR COALESCE(TRIM(t.telefono),'')='')
      FROM paciente_tutor pt JOIN tutores t ON t.id=pt.tutor_id
      WHERE pt.paciente_id=p.id AND pt.estado='activo' AND t.estado='activo'
      ORDER BY pt.es_principal DESC,t.id LIMIT 1),1) END`);
}
if (require.main === module) migrar().then(() => console.log('Registro por tipo de paciente disponible; identidades y vínculos conservados.'))
  .catch(error => { console.error(error.code || error.message); process.exitCode=1; }).finally(() => pool.end());
module.exports = { migrar };
