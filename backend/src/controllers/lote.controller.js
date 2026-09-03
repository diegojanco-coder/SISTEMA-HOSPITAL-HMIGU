const loteModel = require('../models/lote.model');
const { ok, created } = require('../utils/response.util');

async function listarDisponibles(req, res, next) {
  try { return ok(res, await loteModel.findDisponibles(req.params.vacunaId)); } catch (error) { return next(error); }
}
async function crear(req, res, next) {
  try {
    const lote = await loteModel.create(req.body);
    res.locals.auditoriaExtra = { entidadId: lote.id, datosNuevos: req.body };
    return created(res, lote, 'Lote registrado correctamente');
  } catch (error) { return next(error); }
}
module.exports = { listarDisponibles, crear };
