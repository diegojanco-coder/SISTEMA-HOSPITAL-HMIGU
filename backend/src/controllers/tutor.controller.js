const tutorService = require('../services/tutor.service');
const { ok, created, fail } = require('../utils/response.util');

async function listar(req, res, next) {
  try {
    const { page = 1, limit = 10, q = '' } = req.query;
    const resultado = await tutorService.listar({ page, limit, q });
    return ok(res, resultado);
  } catch (error) { return next(error); }
}

async function obtener(req, res, next) {
  try {
    const tutor = await tutorService.obtener(req.params.id);
    if (!tutor) return fail(res, 'Tutor no encontrado', 404);
    return ok(res, tutor);
  } catch (error) { return next(error); }
}

async function crear(req, res, next) {
  try {
    const tutor = await tutorService.crear(req.body);
    if (req.body.pacienteId) {
      await tutorService.vincularPaciente(tutor.id, req.body.pacienteId, true);
    }
    res.locals.auditoriaExtra = { entidadId: tutor.id, datosNuevos: req.body };
    return created(res, tutor, 'Tutor registrado correctamente');
  } catch (error) { return next(error); }
}

async function actualizar(req, res, next) {
  try {
    const previo = await tutorService.obtener(req.params.id);
    if (!previo) return fail(res, 'Tutor no encontrado', 404);
    const tutor = await tutorService.actualizar(req.params.id, req.body);
    res.locals.auditoriaExtra = { entidadId: req.params.id, datosPrevios: previo, datosNuevos: req.body };
    return ok(res, tutor, 'Tutor actualizado correctamente');
  } catch (error) { return next(error); }
}

async function eliminar(req, res, next) {
  try {
    const previo = await tutorService.obtener(req.params.id);
    if (!previo) return fail(res, 'Tutor no encontrado', 404);
    await tutorService.desactivar(req.params.id);
    res.locals.auditoriaExtra = { entidadId: req.params.id, datosPrevios: previo };
    return ok(res, null, 'Tutor desactivado correctamente');
  } catch (error) { return next(error); }
}

async function vincular(req, res, next) {
  try {
    await tutorService.vincularPaciente(req.params.id, req.params.pacienteId, req.body.esPrincipal);
    return ok(res, null, 'Paciente vinculado al tutor correctamente');
  } catch (error) { return next(error); }
}

async function desvincular(req, res, next) {
  try {
    await tutorService.desvincularPaciente(req.params.id, req.params.pacienteId);
    return ok(res, null, 'Paciente desvinculado del tutor correctamente');
  } catch (error) { return next(error); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar, vincular, desvincular };
