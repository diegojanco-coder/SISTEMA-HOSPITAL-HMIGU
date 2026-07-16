const { verificarToken } = require('../utils/jwt.util');
const { fail } = require('../utils/response.util');

/**
 * Verifica que la petición incluya un JWT válido en el header
 * Authorization: Bearer <token>. Si es válido, adjunta req.usuario.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [tipo, token] = authHeader.split(' ');

  if (tipo !== 'Bearer' || !token) {
    return fail(res, 'No se proporcionó un token de autenticación válido', 401);
  }

  try {
    const payload = verificarToken(token);
    req.usuario = payload; // { id, rol, nombre }
    return next();
  } catch (error) {
    const mensaje = error.name === 'TokenExpiredError'
      ? 'La sesión ha expirado, vuelva a iniciar sesión'
      : 'Token inválido';
    return fail(res, mensaje, 401);
  }
}

module.exports = authMiddleware;
