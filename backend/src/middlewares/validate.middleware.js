const { validationResult } = require('express-validator');
const { fail } = require('../utils/response.util');
module.exports = function validar(req,res,next) {
 const errors=validationResult(req).array({onlyFirstError:true}).map(e=>({campo:e.path,mensaje:e.msg === 'Invalid value' ? `El campo ${e.path} no es válido` : e.msg}));
 if(errors.length) return fail(res,errors[0].mensaje,422,errors);
 return next();
};
