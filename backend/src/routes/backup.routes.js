const { Router } = require('express');
const ctrl = require('../controllers/backup.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const permitirRoles = require('../middlewares/role.middleware');

const router = Router();
router.use(authMiddleware, permitirRoles('administrador'));

router.post('/', ctrl.ejecutar);
router.get('/', ctrl.listar);

module.exports = router;
