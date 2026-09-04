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
  body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio').isLength({ max: 100 }).withMessage('El nombre no puede exceder los 100 caracteres.'),
  body('nombreCorto').trim().notEmpty().withMessage('El nombre corto es obligatorio').isLength({ max: 20 }).withMessage('El nombre corto no puede exceder los 20 caracteres.'),
  body('descripcion').optional({ checkFalsy: true }).trim().isLength({ max: 255 }).withMessage('La descripción no puede exceder los 255 caracteres.'),
  body('enfermedadPrevine').optional({ checkFalsy: true }).trim().isLength({ max: 100 }).withMessage('La enfermedad no puede exceder los 100 caracteres.')
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
