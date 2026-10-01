const { Router } = require('express');
const controlador = require('../controllers/reporte-avanzado.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const permitirRoles = require('../middlewares/role.middleware');

const router = Router();

router.get('/lotes-proximos-vencer', authMiddleware, permitirRoles('administrador'), controlador.lotesProximosVencer);
router.get('/inventario-lotes', authMiddleware, permitirRoles('administrador'), controlador.inventarioLotes);
router.get('/vacunaciones-resumen', authMiddleware, permitirRoles('administrador'), controlador.vacunacionesResumen);
router.get('/auditoria-vacunacion', authMiddleware, permitirRoles('administrador'), controlador.auditoriaVacunacion);

module.exports = router;
