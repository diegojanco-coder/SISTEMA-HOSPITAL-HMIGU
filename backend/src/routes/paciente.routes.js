const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/paciente.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const auditar = require('../middlewares/audit.middleware');
const validar = require('../middlewares/validate.middleware');

const router = Router();
router.use(authMiddleware);
const mensajeNombre = (campo) => `El campo ${campo} solo debe contener letras y tener entre 2 y 50 caracteres.`;
const reglaTexto = (campo, etiqueta) => body(campo).trim().matches(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:\\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/u).isLength({ min: 2, max: 50 }).withMessage(mensajeNombre(etiqueta));

const reglasPaciente = [
  reglaTexto('nombres', 'Nombre'),
  reglaTexto('apellidos', 'Apellido'),
  body('fechaNacimiento').trim().notEmpty().withMessage('La fecha de nacimiento es obligatoria').isISO8601().withMessage('Fecha de nacimiento inválida'),
  body('fechaNacimiento').custom((valor) => new Date(`${valor}T00:00:00`) <= new Date()).withMessage('La fecha de nacimiento no puede ser una fecha futura.'),
  body('carnetIdentidad').optional({ checkFalsy: true }).trim().isLength({ max: 10 }).withMessage('El CI no puede exceder los 10 caracteres.'),
  body('telefonoContacto').optional({ checkFalsy: true }).trim().isLength({ max: 15 }).withMessage('El teléfono no puede exceder los 15 caracteres.'),
  body('email').optional({ checkFalsy: true }).trim().isLength({ max: 100 }).withMessage('El email no puede exceder los 100 caracteres.').isEmail().withMessage('Por favor, ingrese un correo electrónico válido.'),
  body('sexo').isIn(['M', 'F']).withMessage('Sexo inválido')
];

router.get('/buscar', ctrl.buscar);
router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.get('/:id/esquema', ctrl.obtenerEsquema);
router.post('/', reglasPaciente, validar, auditar('CREAR', 'pacientes'), ctrl.crear);
router.put('/:id', reglasPaciente, validar, auditar('EDITAR', 'pacientes'), ctrl.actualizar);
router.delete('/:id', auditar('ELIMINAR', 'pacientes'), ctrl.eliminar);

module.exports = router;
