const pacienteService = require('../services/paciente.service');
const alertaService = require('../services/alerta.service');
const { ok, created, fail } = require('../utils/response.util');

async function listar(req, res, next) {
  try {
    const { page = 1, limit = 10, q = '' } = req.query;
    const resultado = await pacienteService.listar({ page, limit, q });
    return ok(res, resultado);
  } catch (error) { return next(error); }
}

async function buscar(req, res, next) {
  try {
    const { q = '' } = req.query;
    const resultado = await pacienteService.listar({ page: 1, limit: 20, q });
    return ok(res, resultado.rows);
  } catch (error) { return next(error); }
}

async function obtener(req, res, next) {
  try {
    const paciente = await pacienteService.obtener(req.params.id);
    if (!paciente) return fail(res, 'Paciente no encontrado', 404);
    return ok(res, paciente);
  } catch (error) { return next(error); }
}

async function obtenerEsquema(req, res, next) {
  try {
    const esquema = await pacienteService.obtenerEsquema(req.params.id);
    if (!esquema) return fail(res, 'Paciente no encontrado', 404);
    return ok(res, esquema);
  } catch (error) { return next(error); }
}

async function crear(req, res, next) {
  try {
    const paciente = await pacienteService.crear({ ...req.body, creadoPor: req.usuario.id });
    await alertaService.generarAlertasPaciente(paciente.id);
    res.locals.auditoriaExtra = { entidadId: paciente.id, datosNuevos: req.body };
    return created(res, paciente, 'Paciente registrado correctamente');
  } catch (error) { return next(error); }
}

async function actualizar(req, res, next) {
  try {
    const previo = await pacienteService.obtener(req.params.id);
    if (!previo) return fail(res, 'Paciente no encontrado', 404);
    const paciente = await pacienteService.actualizar(req.params.id, req.body);
    await alertaService.generarAlertasPaciente(req.params.id);
    res.locals.auditoriaExtra = { entidadId: req.params.id, datosPrevios: previo, datosNuevos: req.body };
    return ok(res, paciente, 'Paciente actualizado correctamente');
  } catch (error) { return next(error); }
}

async function eliminar(req, res, next) {
  try {
    const previo = await pacienteService.obtener(req.params.id);
    if (!previo) return fail(res, 'Paciente no encontrado', 404);
    await pacienteService.desactivar(req.params.id);
    res.locals.auditoriaExtra = { entidadId: req.params.id, datosPrevios: previo };
    return ok(res, null, 'Paciente desactivado correctamente');
  } catch (error) { return next(error); }
}

module.exports = { listar, buscar, obtener, obtenerEsquema, crear, actualizar, eliminar };
