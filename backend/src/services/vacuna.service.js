const vacunaModel = require('../models/vacuna.model');
const dosisModel = require('../models/dosis.model');

function normalizarDosis(dosis) {
  if (!dosis?.regla_calendario || typeof dosis.regla_calendario !== 'string') return dosis;
  try { return { ...dosis, regla_calendario: JSON.parse(dosis.regla_calendario) }; }
  catch { return { ...dosis, regla_calendario: null }; }
}

async function listar(filtros) {
  const vacunas = await vacunaModel.findAll(filtros);
  const conDosis = await Promise.all(
    vacunas.map(async (v) => ({ ...v, dosis: (await dosisModel.findByVacunaId(v.id)).map(normalizarDosis) }))
  );
  return conDosis;
}

async function obtener(id) {
  const vacuna = await vacunaModel.findById(id);
  if (!vacuna) return null;
  const dosis = (await dosisModel.findByVacunaId(id)).map(normalizarDosis);
  return { ...vacuna, dosis };
}

async function crear(data) {
  return vacunaModel.create(data);
}

async function actualizar(id, data) {
  return vacunaModel.update(id, data);
}

async function desactivar(id) {
  return vacunaModel.desactivar(id);
}

async function agregarDosis(vacunaId, data) {
  return dosisModel.create(vacunaId, data);
}

async function actualizarDosis(dosisId, data) {
  return dosisModel.update(dosisId, data);
}

async function eliminarDosis(dosisId) {
  return dosisModel.eliminar(dosisId);
}

module.exports = { listar, obtener, crear, actualizar, desactivar, agregarDosis, actualizarDosis, eliminarDosis };
