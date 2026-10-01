const { programarDosis }=require('../utils/programacion.util');
const { evaluarAlcance }=require('../utils/elegibilidad.util');
const {createHash}=require('node:crypto');
const {pool}=require('../config/db');
const {smtp,db:dbConfig,whatsapp}=require('../config/env');
const correo=require('./correo.service');
const pacienteModel=require('../models/paciente.model');
const {resolverContactoPaciente}=require('../utils/contactoPaciente.util');
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
 const paciente=await pacienteModel.findById(row.paciente_id,db);
 if(!paciente || paciente.estado!=='activo' || paciente.registro_pendiente || paciente.identidad_provisional)return false;
 const tutores=await pacienteModel.findTutoresByPacienteId(paciente.id,db);
 const contacto=resolverContactoPaciente(paciente,tutores);
 if(!correoValido(contacto.email) || contacto.email.trim()!==row.destinatario)return false;
 const [[alcance]]=await db.query(`SELECT p.fecha_nacimiento,p.departamento,p.sexo,d.*,d.estado AS dosis_estado,v.estado AS vacuna_estado
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
 AND NOT EXISTS(SELECT 1 FROM historial_vacunacion h WHERE h.paciente_id=p.id AND h.dosis_id=a.dosis_id)`,[row.paciente_id,row.dosis_id]);
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

function normalizarTelefono(value) {
 const digitos=String(value||'').replace(/\D/g,'');
 if(!digitos)return null;
 if(digitos.startsWith('591') && digitos.length===11)return digitos;
 if(digitos.length===8)return `591${digitos}`;
 return digitos.length>=10 && digitos.length<=15 ? digitos : null;
}

async function enviarWhatsApp(payload) {
 if(!whatsapp.apiKey){
  console.log('[WHATSAPP MOCK]', JSON.stringify(payload));
  return {mock:true};
 }
 if(!whatsapp.phoneNumberId)throw Object.assign(new Error('WHATSAPP_PHONE_NUMBER_ID no está configurado'),{code:'WHATSAPP_CONFIG'});
 if(whatsapp.provider==='meta'){
  const response=await fetch(`https://graph.facebook.com/${whatsapp.apiVersion}/${whatsapp.phoneNumberId}/messages`,{
   method:'POST',headers:{Authorization:`Bearer ${whatsapp.apiKey}`,'Content-Type':'application/json'},
   body:JSON.stringify({messaging_product:'whatsapp',to:payload.to,type:'text',text:{body:payload.message}})
  });
  if(!response.ok)throw Object.assign(new Error(`Meta WhatsApp respondió ${response.status}`),{code:`META_${response.status}`});
  return response.json();
 }
 if(whatsapp.provider==='twilio'){
  const [accountSid,authToken]=whatsapp.apiKey.split(':');
  if(!accountSid||!authToken)throw Object.assign(new Error('Para Twilio use WHATSAPP_API_KEY=ACCOUNT_SID:AUTH_TOKEN'),{code:'TWILIO_CONFIG'});
  const form=new URLSearchParams({From:`whatsapp:${whatsapp.phoneNumberId}`,To:`whatsapp:+${payload.to}`,Body:payload.message});
  const response=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,{
   method:'POST',headers:{Authorization:`Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,'Content-Type':'application/x-www-form-urlencoded'},body:form
  });
  if(!response.ok)throw Object.assign(new Error(`Twilio respondió ${response.status}`),{code:`TWILIO_${response.status}`});
  return response.json();
 }
 throw Object.assign(new Error(`Proveedor WhatsApp no soportado: ${whatsapp.provider}`),{code:'WHATSAPP_PROVIDER'});
}

async function procesarAlertasWhatsApp(){
 const [alertas]=await pool.query(`SELECT a.id,a.paciente_id,a.fecha_limite,a.estado_dosis,
   p.nombres,p.apellidos,p.fecha_nacimiento,p.telefono_contacto,p.contacto_alertas,p.es_dependiente,
   p.registro_pendiente,p.identidad_provisional,v.nombre vacuna_nombre,d.nombre_dosis
   FROM alertas a JOIN pacientes p ON p.id=a.paciente_id
   JOIN dosis d ON d.id=a.dosis_id JOIN vacunas v ON v.id=d.vacuna_id
   WHERE a.estado_dosis IN ('proxima','pendiente') AND p.estado='activo' AND d.estado='activo' AND v.estado='activo'`);
 let enviados=0,fallidos=0,omitidos=0;
 for(const alerta of alertas){
  const tutores=await pacienteModel.findTutoresByPacienteId(alerta.paciente_id);
  const telefono=normalizarTelefono(resolverContactoPaciente(alerta,tutores).telefono);
  const mensaje=`HMGU informa: ${alerta.nombres} ${alerta.apellidos} tiene ${alerta.vacuna_nombre} (${alerta.nombre_dosis}) en estado ${alerta.estado_dosis}. Fecha límite: ${alerta.fecha_limite}. Hospital Materno Germán Urquidi.`;
  if(telefono){
   const [[previo]]=await pool.query(`SELECT id FROM notificacion_intentos WHERE canal='whatsapp' AND destinatario=? AND mensaje=? AND DATE(created_at)=CURDATE() LIMIT 1`,[telefono,mensaje]);
   if(previo){omitidos++;continue;}
  }
  let resultado='enviado',codigo=null;
  try{
   if(!telefono)throw Object.assign(new Error('El paciente no tiene teléfono válido'),{code:'SIN_TELEFONO'});
   const respuesta=await enviarWhatsApp({to:telefono,message:mensaje,alertaId:alerta.id,pacienteId:alerta.paciente_id});
   codigo=respuesta.mock?'MOCK':null;enviados++;
  }catch(error){resultado='fallido';codigo=String(error.code||'WHATSAPP_ERROR').slice(0,100);fallidos++;}
  await pool.query(`INSERT INTO notificacion_intentos(notificacion_id,canal,destinatario,mensaje,resultado,codigo_error)
    VALUES (NULL,'whatsapp',?,?,?,?)`,[telefono,mensaje,resultado,codigo]);
 }
 return {enviados,fallidos,omitidos,mock:!whatsapp.apiKey};
}

module.exports={enviarAlertaVacuna,resumen,procesarPendientes,procesarAlertasWhatsApp,enviarWhatsApp,correoValido,normalizarTelefono};
