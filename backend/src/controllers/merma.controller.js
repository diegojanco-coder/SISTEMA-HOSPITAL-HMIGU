const mermaService = require('../services/merma.service');
const { created } = require('../utils/response.util');

async function registrar(req, res, next) {
  try {
    const merma = await mermaService.registrar(req.body, {
      usuarioId: req.usuario.id, ip: req.ip, userAgent: req.headers['user-agent']
    });
    return created(res, merma, 'Merma registrada y stock actualizado correctamente');
  } catch (error) { return next(error); }
}

module.exports = { registrar };
