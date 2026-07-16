const { fail } = require('../utils/response.util');

/**
 * Middleware de autorización por rol.
 * Uso: router.post('/usuarios', auth, permitirRoles('administrador'), ctrl)
 */
function permitirRoles(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return fail(res, 'No autenticado', 401);
    }
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return fail(res, 'No tiene permisos para realizar esta acción', 403);
    }
    return next();
  };
}

module.exports = permitirRoles;
