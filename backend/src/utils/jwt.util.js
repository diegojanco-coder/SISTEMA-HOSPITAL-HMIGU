const jwt = require('jsonwebtoken');
const { jwt: jwtConfig } = require('../config/env');

/**
 * Genera un token JWT firmado con los datos mínimos del usuario.
 * Nunca se incluye el password_hash en el payload.
 */
function generarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, rol: usuario.rol, nombre: usuario.nombre_completo },
    jwtConfig.secret,
    { expiresIn: jwtConfig.expiresIn }
  );
}

function verificarToken(token) {
  return jwt.verify(token, jwtConfig.secret);
}

module.exports = { generarToken, verificarToken };
