const nodemailer = require('nodemailer');
const { smtp } = require('../config/env');

function obtenerTransportador() {
  if (!smtp.host || !smtp.user || !smtp.pass || !smtp.from) {
    throw new Error('SMTP no está configurado: defina SMTP_HOST, SMTP_USER, SMTP_PASS y SMTP_FROM');
  }
  return nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.secure, auth: { user: smtp.user, pass: smtp.pass } });
}

async function enviarAlertaVacuna({ destinatario, paciente, mensaje, estado }) {
  if (!destinatario) throw new Error(`No existe un correo válido para notificar al paciente ${paciente}`);
  return obtenerTransportador().sendMail({
    from: smtp.from,
    to: destinatario,
    subject: `[Vacunación HMGU] Alerta ${estado}: ${paciente}`,
    text: `Estimado/a tutor o paciente:\n\n${mensaje}\n\nHospital Materno Germán Urquidi.`
  });
}

module.exports = { enviarAlertaVacuna };
