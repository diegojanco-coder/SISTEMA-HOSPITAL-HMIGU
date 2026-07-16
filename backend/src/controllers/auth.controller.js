const authService = require('../services/auth.service');
const usuarioModel = require('../models/usuario.model');
const { ok, fail } = require('../utils/response.util');
const auditoriaService = require('../services/auditoria.service');

async function login(req, res, next) {
  try {
    const { login: loginValue, password } = req.body;
    if (!loginValue || !password) {
      return fail(res, 'Usuario/email y contraseña son obligatorios', 422);
    }
    const { token, usuario } = await authService.login(loginValue, password);

    await auditoriaService.registrar({
      usuarioId: usuario.id,
      accion: 'LOGIN',
      entidad: 'usuarios',
      entidadId: usuario.id,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    return ok(res, { token, usuario }, 'Inicio de sesión exitoso');
  } catch (error) {
    return next(error);
  }
}

async function logout(req, res, next) {
  try {
    await auditoriaService.registrar({
      usuarioId: req.usuario.id,
      accion: 'LOGOUT',
      entidad: 'usuarios',
      entidadId: req.usuario.id,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    return ok(res, null, 'Sesión cerrada correctamente');
  } catch (error) {
    return next(error);
  }
}

async function me(req, res, next) {
  try {
    const usuario = await usuarioModel.findById(req.usuario.id);
    if (!usuario) return fail(res, 'Usuario no encontrado', 404);
    return ok(res, usuario);
  } catch (error) {
    return next(error);
  }
}

module.exports = { login, logout, me };
