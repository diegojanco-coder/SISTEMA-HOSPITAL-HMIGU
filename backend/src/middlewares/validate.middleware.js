const { validationResult } = require('express-validator');
const { fail } = require('../utils/response.util');

/**
 * Ejecuta las reglas de express-validator declaradas en la ruta y,
 * si hay errores, corta la petición con un 400 estandarizado.
 */
function validar(req, res, next) {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return fail(res, 'Datos de entrada inválidos', 400, errores.array().map((e) => ({
      campo: e.path,
      mensaje: e.msg
    })));
  }
  return next();
}

module.exports = validar;
