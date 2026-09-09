// Envía únicamente un mensaje de prueba al destinatario configurado localmente.
const nodemailer=require('nodemailer');
const {smtp}=require('../config/env');
async function main(){
 const destino=process.env.SMTP_TEST_TO;
 if(!smtp.user||!smtp.pass||!smtp.from||!destino){console.error('Falta configurar SMTP_PASS o SMTP_TEST_TO en backend/.env. No se envió ningún correo.');process.exitCode=1;return;}
 const transport=nodemailer.createTransport({host:smtp.host,port:smtp.port,secure:smtp.secure,requireTLS:!smtp.secure,auth:{user:smtp.user,pass:smtp.pass},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:20000});
 try{
  const r=await transport.sendMail({from:smtp.from,to:destino,subject:'Prueba de correo — Sistema de Vacunación HMGU',text:'Este es el mensaje de prueba autorizado del Sistema de Vacunación del Hospital Materno Germán Urquidi. No contiene datos de pacientes ni corresponde a una cita. Si lo recibió, la recepción de esta prueba está confirmada.'});
  if(!r.accepted?.length)throw Object.assign(new Error(),{code:'DESTINATARIO_RECHAZADO'});
  console.log('Mensaje de prueba aceptado por el servidor SMTP. Compruebe la bandeja de entrada y spam. Los recordatorios automáticos no se activaron.');
 }catch(e){console.error('La prueba no pudo confirmarse:',e.code||'SMTP_ERROR');process.exitCode=1;}
 finally{transport.close();}
}
main();
