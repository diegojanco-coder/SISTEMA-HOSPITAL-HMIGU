const { validationResult } = require('express-validator');

function validar(req, res, next) {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({
      message: errores.array()[0].msg
    });
  }
  return next();
}

function limpiarTexto(valor) {
  return typeof valor === 'string' ? valor.trim() : valor;
}

module.exports = {
  validar,
  limpiarTexto,
};
