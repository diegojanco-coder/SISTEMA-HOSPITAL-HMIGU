const cron = require('node-cron');
const { citasCron } = require('../config/env');
const citaModel = require('../models/cita.model');
const notificacionService = require('../services/notificacion.service');

/**
 * Job programado: todos los días (por defecto 08:00 am) revisa las
 * citas programadas para "mañana" y envía el correo de recordatorio
 * al tutor principal de cada paciente.
 */
function programarJobCitas() {
  cron.schedule(citasCron, async () => {
    try {
      const citas = await citaModel.listarParaNotificarManana();
      let enviadas = 0;

      for (const cita of citas) {
        if (!cita.tutor_email) {
          console.warn(`[JOB citas] Cita ${cita.cita_id} sin email de tutor, se omite.`);
          continue;
        }

        await notificacionService.enviarRecordatorioCita({
          citaId: cita.cita_id,
          destinatario: cita.tutor_email,
          nombrePaciente: `${cita.paciente_nombres} ${cita.paciente_apellidos}`,
          nombreDosis: `${cita.vacuna_nombre} - ${cita.nombre_dosis}`,
          fechaProgramada: cita.fecha_programada
        });

        await citaModel.marcarNotificada(cita.cita_id);
        enviadas++;
      }

      console.log(`[JOB citas] Procesadas ${citas.length} citas, ${enviadas} notificaciones enviadas.`);
    } catch (error) {
      console.error('[JOB citas] Error al procesar citas:', error.message);
    }
  });
  console.log(`[JOB citas] Programado con cron "${citasCron}"`);
}

module.exports = programarJobCitas;