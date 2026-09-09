const nodemailer = require('nodemailer');
const { smtp } = require('../config/env');
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function configurado() { return Boolean(smtp.host && smtp.user && smtp.pass && smtp.from); }
function contenido({ paciente_nombre, mensaje }) {
  return {
    subject: 'Recordatorio de vacunación — Hospital Materno Germán Urquidi',
    text: `Paciente: ${paciente_nombre}\n\n${mensaje}\n\nAcuda al personal de vacunación para revisar su esquema.\nHospital Materno Germán Urquidi.`,
    html: `<html lang="es"><body style="font-family:Arial,sans-serif;color:#202b3b;background:#f4f6f8;padding:24px"><main style="max-width:560px;margin:auto;background:white;padding:24px;border-radius:12px"><h1 style="font-size:22px;color:#31577b">Recordatorio de vacunación</h1><p>Paciente: <strong>${escapeHtml(paciente_nombre)}</strong></p><p>${escapeHtml(mensaje)}</p><p>Acuda al personal de vacunación para revisar su esquema.</p><hr><p>Hospital Materno Germán Urquidi</p></main></body></html>`
  };
}
async function enviar(row) {
  if (!configurado()) throw Object.assign(new Error('SMTP no configurado'), {code:'SMTP_NO_CONFIGURADO'});
  const transport = nodemailer.createTransport({host:smtp.host,port:smtp.port,secure:smtp.secure,auth:{user:smtp.user,pass:smtp.pass},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:20000});
  try {
    const result = await transport.sendMail({from:smtp.from,to:row.destinatario,messageId:`<${row.clave}@vacunacion.hmgu.local>`,...contenido(row)});
    if (!result.accepted?.length) throw Object.assign(new Error('Destinatario rechazado'),{code:'DESTINATARIO_RECHAZADO'});
    return result;
  } finally { transport.close(); }
}
module.exports = { configurado, contenido, enviar, escapeHtml };
