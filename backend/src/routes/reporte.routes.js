const { Router } = require('express');
const ctrl = require('../controllers/reporte.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const permitirRoles = require('../middlewares/role.middleware');

const router = Router();
router.get('/:tipo', authMiddleware, permitirRoles('administrador'), ctrl.generar);

module.exports = router;
