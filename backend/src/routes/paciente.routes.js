const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/paciente.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const auditar = require('../middlewares/audit.middleware');
const validar = require('../middlewares/validate.middleware');
const permitirRoles = require('../middlewares/role.middleware');
const { CI_REGEX, NOMBRE_REGEX, esFechaISOValida, esTelefonoBoliviano } = require('../utils/validation.util');

const router = Router();
router.use(authMiddleware);
const mensajeNombre = (campo) => `El campo ${campo} solo debe contener letras y tener entre 2 y 50 caracteres.`;
const reglaTexto = (campo, etiqueta) => body(campo).trim().matches(NOMBRE_REGEX).isLength({ min: 2, max: 50 }).withMessage(mensajeNombre(etiqueta));

const reglasPaciente = [
  reglaTexto('nombres', 'Nombre'),
  reglaTexto('apellidos', 'Apellido'),
  body('fechaNacimiento').trim().notEmpty().withMessage('La fecha de nacimiento es obligatoria').custom(esFechaISOValida).withMessage('La fecha de nacimiento debe tener una fecha válida.'),
  body('fechaNacimiento').custom((valor) => new Date(`${valor}T00:00:00`) <= new Date()).withMessage('La fecha de nacimiento no puede ser una fecha futura.'),
  body('carnetIdentidad').optional({ checkFalsy: true }).trim().matches(CI_REGEX).withMessage('La cédula de identidad debe tener 6 a 8 dígitos y una extensión boliviana válida opcional.'),
  body('telefonoContacto').optional({ checkFalsy: true }).trim().custom(esTelefonoBoliviano).withMessage('El teléfono debe ser celular boliviano (8 dígitos e iniciar con 6 o 7) o línea fija regional válida.'),
  body('email').optional({ checkFalsy: true }).trim().isLength({ max: 100 }).withMessage('El email no puede exceder los 100 caracteres.').isEmail().withMessage('Por favor, ingrese un correo electrónico válido.'),
  body('sexo').isIn(['M', 'F']).withMessage('Sexo inválido')
];

router.get('/buscar', ctrl.buscar);
router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.get('/:id/esquema', ctrl.obtenerEsquema);
router.post('/', permitirRoles('administrador'), reglasPaciente, validar, auditar('CREAR', 'pacientes'), ctrl.crear);
router.put('/:id', permitirRoles('administrador'), reglasPaciente, validar, auditar('EDITAR', 'pacientes'), ctrl.actualizar);
router.delete('/:id', permitirRoles('administrador'), auditar('ELIMINAR', 'pacientes'), ctrl.eliminar);

module.exports = router;
