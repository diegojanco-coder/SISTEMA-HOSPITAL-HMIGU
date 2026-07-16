const usuarioModel = require('../models/usuario.model');
const { hashPassword } = require('../utils/password.util');

async function listar(filtros) {
  return usuarioModel.findAll(filtros);
}

async function obtener(id) {
  return usuarioModel.findById(id);
}

async function crear(data) {
  const passwordHash = await hashPassword(data.password);
  return usuarioModel.create({ ...data, passwordHash });
}

async function actualizar(id, data) {
  return usuarioModel.update(id, data);
}

async function cambiarPassword(id, nuevaPassword) {
  const hash = await hashPassword(nuevaPassword);
  return usuarioModel.updatePassword(id, hash);
}

async function desactivar(id) {
  return usuarioModel.desactivar(id);
}

module.exports = { listar, obtener, crear, actualizar, cambiarPassword, desactivar };
