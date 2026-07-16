const vacunaModel = require('../models/vacuna.model');
const dosisModel = require('../models/dosis.model');

async function listar(filtros) {
  const vacunas = await vacunaModel.findAll(filtros);
  const conDosis = await Promise.all(
    vacunas.map(async (v) => ({ ...v, dosis: await dosisModel.findByVacunaId(v.id) }))
  );
  return conDosis;
}

async function obtener(id) {
  const vacuna = await vacunaModel.findById(id);
  if (!vacuna) return null;
  const dosis = await dosisModel.findByVacunaId(id);
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
