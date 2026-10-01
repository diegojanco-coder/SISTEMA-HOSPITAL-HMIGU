const { Router } = require('express');
const { body } = require('express-validator');
const auth = require('../middlewares/auth.middleware');
const roles = require('../middlewares/role.middleware');
const validar = require('../middlewares/validate.middleware');
const auditar = require('../middlewares/audit.middleware');
const ctrl = require('../controllers/lote.controller');
const mermaCtrl = require('../controllers/merma.controller');
const {esFechaISOValida}=require('../utils/validation.util');
const {fechaCivil,isoCivil}=require('../utils/calendario.util');
const router = Router();
router.use(auth);
router.get('/vacuna/:vacunaId/disponibles', ctrl.listarDisponibles);
router.post('/mermas', roles('administrador', 'enfermero'), [
  body('loteId').isInt({ min: 1 }).withMessage('Seleccione un lote válido.'),
  body('cantidadDosisPerdidas').isInt({ min: 1 }).withMessage('La cantidad perdida debe ser mayor a cero.'),
  body('motivo').isIn(['frasco_abierto_vencido','rotura_accidental','falla_cadena_frio','otro']).withMessage('Seleccione un motivo válido.'),
  body('observaciones').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }).withMessage('Las observaciones admiten hasta 1000 caracteres.')
], validar, mermaCtrl.registrar);
router.post('/', roles('administrador'), [
  body('vacunaId').isInt(),
  body('numeroLote').trim().notEmpty().withMessage('El número de lote es obligatorio.').isLength({ max: 50 }).withMessage('El número de lote no puede exceder los 50 caracteres.').matches(/^[A-Za-z0-9]+$/).withMessage('El número de lote solo puede contener letras y números.'),
  body('fechaVencimiento').custom(valor=>esFechaISOValida(valor) && valor>=isoCivil(fechaCivil(new Date()))).withMessage('El lote seleccionado se encuentra vencido o la fecha de expiración es inválida.'),
  body('cantidadDisponible').isInt({ min: 0 }).withMessage('La cantidad disponible debe ser un número entero mayor o igual a 0.')
], validar, auditar('CREAR', 'lotes_vacuna'), ctrl.crear);
module.exports = router;
