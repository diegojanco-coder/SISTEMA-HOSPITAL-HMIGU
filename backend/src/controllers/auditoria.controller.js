const auditoriaService = require('../services/auditoria.service');
const { ok } = require('../utils/response.util');

async function listar(req, res, next) {
  try {
    const { page = 1, limit = 20, entidad, usuarioId } = req.query;
    const resultado = await auditoriaService.listar({ page, limit, entidad, usuarioId });
    return ok(res, resultado);
  } catch (error) { return next(error); }
}

module.exports = { listar };
