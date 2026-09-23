const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/historial.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { esFechaISOValida } = require('../utils/validation.util');
const validar = require('../middlewares/validate.middleware');
const permitirRoles = require('../middlewares/role.middleware');

const router = Router();
router.use(authMiddleware);

const reglasEdicionHistorial = [
  body('fechaAplicacion').custom(esFechaISOValida).withMessage('La fecha de aplicación debe ser válida.'),
  body('establecimiento').optional({ checkFalsy: true }).trim().isLength({ max: 150 }).withMessage('El establecimiento no puede exceder los 150 caracteres.'),
  body('documentoReferencia').optional().isString().bail().trim().isLength({min:1,max:200}).withMessage('Indique una referencia documental de hasta 200 caracteres.'),
  body('observaciones').optional({ checkFalsy: true }).trim().isLength({ max: 255 }).withMessage('Las observaciones no pueden exceder los 255 caracteres.')
];

router.get('/paciente/:id', ctrl.listarPorPaciente);
router.post('/antecedentes',permitirRoles('administrador','enfermero'),[
 body('pacienteId').isInt({min:1}).toInt(),body('dosisId').isInt({min:1}).toInt(),
 body('fechaAplicacion').custom(esFechaISOValida).withMessage('La fecha de aplicación debe ser válida.'),
 body('establecimiento').isString().bail().trim().isLength({min:1,max:150}).withMessage('Indique el establecimiento de origen.'),
 body('documentoReferencia').isString().bail().trim().isLength({min:1,max:200}).withMessage('Indique la referencia del documento de vacunación.'),
 body('observaciones').optional().isString().bail().trim().isLength({max:255}),
 body('loteVacunaId').not().exists().withMessage('Los antecedentes externos no usan lotes del hospital.'),
 body('citaId').not().exists(),body('origen').not().exists(),
],validar,ctrl.registrarAntecedente);
// Las aplicaciones se registran exclusivamente mediante POST /citas para garantizar lote, stock y transacción.
router.put('/:id', permitirRoles('administrador'), reglasEdicionHistorial, validar, ctrl.actualizar);

module.exports = router;
