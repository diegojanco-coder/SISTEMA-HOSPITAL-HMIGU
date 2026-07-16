const { Router } = require('express');
const ctrl = require('../controllers/auditoria.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const permitirRoles = require('../middlewares/role.middleware');

const router = Router();
router.get('/', authMiddleware, permitirRoles('administrador'), ctrl.listar);

module.exports = router;
