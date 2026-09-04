const { fail } = require('../utils/response.util');

/**
 * Middleware centralizado de manejo de errores. Debe registrarse
 * al final de la cadena de middlewares en app.js.
 */
// eslint-disable-next-line no-unused-vars
function errorMiddleware(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.originalUrl} ->`, err);

  if (err.code === 'ER_DUP_ENTRY') {
    return fail(res, 'Ya existe un registro con esos datos (valor duplicado)', 409);
  }
  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
    return fail(res, 'No se puede eliminar: el registro está referenciado por otros datos', 409);
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return fail(res, 'Referencia inválida: el recurso relacionado no existe', 400);
  }

  const status = err.status || 500;
  const mensaje = status >= 500
    ? 'No se pudo completar la operación. Intente nuevamente.'
    : (err.message || 'No se pudo completar la operación.');
  return fail(res, mensaje, status);
}

function notFoundMiddleware(req, res) {
  return fail(res, `Ruta no encontrada: ${req.method} ${req.originalUrl}`, 404);
}

module.exports = { errorMiddleware, notFoundMiddleware };
