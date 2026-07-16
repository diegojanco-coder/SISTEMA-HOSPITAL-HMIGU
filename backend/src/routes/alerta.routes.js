const { Router } = require('express');
const ctrl = require('../controllers/alerta.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const permitirRoles = require('../middlewares/role.middleware');

const router = Router();
router.use(authMiddleware);

router.get('/', ctrl.listar);
router.get('/resumen', ctrl.resumen);
router.get('/paciente/:id', ctrl.listarPorPaciente);
router.patch('/:id/leida', ctrl.marcarLeida);
router.post('/recalcular', permitirRoles('administrador'), ctrl.recalcularTodas);

module.exports = router;
