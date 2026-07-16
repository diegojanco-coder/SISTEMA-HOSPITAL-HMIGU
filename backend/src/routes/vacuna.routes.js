const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/vacuna.controller');
const dosisCtrl = require('../controllers/dosis.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const permitirRoles = require('../middlewares/role.middleware');
const auditar = require('../middlewares/audit.middleware');
const validar = require('../middlewares/validate.middleware');

const router = Router();
router.use(authMiddleware);

const reglasVacuna = [
  body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
  body('nombreCorto').notEmpty().withMessage('El nombre corto es obligatorio')
];

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', permitirRoles('administrador'), reglasVacuna, validar, auditar('CREAR', 'vacunas'), ctrl.crear);
router.put('/:id', permitirRoles('administrador'), reglasVacuna, validar, auditar('EDITAR', 'vacunas'), ctrl.actualizar);
router.delete('/:id', permitirRoles('administrador'), auditar('ELIMINAR', 'vacunas'), ctrl.eliminar);

router.post('/:vacunaId/dosis', permitirRoles('administrador'), auditar('CREAR', 'dosis'), dosisCtrl.agregar);
router.put('/dosis/:id', permitirRoles('administrador'), auditar('EDITAR', 'dosis'), dosisCtrl.actualizar);
router.delete('/dosis/:id', permitirRoles('administrador'), auditar('ELIMINAR', 'dosis'), dosisCtrl.eliminar);

module.exports = router;
