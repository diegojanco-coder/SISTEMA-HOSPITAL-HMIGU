const historialService = require('../services/historial.service');
const { ok, created, fail } = require('../utils/response.util');

async function listarPorPaciente(req, res, next) {
  try {
    const historial = await historialService.listarPorPaciente(req.params.id);
    return ok(res, historial);
  } catch (error) { return next(error); }
}

async function actualizar(req, res, next) {
  try {
    const registro = await historialService.editarRegistro(req.params.id, req.body, { usuarioId: req.usuario.id, ip: req.ip, userAgent: req.headers['user-agent'] });
    res.locals.auditoriaExtra = { entidadId: req.params.id, datosNuevos: req.body };
    return ok(res, registro, 'Registro de historial actualizado correctamente');
  } catch (error) { return next(error); }
}

module.exports = { listarPorPaciente, actualizar };
