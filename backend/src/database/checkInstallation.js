const {pool}=require('../config/db');
const {smtp}=require('../config/env');
async function main(){
 try{
  await pool.query('SELECT 1');console.log('OK: conexión a MySQL');
  const esperadas={pacientes:['departamento','es_dependiente'],paciente_tutor:['estado'],dosis:['regla_calendario','edad_recomendada_valor','edad_recomendada_unidad'],notificaciones_email:['estado'],notificacion_intentos:['resultado']};
  let errores=0;
  for(const [tabla,columnas] of Object.entries(esperadas)){
   const [rows]=await pool.query('SELECT COLUMN_NAME nombre FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=?',[tabla]);
   const faltan=columnas.filter(c=>!rows.some(r=>r.nombre===c));
   if(faltan.length){errores++;console.log(`PENDIENTE: ${tabla}: ${faltan.join(', ')}. Ejecute npm run migrate:upgrade.`);}
  }
  if(!errores)console.log('OK: estructura actualizada');
  const [[admin]]=await pool.query("SELECT COUNT(*) total FROM usuarios WHERE rol='administrador' AND estado='activo'");
  if(!admin.total){errores++;console.log('PENDIENTE: no existe administrador activo. No reinicie la base para corregirlo.');}else console.log('OK: administrador activo disponible');
  const [[conteo]]=await pool.query("SELECT COUNT(*) total FROM dosis WHERE estado='activo'");
  if(!conteo.total){errores++;console.log('PENDIENTE: catálogo sin dosis. Cargue el catálogo base con npm run catalogo:base y revise sus reglas.');}
  else console.log(`OK: ${conteo.total} dosis activas disponibles`);
  const [[pendientes]]=await pool.query("SELECT COUNT(*) total FROM dosis WHERE estado='activo' AND regla_calendario IS NULL");
  console.log(`REVISIÓN CLÍNICA: ${pendientes.total} dosis activas sin regla documentada.`);
  const configurado=Boolean(smtp.host&&smtp.user&&smtp.pass&&smtp.from);
  console.log(`CORREOS: ${smtp.enabled?'habilitados':'desactivados'}; remitente ${configurado?'configurado':'pendiente'}. No se envió ningún mensaje.`);
  process.exitCode=errores?1:0;
 }finally{await pool.end();}
}
main().catch(e=>{console.error('No se pudo verificar la instalación:',e.code||e.message);process.exitCode=1;});
