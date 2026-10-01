const { ok, fail } = require('../utils/response.util');
const {
  obtenerInventarioLotes,
  obtenerLotesProximosVencer,
  obtenerAuditoriaVacunacion,
  obtenerResumenVacunaciones,
  ReporteAvanzadoError
} = require('../services/reporte-avanzado.service');

async function inventarioLotes(req, res, next) {
  try {
    const data = await obtenerInventarioLotes(req.query);
    return ok(res, data, 'Inventario de vacunas y lotes generado correctamente');
  } catch (error) {
    if (error instanceof ReporteAvanzadoError) {
      return fail(res, error.message, error.status || 400);
    }
    return next(error);
  }
}

async function lotesProximosVencer(req, res, next) {
  try {
    const data = await obtenerLotesProximosVencer(req.query);
    return ok(res, data, 'Lotes próximos a vencer generados correctamente');
  } catch (error) {
    if (error instanceof ReporteAvanzadoError) {
      return fail(res, error.message, error.status || 400);
    }
    return next(error);
  }
}

async function auditoriaVacunacion(req, res, next) {
  try {
    const data = await obtenerAuditoriaVacunacion(req.query);
    return ok(res, data, 'Auditoría de vacunación generada correctamente');
  } catch (error) {
    if (error instanceof ReporteAvanzadoError) {
      return fail(res, error.message, error.status || 400);
    }
    return next(error);
  }
}

async function vacunacionesResumen(req, res, next) {
  try {
    const data = await obtenerResumenVacunaciones(req.query);
    return ok(res, data, 'Resumen ejecutivo de vacunaciones generado correctamente');
  } catch (error) {
    if (error instanceof ReporteAvanzadoError) {
      return fail(res, error.message, error.status || 400);
    }
    return next(error);
  }
}

module.exports = {
  inventarioLotes,
  lotesProximosVencer,
  auditoriaVacunacion,
  vacunacionesResumen
};
