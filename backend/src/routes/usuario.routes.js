const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/usuario.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const permitirRoles = require('../middlewares/role.middleware');
const auditar = require('../middlewares/audit.middleware');
const validar = require('../middlewares/validate.middleware');

const router = Router();
router.use(authMiddleware, permitirRoles('administrador'));

const reglasUsuario = [
  body('nombreCompleto').notEmpty().withMessage('El nombre completo es obligatorio'),
  body('email').isEmail().withMessage('Email inválido'),
  body('username').isLength({ min: 3 }).withMessage('El usuario debe tener al menos 3 caracteres'),
  body('rol').isIn(['administrador', 'enfermero']).withMessage('Rol inválido')
];

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', [...reglasUsuario, body('password').isLength({ min: 6 })], validar, auditar('CREAR', 'usuarios'), ctrl.crear);
router.put('/:id', reglasUsuario, validar, auditar('EDITAR', 'usuarios'), ctrl.actualizar);
router.patch('/:id/password', ctrl.cambiarPassword);
router.delete('/:id', auditar('ELIMINAR', 'usuarios'), ctrl.eliminar);

module.exports = router;
