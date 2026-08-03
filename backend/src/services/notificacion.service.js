/**
 * Servicio de notificaciones automáticas a tutores.
 * Por ahora solo soporta el canal de correo electrónico (Gmail vía SMTP).
 */
const nodemailer = require('nodemailer');
const { notificaciones } = require('../config/env');
const { pool } = require('../config/db');

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: notificaciones.smtpHost,
      port: notificaciones.smtpPort,
      secure: true, // true para puerto 465
      auth: {
        user: notificaciones.smtpUser,
        pass: notificaciones.smtpPassword
      }
    });
  }
  return transporter;
}

/**
 * Envía el correo de recordatorio de cita y registra el resultado
 * (éxito o fallo) en la tabla notificaciones_enviadas.
 */
async function enviarRecordatorioCita({ citaId, destinatario, nombrePaciente, nombreDosis, fechaProgramada }) {
  if (!notificaciones.emailEnabled) {
    console.log('[Notificaciones] Envío de correo deshabilitado (NOTIF_EMAIL_ENABLED=false)');
    return;
  }

  let exito = 0;
  let errorMensaje = null;

  try {
    await getTransporter().sendMail({
      from: `"${notificaciones.fromName}" <${notificaciones.smtpUser}>`,
      to: destinatario,
      subject: `Recordatorio: vacuna de ${nombrePaciente} mañana`,
      html: `
        <p>Hola,</p>
        <p>Te recordamos que <strong>${nombrePaciente}</strong> tiene programada la dosis
        <strong>${nombreDosis}</strong> para mañana, <strong>${fechaProgramada}</strong>.</p>
        <p>Hospital Materno Germán Urquidi</p>
      `
    });
    exito = 1;
  } catch (error) {
    errorMensaje = error.message;
    console.error('[Notificaciones] Error al enviar correo:', error.message);
  }

  await pool.query(
    `INSERT INTO notificaciones_enviadas (cita_id, canal, destinatario, exito, error_mensaje)
     VALUES (?, 'email', ?, ?, ?)`,
    [citaId, destinatario, exito, errorMensaje]
  );

  return { exito: !!exito, errorMensaje };
}

module.exports = { enviarRecordatorioCita };