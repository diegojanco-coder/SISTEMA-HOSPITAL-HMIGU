const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/tutor.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const auditar = require('../middlewares/audit.middleware');
const validar = require('../middlewares/validate.middleware');

const router = Router();
router.use(authMiddleware);

const reglasTutor = [
  body('nombres').notEmpty(),
  body('apellidos').notEmpty(),
  body('carnetIdentidad').notEmpty().withMessage('El carnet de identidad es obligatorio'),
  body('parentesco').isIn(['padre', 'madre', 'tutor_legal', 'otro']),
  body('telefono').notEmpty().withMessage('El teléfono del tutor es obligatorio'),
  body('email').isEmail().withMessage('El correo electrónico del tutor es obligatorio y debe ser válido')
];

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', reglasTutor, validar, auditar('CREAR', 'tutores'), ctrl.crear);
router.put('/:id', reglasTutor, validar, auditar('EDITAR', 'tutores'), ctrl.actualizar);
router.delete('/:id', auditar('ELIMINAR', 'tutores'), ctrl.eliminar);
router.post('/:id/pacientes/:pacienteId', ctrl.vincular);
router.delete('/:id/pacientes/:pacienteId', ctrl.desvincular);

module.exports = router;
