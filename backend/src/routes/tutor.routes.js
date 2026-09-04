const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/tutor.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const auditar = require('../middlewares/audit.middleware');
const validar = require('../middlewares/validate.middleware');

const router = Router();
router.use(authMiddleware);
const mensajeNombre = (campo) => `El campo ${campo} solo debe contener letras y tener entre 2 y 100 caracteres.`;
const reglaTexto = (campo, etiqueta) => body(campo).trim().matches(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:\\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/u).isLength({ min: 2, max: 100 }).withMessage(mensajeNombre(etiqueta));

const reglasTutor = [
  reglaTexto('nombres', 'Nombre'),
  reglaTexto('apellidos', 'Apellido'),
  body('carnetIdentidad').trim().notEmpty().withMessage('El carnet de identidad es obligatorio').isLength({ max: 10 }).withMessage('El CI no puede exceder los 10 caracteres.'),
  body('parentesco').isLength({ max: 30 }).withMessage('El parentesco no puede exceder los 30 caracteres.').isIn(['padre', 'madre', 'tutor_legal', 'otro']),
  body('telefono').optional({ checkFalsy: true }).trim().isLength({ max: 15 }).withMessage('El teléfono no puede exceder los 15 caracteres.').matches(/^\d{7,15}$/).withMessage('El número de teléfono debe ser válido y contener entre 7 y 15 dígitos.'),
  body('email').optional({ checkFalsy: true }).trim().isLength({ max: 100 }).withMessage('El email no puede exceder los 100 caracteres.').isEmail().withMessage('Por favor, ingrese un correo electrónico válido.')
];

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', reglasTutor, validar, auditar('CREAR', 'tutores'), ctrl.crear);
router.put('/:id', reglasTutor, validar, auditar('EDITAR', 'tutores'), ctrl.actualizar);
router.delete('/:id', auditar('ELIMINAR', 'tutores'), ctrl.eliminar);
router.post('/:id/pacientes/:pacienteId', ctrl.vincular);
router.delete('/:id/pacientes/:pacienteId', ctrl.desvincular);

module.exports = router;
