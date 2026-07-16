const tutorModel = require('../models/tutor.model');

async function listar(filtros) {
  const { rows, total } = await tutorModel.findAll(filtros);
  return { rows, total, page: Number(filtros.page) || 1, limit: Number(filtros.limit) || 10 };
}

async function obtener(id) {
  const tutor = await tutorModel.findById(id);
  if (!tutor) return null;
  const pacientes = await tutorModel.findPacientesByTutorId(id);
  return { ...tutor, pacientes };
}

async function crear(data) {
  return tutorModel.create(data);
}

async function actualizar(id, data) {
  return tutorModel.update(id, data);
}

async function desactivar(id) {
  return tutorModel.desactivar(id);
}

async function vincularPaciente(tutorId, pacienteId, esPrincipal) {
  return tutorModel.vincularPaciente(tutorId, pacienteId, esPrincipal);
}

async function desvincularPaciente(tutorId, pacienteId) {
  return tutorModel.desvincularPaciente(tutorId, pacienteId);
}

module.exports = { listar, obtener, crear, actualizar, desactivar, vincularPaciente, desvincularPaciente };
