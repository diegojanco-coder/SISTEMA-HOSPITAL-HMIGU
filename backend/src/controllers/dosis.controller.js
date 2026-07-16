const vacunaService = require('../services/vacuna.service');
const { ok, created, fail } = require('../utils/response.util');

async function agregar(req, res, next) {
  try {
    const dosis = await vacunaService.agregarDosis(req.params.vacunaId, req.body);
    res.locals.auditoriaExtra = { entidadId: dosis.id, datosNuevos: req.body };
    return created(res, dosis, 'Dosis agregada correctamente');
  } catch (error) { return next(error); }
}

async function actualizar(req, res, next) {
  try {
    const dosis = await vacunaService.actualizarDosis(req.params.id, req.body);
    if (!dosis) return fail(res, 'Dosis no encontrada', 404);
    res.locals.auditoriaExtra = { entidadId: req.params.id, datosNuevos: req.body };
    return ok(res, dosis, 'Dosis actualizada correctamente');
  } catch (error) { return next(error); }
}

async function eliminar(req, res, next) {
  try {
    await vacunaService.eliminarDosis(req.params.id);
    res.locals.auditoriaExtra = { entidadId: req.params.id };
    return ok(res, null, 'Dosis eliminada correctamente');
  } catch (error) { return next(error); }
}

module.exports = { agregar, actualizar, eliminar };
