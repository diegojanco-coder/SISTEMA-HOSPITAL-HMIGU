const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/cita.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const auditar = require('../middlewares/audit.middleware');
const validar = require('../middlewares/validate.middleware');

const router = Router();
router.use(authMiddleware);

const reglasCita = [
  body('pacienteId').isInt().withMessage('Paciente inválido'),
  body('dosisId').isInt().withMessage('Dosis inválida'),
  body('fechaProgramada').isISO8601().withMessage('Fecha inválida')
];

router.post('/', reglasCita, validar, auditar('CREAR', 'citas_vacunacion'), ctrl.crear);
router.get('/paciente/:pacienteId', ctrl.listarPorPaciente);

module.exports = router;