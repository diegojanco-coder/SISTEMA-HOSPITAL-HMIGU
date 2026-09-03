const citaService = require('../services/cita.service');
const { created } = require('../utils/response.util');

async function registrar(req, res, next) {
  try {
    const cita = await citaService.registrarCita({ ...req.body, usuarioId: req.usuario.id });
    res.locals.auditoriaExtra = { entidadId: cita.id, datosNuevos: req.body };
    return created(res, cita, 'Cita y dosis aplicadas registradas correctamente');
  } catch (error) { return next(error); }
}
module.exports = { registrar };
