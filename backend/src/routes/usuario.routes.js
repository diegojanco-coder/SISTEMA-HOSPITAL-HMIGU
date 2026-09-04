const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/usuario.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const permitirRoles = require('../middlewares/role.middleware');
const auditar = require('../middlewares/audit.middleware');
const validar = require('../middlewares/validate.middleware');

const router = Router();
router.use(authMiddleware, permitirRoles('administrador'));
const passwordFuerte = body('password').isLength({ min: 6, max: 20 }).withMessage('La contraseña debe tener entre 6 y 20 caracteres.').matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$/).withMessage('La contraseña debe tener al menos 8 caracteres, incluir una mayúscula, una minúscula y un número.');

const reglasUsuario = [
  body('nombreCompleto').trim().notEmpty().withMessage('El nombre completo es obligatorio').isLength({ max: 100 }).withMessage('El nombre completo no puede exceder los 100 caracteres.'),
  body('email').trim().isLength({ max: 100 }).withMessage('El email no puede exceder los 100 caracteres.').isEmail().withMessage('Por favor, ingrese un correo electrónico válido.'),
  body('username').trim().isLength({ min: 3, max: 30 }).withMessage('El nombre de usuario debe tener entre 3 y 30 caracteres'),
  body('rol').isIn(['administrador', 'enfermero']).withMessage('Rol inválido')
];

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', [...reglasUsuario, passwordFuerte], validar, auditar('CREAR', 'usuarios'), ctrl.crear);
router.put('/:id', reglasUsuario, validar, auditar('EDITAR', 'usuarios'), ctrl.actualizar);
router.patch('/:id/password', passwordFuerte, validar, ctrl.cambiarPassword);
router.delete('/:id', auditar('ELIMINAR', 'usuarios'), ctrl.eliminar);

module.exports = router;
