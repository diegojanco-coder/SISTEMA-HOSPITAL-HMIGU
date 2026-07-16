const usuarioModel = require('../models/usuario.model');
const { compararPassword } = require('../utils/password.util');
const { generarToken } = require('../utils/jwt.util');

class AuthError extends Error {
  constructor(message, status = 401) {
    super(message);
    this.status = status;
  }
}

async function login(loginValue, password) {
  const usuario = await usuarioModel.findByLogin(loginValue);
  if (!usuario) {
    throw new AuthError('Credenciales inválidas');
  }
  if (usuario.estado !== 'activo') {
    throw new AuthError('El usuario se encuentra inactivo, contacte al administrador', 403);
  }

  const passwordValido = await compararPassword(password, usuario.password_hash);
  if (!passwordValido) {
    throw new AuthError('Credenciales inválidas');
  }

  await usuarioModel.marcarLogin(usuario.id);
  const token = generarToken(usuario);

  const { password_hash, ...usuarioSeguro } = usuario;
  return { token, usuario: usuarioSeguro };
}

module.exports = { login, AuthError };
