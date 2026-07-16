const { Router } = require('express');
const ctrl = require('../controllers/carnet.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = Router();
router.get('/pacientes/:id/carnet', authMiddleware, ctrl.generar);

module.exports = router;
