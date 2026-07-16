const backupService = require('../services/backup.service');
const auditoriaService = require('../services/auditoria.service');
const { ok, fail } = require('../utils/response.util');

async function ejecutar(req, res, next) {
  try {
    const resultado = await backupService.runBackup();
    await auditoriaService.registrar({
      usuarioId: req.usuario.id,
      accion: 'BACKUP',
      entidad: 'base_de_datos',
      datosNuevos: resultado,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    return ok(res, resultado, 'Respaldo generado correctamente');
  } catch (error) {
    return fail(res, `No se pudo generar el respaldo: ${error.message}`, 500);
  }
}

async function listar(req, res, next) {
  try {
    const backups = backupService.listarBackups();
    return ok(res, backups);
  } catch (error) { return next(error); }
}

module.exports = { ejecutar, listar };
