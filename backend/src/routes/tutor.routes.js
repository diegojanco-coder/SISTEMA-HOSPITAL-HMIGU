const { Router } = require('express');
const { body, param } = require('express-validator');
const ctrl = require('../controllers/tutor.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const auditar = require('../middlewares/audit.middleware');
const validar = require('../middlewares/validate.middleware');
const permitirRoles = require('../middlewares/role.middleware');
const { CI_REGEX, NOMBRE_REGEX, esTelefonoBoliviano } = require('../utils/validation.util');

const router = Router();
router.use(authMiddleware);
const mensajeNombre = (campo) => `El campo ${campo} solo debe contener letras y tener entre 2 y 100 caracteres.`;
const reglaTexto = (campo, etiqueta) => body(campo).trim().matches(NOMBRE_REGEX).isLength({ min: 2, max: 100 }).withMessage(mensajeNombre(etiqueta));

const reglasTutor = [
  body('pacienteId').optional().isInt({ min: 1 }).withMessage('Seleccione un paciente válido'),
  reglaTexto('nombres', 'Nombre'),
  reglaTexto('apellidos', 'Apellido'),
  body('carnetIdentidad').optional({checkFalsy:true}).trim().matches(CI_REGEX).withMessage('La cédula de identidad debe tener 6 a 8 dígitos y una extensión boliviana válida opcional.'),
  body('parentesco').isLength({ max: 30 }).withMessage('El parentesco no puede exceder los 30 caracteres.').isIn(['padre', 'madre', 'tutor_legal', 'otro']),
  body('telefono').notEmpty().withMessage('El teléfono es obligatorio.').trim().custom(esTelefonoBoliviano).withMessage('El teléfono debe ser celular boliviano (8 dígitos e iniciar con 6 o 7) o línea fija regional válida.'),
  body('guardarPrerregistro').optional().custom(value=>typeof value==='boolean').withMessage('Confirme si falta el correo'),
  body('email').custom((value,{req})=>Boolean(value?.trim()) || req.body.guardarPrerregistro===true).withMessage('El correo es obligatorio salvo que confirme que no dispone de correo.'),
  body('email').optional({checkFalsy:true}).trim().isLength({ max: 120 }).withMessage('El email no puede exceder los 120 caracteres.').isEmail().withMessage('Por favor, ingrese un correo electrónico válido.')
];

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', permitirRoles('administrador', 'enfermero'), reglasTutor, validar, auditar('CREAR', 'tutores'), ctrl.crear);
router.put('/:id', permitirRoles('administrador', 'enfermero'), reglasTutor, validar, auditar('EDITAR', 'tutores'), ctrl.actualizar);
router.delete('/:id', permitirRoles('administrador'), auditar('ELIMINAR', 'tutores'), ctrl.eliminar);
router.post('/:id/pacientes/:pacienteId', permitirRoles('administrador', 'enfermero'), [param('id').isInt({ min: 1 }), param('pacienteId').isInt({ min: 1 }), body('esPrincipal').optional().custom(v => typeof v === 'boolean')], validar, auditar('EDITAR', 'paciente_tutor'), ctrl.vincular);
router.delete('/:id/pacientes/:pacienteId', permitirRoles('administrador'), [param('id').isInt({ min: 1 }), param('pacienteId').isInt({ min: 1 })], validar, auditar('EDITAR', 'paciente_tutor'), ctrl.desvincular);

module.exports = router;
