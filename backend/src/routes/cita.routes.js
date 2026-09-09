const { Router } = require('express');
const { body } = require('express-validator');
const auth = require('../middlewares/auth.middleware');
const roles = require('../middlewares/role.middleware');
const validar = require('../middlewares/validate.middleware');
const ctrl = require('../controllers/cita.controller');

const router = Router();
router.post('/', auth, roles('administrador', 'enfermero'), [
  body('pacienteId').isInt({ min: 1 }), body('dosisAplicadas').isArray({ min: 1 }),
  body('observaciones').optional({ checkFalsy: true }).isLength({ max: 255 }).withMessage('Las observaciones no pueden exceder los 255 caracteres.'),
  body('dosisAplicadas.*.dosisId').isInt({ min: 1 }), body('dosisAplicadas.*.loteVacunaId').isInt({ min: 1 }),
  body('dosisAplicadas.*.establecimiento').optional({ checkFalsy: true }).trim().isLength({ max: 150 }).withMessage('El establecimiento no puede exceder los 150 caracteres.'),
  body('dosisAplicadas.*.observaciones').optional({ checkFalsy: true }).isLength({ max: 255 }).withMessage('Las observaciones no pueden exceder los 255 caracteres.')
], validar, ctrl.registrar);
module.exports = router;
