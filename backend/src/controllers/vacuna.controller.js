const vacunaService = require('../services/vacuna.service');
const { ok, created, fail } = require('../utils/response.util');

async function listar(req, res, next) {
  try {
    const vacunas = await vacunaService.listar({ soloActivas: req.query.soloActivas !== 'false' });
    return ok(res, vacunas);
  } catch (error) { return next(error); }
}

async function obtener(req, res, next) {
  try {
    const vacuna = await vacunaService.obtener(req.params.id);
    if (!vacuna) return fail(res, 'Vacuna no encontrada', 404);
    return ok(res, vacuna);
  } catch (error) { return next(error); }
}

async function crear(req, res, next) {
  try {
    const vacuna = await vacunaService.crear(req.body);
    res.locals.auditoriaExtra = { entidadId: vacuna.id, datosNuevos: req.body };
    return created(res, vacuna, 'Vacuna creada correctamente');
  } catch (error) { return next(error); }
}

async function actualizar(req, res, next) {
  try {
    const previo = await vacunaService.obtener(req.params.id);
    if (!previo) return fail(res, 'Vacuna no encontrada', 404);
    const vacuna = await vacunaService.actualizar(req.params.id, req.body);
    res.locals.auditoriaExtra = { entidadId: req.params.id, datosPrevios: previo, datosNuevos: req.body };
    return ok(res, vacuna, 'Vacuna actualizada correctamente');
  } catch (error) { return next(error); }
}

async function eliminar(req, res, next) {
  try {
    const previo = await vacunaService.obtener(req.params.id);
    if (!previo) return fail(res, 'Vacuna no encontrada', 404);
    await vacunaService.desactivar(req.params.id);
    res.locals.auditoriaExtra = { entidadId: req.params.id, datosPrevios: previo };
    return ok(res, null, 'Vacuna desactivada correctamente');
  } catch (error) { return next(error); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
