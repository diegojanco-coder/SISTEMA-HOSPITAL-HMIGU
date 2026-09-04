const { Router } = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validar = require('../middlewares/validate.middleware');

const router = Router();
const passwordFuerte = body('password').isLength({ min: 6, max: 20 }).withMessage('La contraseña debe tener entre 6 y 20 caracteres.').matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/)
  .withMessage('La contraseña debe tener al menos 8 caracteres, incluir una mayúscula, una minúscula y un número.');

router.post(
  '/login',
  [body('login').trim().notEmpty().withMessage('El usuario/email es obligatorio'),
   passwordFuerte],
  validar,
  authController.login
);

router.post('/logout', authMiddleware, authController.logout);
router.get('/me', authMiddleware, authController.me);

module.exports = router;
