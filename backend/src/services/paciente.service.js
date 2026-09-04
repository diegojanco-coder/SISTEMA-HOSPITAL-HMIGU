const pacienteModel = require('../models/paciente.model');
const dosisModel = require('../models/dosis.model');
const historialModel = require('../models/historial.model');
const motor = require('./motorVacunacion.service');
const { calcularEdadExacta, formatearEdad } = require('../utils/edad.util');

class PacienteError extends Error {
  constructor(message, status = 422) { super(message); this.status = status; }
}

function validarReglasPaciente(data) {
  const fecha = new Date(`${data.fechaNacimiento}T00:00:00`);
  if (Number.isNaN(fecha.getTime()) || fecha > new Date()) throw new PacienteError('La fecha de nacimiento no puede ser posterior a la fecha actual');
  if (calcularEdadExacta(data.fechaNacimiento).anios < 18 && !data.tutorId) throw new PacienteError('Todo paciente menor de 18 años debe estar vinculado a un tutor');
}

async function listar(filtros) {
  const { rows, total } = await pacienteModel.findAll(filtros);
  const rowsConEdad = rows.map((p) => {
    const edad = calcularEdadExacta(p.fecha_nacimiento);
    return { ...p, edad, edad_meses: (edad.anios * 12) + edad.meses, edad_formateada: formatearEdad(edad) };
  });
  return { rows: rowsConEdad, total, page: Number(filtros.page) || 1, limit: Number(filtros.limit) || 10 };
}

async function obtener(id) {
  const paciente = await pacienteModel.findById(id);
  if (!paciente) return null;
  const tutores = await pacienteModel.findTutoresByPacienteId(id);
  const edad = calcularEdadExacta(paciente.fecha_nacimiento);
  return { ...paciente, edad, edad_meses: (edad.anios * 12) + edad.meses, edad_formateada: formatearEdad(edad), tutores };
}

async function obtenerEsquema(id) {
  const paciente = await pacienteModel.findById(id);
  if (!paciente) return null;
  const catalogoDosis = await dosisModel.findAllConVacuna();
  const historial = await historialModel.findByPacienteId(id);
  return motor.evaluarEsquema(paciente, catalogoDosis, historial);
}

async function crear(data) {
  validarReglasPaciente(data);
  return pacienteModel.create(data);
}

async function actualizar(id, data) {
  validarReglasPaciente(data);
  return pacienteModel.update(id, data);
}

async function desactivar(id) {
  return pacienteModel.desactivar(id);
}

module.exports = { listar, obtener, obtenerEsquema, crear, actualizar, desactivar, PacienteError };
