const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/paciente.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const auditar = require('../middlewares/audit.middleware');
const validar = require('../middlewares/validate.middleware');
const { pagination, search } = require('../middlewares/listQuery.middleware');
const permitirRoles = require('../middlewares/role.middleware');
const { CI_REGEX, NOMBRE_REGEX, esFechaISOValida, esTelefonoBoliviano } = require('../utils/validation.util');

const router = Router();
router.use(authMiddleware);
const mensajeNombre = (campo) => `El campo ${campo} solo debe contener letras y tener entre 2 y 100 caracteres.`;
const reglaTexto = (campo, etiqueta) => body(campo).trim().matches(NOMBRE_REGEX).withMessage(mensajeNombre(etiqueta)).bail().isLength({ min: 2, max: 100 }).withMessage(mensajeNombre(etiqueta));

const reglasPaciente = [
  body('identidadProvisional').optional().custom(value=>typeof value==='boolean').withMessage('La identidad provisional debe ser verdadera o falsa'),
  body('guardarPrerregistro').optional().custom(value=>typeof value==='boolean').withMessage('Confirme si guardará un prerregistro'),
  body('tipoPaciente').optional().isIn(['menor','adulto']).withMessage('Seleccione el tipo de paciente'),
  body('contactoAlertas').optional().isIn(['paciente','tutor']).withMessage('Seleccione el destinatario de las alertas'),
  body('nombres').if((value,{req})=>!req.body.identidadProvisional).trim().matches(NOMBRE_REGEX).isLength({min:2,max:100}).withMessage(mensajeNombre('Nombre')),
  body('apellidos').if((value,{req})=>!req.body.identidadProvisional || Boolean(value)).trim().matches(NOMBRE_REGEX).isLength({min:2,max:100}).withMessage(mensajeNombre('Apellido')),
  body('fechaNacimiento').trim().notEmpty().withMessage('La fecha de nacimiento es obligatoria').custom(esFechaISOValida).withMessage('La fecha de nacimiento debe tener una fecha válida.'),
  body('fechaNacimiento').custom((valor) => new Date(`${valor}T00:00:00`) <= new Date()).withMessage('La fecha de nacimiento no puede ser una fecha futura.'),
  body('carnetIdentidad').optional({ checkFalsy: true }).trim().matches(CI_REGEX).withMessage('La cédula de identidad debe tener 6 a 8 dígitos y una extensión boliviana válida opcional.'),
  body('telefonoContacto').optional({ checkFalsy: true }).trim().custom(esTelefonoBoliviano).withMessage('El teléfono debe ser celular boliviano (8 dígitos e iniciar con 6 o 7) o línea fija regional válida.'),
  body('email').optional({ checkFalsy: true }).trim().isLength({ max: 120 }).withMessage('El email no puede exceder los 120 caracteres.').isEmail().withMessage('Por favor, ingrese un correo electrónico válido.'),
  body('departamento').optional({checkFalsy:true}).isIn(['Beni','Chuquisaca','Cochabamba','La Paz','Oruro','Pando','Potosí','Santa Cruz','Tarija']).withMessage('Seleccione un departamento boliviano'),
  body('esDependiente').optional().custom(value => typeof value === 'boolean').withMessage('La condición de dependencia debe ser verdadera o falsa'),
  body('tutorId').optional().isInt({ min: 1 }).withMessage('Seleccione un tutor válido'),
  body('tutor').optional().isObject().withMessage('Datos del tutor inválidos'),
  ...['nombres', 'apellidos'].map(campo => body(`tutor.${campo}`).if(body('tutor').exists()).trim().matches(NOMBRE_REGEX).withMessage('El nombre y apellido del tutor solo deben contener letras').bail().isLength({ min: 2, max: 100 }).withMessage('El nombre y apellido del tutor deben contener entre 2 y 100 letras')),
  body('tutor.carnetIdentidad').optional({checkFalsy:true}).trim().matches(CI_REGEX).withMessage('Ingrese un CI válido para el tutor'),
  body('tutor.parentesco').if(body('tutor').exists()).isIn(['padre','madre','tutor_legal','otro']).withMessage('Seleccione el parentesco del tutor'),
  body('tutor.telefono').if(body('tutor').exists()).trim().custom(esTelefonoBoliviano).withMessage('Ingrese un teléfono boliviano válido para el tutor'),
  body('tutor.email').optional({checkFalsy:true}).trim().isLength({ max: 120 }).isEmail().withMessage('Ingrese un correo válido para el tutor'),
  body('tutor.direccion').optional().isLength({max:255}).withMessage('La dirección del tutor admite hasta 255 caracteres'),
  body('direccion').optional().isLength({ max: 255 }).withMessage('La dirección admite hasta 255 caracteres'),
  body('sexo').isIn(['M', 'F']).withMessage('Sexo inválido')
];

router.get('/buscar', [search], validar, ctrl.buscar);
router.get('/', [...pagination, search], validar, ctrl.listar);
router.get('/:id', ctrl.obtener);
router.get('/:id/esquema', ctrl.obtenerEsquema);
router.post('/', permitirRoles('administrador', 'enfermero'), reglasPaciente, validar, auditar('CREAR', 'pacientes'), ctrl.crear);
router.put('/:id', permitirRoles('administrador', 'enfermero'), reglasPaciente, validar, auditar('EDITAR', 'pacientes'), ctrl.actualizar);
router.delete('/:id', permitirRoles('administrador'), auditar('ELIMINAR', 'pacientes'), ctrl.eliminar);

module.exports = router;
