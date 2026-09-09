const { verificarToken } = require('../utils/jwt.util');
const { fail } = require('../utils/response.util');

/**
 * Verifica que la petición incluya un JWT válido en el header
 * Authorization: Bearer <token>. Si es válido, adjunta req.usuario.
 */
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [tipo, token] = authHeader.split(' ');

  if (tipo !== 'Bearer' || !token) {
    return fail(res, 'No se proporcionó un token de autenticación válido', 401);
  }

  try {
    const payload = verificarToken(token);
    const usuario=await require('../models/usuario.model').findById(payload.id);
    if(!usuario || usuario.estado!=='activo')return fail(res,'La cuenta está inactiva o ya no existe',401);
    req.usuario = {...payload,rol:usuario.rol,nombre:usuario.nombre_completo};
    return next();
  } catch (error) {
    if(!['TokenExpiredError','JsonWebTokenError','NotBeforeError'].includes(error.name))return next(error);
    const mensaje = error.name === 'TokenExpiredError'
      ? 'La sesión ha expirado, vuelva a iniciar sesión'
      : 'Token inválido';
    return fail(res, mensaje, 401);
  }
}

module.exports = authMiddleware;
