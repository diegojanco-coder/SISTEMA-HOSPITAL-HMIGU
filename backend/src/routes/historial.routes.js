const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/historial.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const auditar = require('../middlewares/audit.middleware');
const validar = require('../middlewares/validate.middleware');

const router = Router();
router.use(authMiddleware);

const reglasHistorial = [
  body('pacienteId').isInt().withMessage('Paciente inválido'),
  body('dosisId').isInt().withMessage('Dosis inválida'),
  body('fechaAplicacion').isISO8601().withMessage('Fecha de aplicación inválida')
];

router.get('/paciente/:id', ctrl.listarPorPaciente);
// Las aplicaciones se registran exclusivamente mediante POST /citas para garantizar lote, stock y transacción.
router.put('/:id', auditar('EDITAR', 'historial_vacunacion'), ctrl.actualizar);

module.exports = router;
