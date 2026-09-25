const { Router } = require('express');
const ctrl = require('../controllers/auditoria.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const permitirRoles = require('../middlewares/role.middleware');
const validar = require('../middlewares/validate.middleware');
const { pagination, singleText, positiveId } = require('../middlewares/listQuery.middleware');

const router = Router();
router.get('/', authMiddleware, permitirRoles('administrador'), [...pagination, singleText('entidad', 50), positiveId('usuarioId')], validar, ctrl.listar);

module.exports = router;
