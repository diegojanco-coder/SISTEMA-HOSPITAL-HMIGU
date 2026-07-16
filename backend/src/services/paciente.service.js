const pacienteModel = require('../models/paciente.model');
const dosisModel = require('../models/dosis.model');
const historialModel = require('../models/historial.model');
const motor = require('./motorVacunacion.service');
const { calcularEdadExacta, formatearEdad } = require('../utils/edad.util');

async function listar(filtros) {
  const { rows, total } = await pacienteModel.findAll(filtros);
  const rowsConEdad = rows.map((p) => {
    const edad = calcularEdadExacta(p.fecha_nacimiento);
    return { ...p, edad, edad_formateada: formatearEdad(edad) };
  });
  return { rows: rowsConEdad, total, page: Number(filtros.page) || 1, limit: Number(filtros.limit) || 10 };
}

async function obtener(id) {
  const paciente = await pacienteModel.findById(id);
  if (!paciente) return null;
  const tutores = await pacienteModel.findTutoresByPacienteId(id);
  const edad = calcularEdadExacta(paciente.fecha_nacimiento);
  return { ...paciente, edad, edad_formateada: formatearEdad(edad), tutores };
}

async function obtenerEsquema(id) {
  const paciente = await pacienteModel.findById(id);
  if (!paciente) return null;
  const catalogoDosis = await dosisModel.findAllConVacuna();
  const historial = await historialModel.findByPacienteId(id);
  return motor.evaluarEsquema(paciente, catalogoDosis, historial);
}

async function crear(data) {
  return pacienteModel.create(data);
}

async function actualizar(id, data) {
  return pacienteModel.update(id, data);
}

async function desactivar(id) {
  return pacienteModel.desactivar(id);
}

module.exports = { listar, obtener, obtenerEsquema, crear, actualizar, desactivar };
