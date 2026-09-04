const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/historial.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const auditar = require('../middlewares/audit.middleware');
const validar = require('../middlewares/validate.middleware');
const permitirRoles = require('../middlewares/role.middleware');

const router = Router();
router.use(authMiddleware);

const reglasEdicionHistorial = [
  body('fechaAplicacion').isISO8601().withMessage('La fecha de aplicación debe ser válida.'),
  body('establecimiento').optional({ checkFalsy: true }).trim().isLength({ max: 150 }).withMessage('El establecimiento no puede exceder los 150 caracteres.'),
  body('observaciones').optional({ checkFalsy: true }).trim().isLength({ max: 255 }).withMessage('Las observaciones no pueden exceder los 255 caracteres.')
];

router.get('/paciente/:id', ctrl.listarPorPaciente);
// Las aplicaciones se registran exclusivamente mediante POST /citas para garantizar lote, stock y transacción.
router.put('/:id', permitirRoles('administrador'), reglasEdicionHistorial, validar, auditar('EDITAR', 'historial_vacunacion'), ctrl.actualizar);

module.exports = router;
