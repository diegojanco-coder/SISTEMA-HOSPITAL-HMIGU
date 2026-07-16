const alertaService = require('../services/alerta.service');
const { ok } = require('../utils/response.util');

async function listar(req, res, next) {
  try {
    const { estado, page = 1, limit = 20 } = req.query;
    const alertas = await alertaService.listar({ estado, page, limit });
    return ok(res, alertas);
  } catch (error) { return next(error); }
}

async function listarPorPaciente(req, res, next) {
  try {
    const alertas = await alertaService.listarPorPaciente(req.params.id);
    return ok(res, alertas);
  } catch (error) { return next(error); }
}

async function marcarLeida(req, res, next) {
  try {
    await alertaService.marcarLeida(req.params.id);
    return ok(res, null, 'Alerta marcada como leída');
  } catch (error) { return next(error); }
}

async function resumen(req, res, next) {
  try {
    const resumen = await alertaService.resumen();
    return ok(res, resumen);
  } catch (error) { return next(error); }
}

async function recalcularTodas(req, res, next) {
  try {
    const resultado = await alertaService.generarAlertasTodos();
    return ok(res, resultado, 'Alertas recalculadas correctamente');
  } catch (error) { return next(error); }
}

module.exports = { listar, listarPorPaciente, marcarLeida, resumen, recalcularTodas };
