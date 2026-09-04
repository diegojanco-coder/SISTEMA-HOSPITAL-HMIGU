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

const reglasDosis = [
  body('numeroDosis').isInt({ min: 1, max: 99 }).withMessage('El número de dosis debe ser un entero mayor que cero.'),
  body('nombreDosis').trim().notEmpty().withMessage('El nombre de la dosis es obligatorio.').isLength({ max: 60 }).withMessage('El nombre de la dosis no puede exceder los 60 caracteres.'),
  body('edadRecomendadaDias').isInt({ min: 0 }).withMessage('La edad recomendada debe ser un número entero positivo.'),
  body('toleranciaDias').optional().isInt({ min: 0 }).withMessage('La tolerancia debe ser un número entero mayor o igual a cero.'),
  body('intervaloMinimoDias').optional().isInt({ min: 0 }).withMessage('El intervalo mínimo debe ser un número entero mayor o igual a cero.')
];

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', permitirRoles('administrador'), reglasVacuna, validar, auditar('CREAR', 'vacunas'), ctrl.crear);
router.post('/:vacunaId/dosis', permitirRoles('administrador'), reglasDosis, validar, auditar('CREAR', 'dosis'), dosisCtrl.agregar);
router.put('/dosis/:id', permitirRoles('administrador'), reglasDosis, validar, auditar('EDITAR', 'dosis'), dosisCtrl.actualizar);
router.delete('/dosis/:id', permitirRoles('administrador'), auditar('ELIMINAR', 'dosis'), dosisCtrl.eliminar);
router.put('/:id', permitirRoles('administrador'), reglasVacuna, validar, auditar('EDITAR', 'vacunas'), ctrl.actualizar);
router.delete('/:id', permitirRoles('administrador'), auditar('ELIMINAR', 'vacunas'), ctrl.eliminar);

module.exports = router;
