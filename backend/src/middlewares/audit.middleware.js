const auditoriaService = require('../services/auditoria.service');

/**
 * Middleware "de fábrica" que registra en la bitácora de auditoría
 * toda operación de escritura exitosa.
 * Uso: router.post('/pacientes', auth, auditar('CREAR', 'pacientes'), ctrl)
 *
 * Debe colocarse ANTES del controlador; escucha el evento 'finish' de la
 * respuesta y solo audita si el status fue < 400. El controlador puede
 * enriquecer la auditoría exponiendo `res.locals.auditoriaExtra`
 * ({ entidadId, datosPrevios, datosNuevos }).
 */
function auditar(accion, entidad) {
  return (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode >= 400) return;
      const extra = res.locals.auditoriaExtra || {};
      auditoriaService
        .registrar({
          usuarioId: req.usuario?.id || null,
          accion,
          entidad,
          entidadId: extra.entidadId || req.params.id || null,
          datosPrevios: extra.datosPrevios || null,
          datosNuevos: extra.datosNuevos || req.body || null,
          ip: req.ip,
          userAgent: req.headers['user-agent'] || null
        })
        .catch((err) => console.error('[AUDITORIA] Error al registrar:', err.message));
    });
    next();
  };
}

module.exports = auditar;
