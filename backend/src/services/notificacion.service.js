const { programarDosis }=require('../utils/programacion.util');
const { evaluarAlcance }=require('../utils/elegibilidad.util');
const {createHash}=require('node:crypto');
const {pool}=require('../config/db');
const {smtp,db:dbConfig}=require('../config/env');
const correo=require('./correo.service');
function correoValido(value){return typeof value==='string' && value.length<=150 && /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(value);}
async function enviarAlertaVacuna({pacienteId,dosisId,destinatario,paciente,mensaje,estado,fechaLimite}){
 const email=correoValido(destinatario)?destinatario.trim():null;
 const clave=createHash('sha256').update(JSON.stringify([pacienteId,dosisId,email,estado,fechaLimite,mensaje])).digest('hex');
 await pool.query(`INSERT IGNORE INTO notificaciones_email(clave,paciente_id,dosis_id,destinatario,paciente_nombre,mensaje,estado_dosis,fecha_limite,estado)
 VALUES (?,?,?,?,?,?,?,?,?)`,[clave,pacienteId,dosisId,email,paciente,mensaje,estado,fechaLimite,email?'pendiente':'sin_destinatario']);
 if(email)await pool.query("UPDATE notificaciones_email SET estado='cancelado' WHERE paciente_id=? AND dosis_id=? AND estado='sin_destinatario'",[pacienteId,dosisId]);
 return {encolado:true,estado:email?'pendiente':'sin_destinatario'};
}
async function resumen(){
 const [estados]=await pool.query('SELECT estado,COUNT(*) total FROM notificaciones_email GROUP BY estado');
 return {habilitado:smtp.enabled,configurado:correo.configurado(),estados};
}
async function vigente(db,row){
 const [[alcance]]=await db.query(`SELECT p.fecha_nacimiento,p.departamento,d.*,d.estado AS dosis_estado,v.estado AS vacuna_estado
 FROM pacientes p JOIN dosis d ON d.id=? JOIN vacunas v ON v.id=d.vacuna_id WHERE p.id=?`,[row.dosis_id,row.paciente_id]);
 if(!alcance || alcance.dosis_estado!=='activo' || alcance.vacuna_estado!=='activo' || evaluarAlcance(alcance,alcance))return false;
 let regla=alcance.regla_calendario;
 try { if(typeof regla==='string') regla=JSON.parse(regla); } catch {return false;}
 if(regla?.programacion){
  const [historial]=await db.query('SELECT dosis_id,fecha_aplicacion FROM historial_vacunacion WHERE paciente_id=?',[row.paciente_id]);
  const programacion=programarDosis(alcance,alcance,historial);
  if(programacion.revision)return false;
  const {sumarEdad,isoCivil}=require('../utils/calendario.util');
  if(isoCivil(sumarEdad(programacion.fecha,alcance.tolerancia_dias,'dias'))!==row.fecha_limite)return false;
 }
 const [[actual]]=await db.query(`SELECT a.mensaje,a.fecha_limite FROM alertas a JOIN pacientes p ON p.id=a.paciente_id
 WHERE a.paciente_id=? AND a.dosis_id=? AND p.estado='activo'
 AND NOT EXISTS(SELECT 1 FROM historial_vacunacion h WHERE h.paciente_id=p.id AND h.dosis_id=a.dosis_id)
 AND (p.email=? OR EXISTS(SELECT 1 FROM paciente_tutor pt JOIN tutores t ON t.id=pt.tutor_id WHERE pt.paciente_id=p.id AND pt.estado='activo' AND t.estado='activo' AND t.email=?))`,[row.paciente_id,row.dosis_id,row.destinatario,row.destinatario]);
 return actual && actual.mensaje===row.mensaje && actual.fecha_limite===row.fecha_limite;
}
async function procesarPendientes(){
 if(!smtp.enabled || !correo.configurado())return {enviados:0,deshabilitado:true};
 const db=await pool.getConnection();
 const lock='hmgu-mail-'+createHash('sha256').update(dbConfig.database).digest('hex').slice(0,20);
 let bloqueado=false,enviados=0;
 try{
  const [[result]]=await db.query('SELECT GET_LOCK(?,0) AS adquirido',[lock]);
  bloqueado=Boolean(result.adquirido);if(!bloqueado)return {enviados:0,ocupado:true};
  await db.query("UPDATE notificaciones_email SET estado='pendiente' WHERE estado='enviando' AND updated_at < NOW()-INTERVAL 10 MINUTE");
  const [rows]=await db.query("SELECT * FROM notificaciones_email WHERE estado IN ('pendiente','error') AND intentos<5 AND proximo_intento<=NOW() ORDER BY id LIMIT 20");
  for(const row of rows){
   if(!await vigente(db,row)){await db.query("UPDATE notificaciones_email SET estado='cancelado' WHERE id=?",[row.id]);continue;}
   await db.query("UPDATE notificaciones_email SET estado='enviando' WHERE id=?",[row.id]);
   let errorCode=null;
   try{await correo.enviar(row);}catch(error){errorCode=String(error.code||'SMTP_ERROR').slice(0,100);}
   await db.beginTransaction();
   try{
    await db.query('INSERT INTO notificacion_intentos(notificacion_id,resultado,codigo_error) VALUES (?,?,?)',[row.id,errorCode?'error':'enviado',errorCode]);
    await db.query(`UPDATE notificaciones_email SET estado=?,intentos=intentos+1,ultimo_error=?,
      proximo_intento=DATE_ADD(NOW(),INTERVAL ? MINUTE),enviado_at=IF(?='enviado',NOW(),enviado_at) WHERE id=?`,[errorCode?'error':'enviado',errorCode,Math.min(1440,5*2**row.intentos),errorCode?'error':'enviado',row.id]);
    await db.commit();
   }catch(error){await db.rollback();throw error;}
   if(!errorCode)enviados++;
  }
  return {enviados};
 }finally{try{if(bloqueado)await db.query('SELECT RELEASE_LOCK(?)',[lock]);}finally{db.release();}}
}
module.exports={enviarAlertaVacuna,resumen,procesarPendientes,correoValido};
