const { Router } = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validar = require('../middlewares/validate.middleware');

const router = Router();

router.post(
  '/login',
  [body('login').notEmpty().withMessage('El usuario/email es obligatorio'),
   body('password').notEmpty().withMessage('La contraseña es obligatoria')],
  validar,
  authController.login
);

router.post('/logout', authMiddleware, authController.logout);
router.get('/me', authMiddleware, authController.me);

module.exports = router;
