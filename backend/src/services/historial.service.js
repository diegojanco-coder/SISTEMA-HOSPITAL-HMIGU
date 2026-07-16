const historialModel = require('../models/historial.model');
const dosisModel = require('../models/dosis.model');
const alertaService = require('./alerta.service');

class HistorialError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

async function listarPorPaciente(pacienteId) {
  return historialModel.findByPacienteId(pacienteId);
}

async function registrarAplicacion(data) {
  const dosis = await dosisModel.findById(data.dosisId);
  if (!dosis) throw new HistorialError('La dosis indicada no existe');

  const yaExiste = await historialModel.existeRegistro(data.pacienteId, data.dosisId);
  if (yaExiste) {
    throw new HistorialError('Esta dosis ya fue registrada previamente para el paciente', 409);
  }

  const registro = await historialModel.create(data);

  // El motor inteligente recalcula el estado del paciente tras la aplicación
  await alertaService.generarAlertasPaciente(data.pacienteId);

  return registro;
}

async function editarRegistro(id, data) {
  const registro = await historialModel.findById(id);
  if (!registro) throw new HistorialError('Registro de historial no encontrado', 404);

  const actualizado = await historialModel.update(id, data);
  await alertaService.generarAlertasPaciente(registro.paciente_id);
  return actualizado;
}

module.exports = { listarPorPaciente, registrarAplicacion, editarRegistro, HistorialError };
