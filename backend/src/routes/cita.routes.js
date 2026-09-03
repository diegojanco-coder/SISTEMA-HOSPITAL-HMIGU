const { Router } = require('express');
const { body } = require('express-validator');
const auth = require('../middlewares/auth.middleware');
const roles = require('../middlewares/role.middleware');
const validar = require('../middlewares/validate.middleware');
const auditar = require('../middlewares/audit.middleware');
const ctrl = require('../controllers/cita.controller');

const router = Router();
router.post('/', auth, roles('enfermero', 'administrador'), [
  body('pacienteId').isInt(), body('dosisAplicadas').isArray({ min: 1 }),
  body('dosisAplicadas.*.dosisId').isInt(), body('dosisAplicadas.*.loteVacunaId').isInt()
], validar, auditar('CREAR', 'citas'), ctrl.registrar);
module.exports = router;
