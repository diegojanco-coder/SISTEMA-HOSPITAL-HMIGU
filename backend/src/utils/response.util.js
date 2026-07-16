/**
 * Helpers para estandarizar el formato de respuesta de la API.
 * { success, data, message } en éxito; { success, message, errors } en error.
 */
function ok(res, data = null, message = 'OK', status = 200) {
  return res.status(status).json({ success: true, data, message });
}

function created(res, data = null, message = 'Recurso creado correctamente') {
  return ok(res, data, message, 201);
}

function fail(res, message = 'Ocurrió un error', status = 400, errors = []) {
  return res.status(status).json({ success: false, message, errors });
}

module.exports = { ok, created, fail };
