const {pool}=require('../config/db');
const {smtp}=require('../config/env');
async function main(){
 try{
  await pool.query('SELECT 1');console.log('OK: conexión a MySQL');
  const esperadas={pacientes:['departamento','es_dependiente','identidad_provisional','registro_pendiente','contacto_alertas'],paciente_tutor:['estado'],dosis:['regla_calendario','edad_recomendada_valor','edad_recomendada_unidad'],historial_vacunacion:['origen','documento_referencia'],notificaciones_email:['estado'],notificacion_intentos:['resultado']};
  let errores=0;
  for(const [tabla,columnas] of Object.entries(esperadas)){
   const [rows]=await pool.query('SELECT COLUMN_NAME nombre FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=?',[tabla]);
   const faltan=columnas.filter(c=>!rows.some(r=>r.nombre===c));
   if(faltan.length){errores++;console.log(`PENDIENTE: ${tabla}: ${faltan.join(', ')}. Ejecute npm run migrate:upgrade.`);}
  }
  const [historialCampos]=await pool.query("SELECT COLUMN_NAME nombre,IS_NULLABLE nullable FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='historial_vacunacion' AND column_name IN ('cita_id','lote_vacuna_id')");
  const [[enforcedColumn]]=await pool.query("SELECT COUNT(*) n FROM information_schema.columns WHERE table_schema='information_schema' AND table_name='TABLE_CONSTRAINTS' AND column_name='ENFORCED'");
  const checkEnforced=enforcedColumn.n ? " AND enforced='YES'" : '';
  const [[documentoCheck]]=await pool.query("SELECT COUNT(*) n FROM information_schema.table_constraints WHERE constraint_schema=DATABASE() AND table_name='historial_vacunacion' AND constraint_name='ck_historial_documento' AND constraint_type='CHECK'"+checkEnforced);
  if(historialCampos.length!==2 || historialCampos.some(c=>c.nullable!=='YES') || !documentoCheck.n){errores++;console.log('PENDIENTE: actualización de antecedentes externos. Ejecute npm run migrate:upgrade.');}
  const [tutorCampos]=await pool.query("SELECT COLUMN_NAME nombre,IS_NULLABLE nullable FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='tutores' AND column_name IN ('carnet_identidad','email')");
  if(tutorCampos.length!==2 || tutorCampos.some(c=>c.nullable!=='YES')){errores++;console.log('PENDIENTE: actualización del registro de pacientes. Ejecute npm run migrate:upgrade.');}
  if(!errores)console.log('OK: estructura actualizada');
  const [[admin]]=await pool.query("SELECT COUNT(*) total FROM usuarios WHERE rol='administrador' AND estado='activo'");
  if(!admin.total){errores++;console.log('PENDIENTE: no existe administrador activo. No reinicie la base para corregirlo.');}else console.log('OK: administrador activo disponible');
  const [[conteo]]=await pool.query("SELECT COUNT(*) total FROM dosis WHERE estado='activo'");
  if(!conteo.total){errores++;console.log('PENDIENTE: catálogo sin dosis. Cargue el catálogo base con npm run catalogo:base y revise sus reglas.');}
  else console.log(`OK: ${conteo.total} dosis activas disponibles`);
  const [[pendientes]]=await pool.query("SELECT COUNT(*) total FROM dosis WHERE estado='activo' AND regla_calendario IS NULL");
  console.log(`REVISIÓN CLÍNICA: ${pendientes.total} dosis activas sin regla documentada.`);
  console.log('ALCANCE: tener reglas documentadas no confirma que el catálogo incluya todo el PAI ni sus excepciones clínicas.');
  const configurado=Boolean(smtp.host&&smtp.user&&smtp.pass&&smtp.from);
  console.log(`CORREOS: ${smtp.enabled?'habilitados':'desactivados'}; remitente ${configurado?'configurado':'pendiente'}. No se envió ningún mensaje.`);
  process.exitCode=errores?1:0;
 }finally{await pool.end();}
}
main().catch(e=>{console.error('No se pudo verificar la instalación:',e.code||e.message);process.exitCode=1;});
