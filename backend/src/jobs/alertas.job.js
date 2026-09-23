const cron = require('node-cron');
const { alertasCron } = require('../config/env');
const alertaService = require('../services/alerta.service');

/**
 * Job programado: recalcula el semáforo de alertas de todos los
 * pacientes activos todos los días (por defecto 06:00 am).
 */
function programarJobAlertas() {
  const task=cron.schedule(alertasCron, async () => {
    try {
      const { procesados } = await alertaService.generarAlertasTodos();
      console.log(`[JOB alertas] Alertas recalculadas para ${procesados} pacientes.`);
    } catch (error) {
      console.error('[JOB alertas] Error al recalcular alertas:', error.message);
    }
  },{timezone:require('../config/env').timezone});
  console.log(`[JOB alertas] Programado con cron "${alertasCron}"`);
  return task;
}

module.exports = programarJobAlertas;
