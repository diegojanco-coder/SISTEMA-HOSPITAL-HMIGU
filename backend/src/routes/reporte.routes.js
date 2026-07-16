const { Router } = require('express');
const ctrl = require('../controllers/reporte.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = Router();
router.get('/:tipo', authMiddleware, ctrl.generar);

module.exports = router;
