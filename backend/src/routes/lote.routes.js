const { Router } = require('express');
const { body } = require('express-validator');
const auth = require('../middlewares/auth.middleware');
const roles = require('../middlewares/role.middleware');
const validar = require('../middlewares/validate.middleware');
const auditar = require('../middlewares/audit.middleware');
const ctrl = require('../controllers/lote.controller');
const router = Router();
router.use(auth);
router.get('/vacuna/:vacunaId/disponibles', ctrl.listarDisponibles);
router.post('/', roles('administrador'), [
  body('vacunaId').isInt(),
  body('numeroLote').trim().matches(/^[A-Za-z0-9]+$/).isLength({ max: 50 }).withMessage('El número de lote es obligatorio y no puede superar los 50 caracteres.'),
  body('fechaVencimiento').isISO8601().custom((valor) => new Date(`${valor}T00:00:00`) > new Date()).withMessage('El lote seleccionado se encuentra vencido o la fecha de expiración es inválida.'),
  body('cantidadDisponible').isInt({ min: 0 }).withMessage('La cantidad disponible debe ser un número entero mayor o igual a 0.')
], validar, auditar('CREAR', 'lotes_vacuna'), ctrl.crear);
module.exports = router;
