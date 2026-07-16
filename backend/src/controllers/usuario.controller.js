const usuarioService = require('../services/usuario.service');
const { ok, created, fail } = require('../utils/response.util');

async function listar(req, res, next) {
  try {
    const usuarios = await usuarioService.listar(req.query);
    return ok(res, usuarios);
  } catch (error) { return next(error); }
}

async function obtener(req, res, next) {
  try {
    const usuario = await usuarioService.obtener(req.params.id);
    if (!usuario) return fail(res, 'Usuario no encontrado', 404);
    return ok(res, usuario);
  } catch (error) { return next(error); }
}

async function crear(req, res, next) {
  try {
    const usuario = await usuarioService.crear(req.body);
    res.locals.auditoriaExtra = { entidadId: usuario.id, datosNuevos: { ...req.body, password: '***' } };
    return created(res, usuario, 'Usuario creado correctamente');
  } catch (error) { return next(error); }
}

async function actualizar(req, res, next) {
  try {
    const previo = await usuarioService.obtener(req.params.id);
    if (!previo) return fail(res, 'Usuario no encontrado', 404);
    const usuario = await usuarioService.actualizar(req.params.id, req.body);
    res.locals.auditoriaExtra = { entidadId: req.params.id, datosPrevios: previo, datosNuevos: req.body };
    return ok(res, usuario, 'Usuario actualizado correctamente');
  } catch (error) { return next(error); }
}

async function cambiarPassword(req, res, next) {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return fail(res, 'La contraseña debe tener al menos 6 caracteres', 422);
    }
    await usuarioService.cambiarPassword(req.params.id, password);
    return ok(res, null, 'Contraseña actualizada correctamente');
  } catch (error) { return next(error); }
}

async function eliminar(req, res, next) {
  try {
    const previo = await usuarioService.obtener(req.params.id);
    if (!previo) return fail(res, 'Usuario no encontrado', 404);
    await usuarioService.desactivar(req.params.id);
    res.locals.auditoriaExtra = { entidadId: req.params.id, datosPrevios: previo };
    return ok(res, null, 'Usuario desactivado correctamente');
  } catch (error) { return next(error); }
}

module.exports = { listar, obtener, crear, actualizar, cambiarPassword, eliminar };
