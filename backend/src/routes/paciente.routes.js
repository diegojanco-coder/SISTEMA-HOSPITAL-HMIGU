const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/paciente.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const auditar = require('../middlewares/audit.middleware');
const validar = require('../middlewares/validate.middleware');

const router = Router();
router.use(authMiddleware);

const reglasPaciente = [
  body('nombres').notEmpty().withMessage('Los nombres son obligatorios'),
  body('apellidos').notEmpty().withMessage('Los apellidos son obligatorios'),
  body('fechaNacimiento').isISO8601().withMessage('Fecha de nacimiento inválida'),
  body('fechaNacimiento').custom((valor) => new Date(`${valor}T00:00:00`) <= new Date()).withMessage('La fecha de nacimiento no puede ser futura'),
  body('email').isEmail().withMessage('El correo electrónico del paciente es obligatorio y debe ser válido'),
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
