const alertaModel = require('../models/alerta.model');
const pacienteModel = require('../models/paciente.model');
const dosisModel = require('../models/dosis.model');
const historialModel = require('../models/historial.model');
const motor = require('./motorVacunacion.service');
const notificacionService = require('./notificacion.service');
const { resolverContactoPaciente } = require('../utils/contactoPaciente.util');

const MAPA_SEMAFORO = {
  proxima: 'amarillo',
  pendiente: 'amarillo',
  atrasada: 'rojo'
};

const MENSAJES = {
  proxima: (v, d) => `Próxima: ${v} - ${d} se aplicará pronto según el calendario PAI`,
  pendiente: (v, d) => `Pendiente: ${v} - ${d} ya corresponde aplicarse`,
  atrasada: (v, d) => `Atrasada: ${v} - ${d} superó la fecha límite recomendada`
};

/**
 * Recalcula y persiste las alertas (semáforo) de UN paciente,
 * basándose en el resultado del motor inteligente de vacunación.
 */
async function generarAlertasPaciente(pacienteId) {
  const paciente = await pacienteModel.findById(pacienteId);
  if (!paciente || paciente.estado !== 'activo') return null;

  const catalogoDosis = await dosisModel.findAllConVacuna();
  const historial = await historialModel.findByPacienteId(pacienteId);
  const { detalle, estadoGeneral, resumen } = motor.evaluarEsquema(paciente, catalogoDosis, historial);
  const tutores = await pacienteModel.findTutoresByPacienteId(pacienteId);
  const contacto = resolverContactoPaciente(paciente,tutores);

  for (const item of detalle) {
    if (!MAPA_SEMAFORO[item.estado]) {
      await alertaModel.eliminarPorPacienteDosis(pacienteId, item.dosisId);
      continue;
    }
    await alertaModel.upsert({
      pacienteId,
      dosisId: item.dosisId,
      estadoSemaforo: MAPA_SEMAFORO[item.estado],
      estadoDosis: item.estado,
      fechaLimite: item.fechaLimite,
      mensaje: MENSAJES[item.estado](item.vacunaNombre, item.nombreDosis)
    });
    {
      const destinatario = paciente.registro_pendiente || paciente.identidad_provisional ? null : contacto.email;
      await notificacionService.enviarAlertaVacuna({ pacienteId, dosisId: item.dosisId, fechaLimite: item.fechaLimite, destinatario, paciente: `${paciente.nombres} ${paciente.apellidos}`, mensaje: MENSAJES[item.estado](item.vacunaNombre, item.nombreDosis), estado: item.estado });
    }
  }

  return { estadoGeneral, resumen };
}

/**
 * Recalcula las alertas de todos los pacientes activos.
 * Pensado para ejecutarse como job programado (node-cron) y también
 * de forma on-demand desde un endpoint administrativo.
 */
async function generarAlertasTodos() {
  const { rows: pacientes } = await pacienteModel.findAll({ page: 1, limit: 100000, q: '' });
  let procesados = 0;
  let fallidos = 0;
  for (const paciente of pacientes) {
    try { await generarAlertasPaciente(paciente.id); procesados += 1; }
    catch (error) { fallidos += 1; console.error('[ALERTAS] Error de recálculo para paciente', paciente.id, error.code || 'ERROR'); }
  }
  return { procesados, fallidos };
}

async function listar(filtros) {
  return alertaModel.findAll(filtros);
}

async function listarPorPaciente(pacienteId) {
  return alertaModel.findByPacienteId(pacienteId);
}

async function marcarLeida(id) {
  return alertaModel.marcarLeida(id);
}

async function resumen() {
  return alertaModel.resumen();
}

module.exports = { generarAlertasPaciente, generarAlertasTodos, listar, listarPorPaciente, marcarLeida, resumen };
