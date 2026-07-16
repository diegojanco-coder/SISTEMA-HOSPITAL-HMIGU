const historialService = require('../services/historial.service');
const { ok, created, fail } = require('../utils/response.util');

async function listarPorPaciente(req, res, next) {
  try {
    const historial = await historialService.listarPorPaciente(req.params.id);
    return ok(res, historial);
  } catch (error) { return next(error); }
}

async function registrar(req, res, next) {
  try {
    const registro = await historialService.registrarAplicacion({ ...req.body, usuarioId: req.usuario.id });
    res.locals.auditoriaExtra = { entidadId: registro.id, datosNuevos: req.body };
    return created(res, registro, 'Aplicación de vacuna registrada correctamente');
  } catch (error) { return next(error); }
}

async function actualizar(req, res, next) {
  try {
    const registro = await historialService.editarRegistro(req.params.id, req.body);
    res.locals.auditoriaExtra = { entidadId: req.params.id, datosNuevos: req.body };
    return ok(res, registro, 'Registro de historial actualizado correctamente');
  } catch (error) { return next(error); }
}

module.exports = { listarPorPaciente, registrar, actualizar };
