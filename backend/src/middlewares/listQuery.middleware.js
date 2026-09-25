const { query } = require('express-validator');

const pagination = [
  query('page').optional().custom(value => typeof value === 'string').withMessage('La página debe ser un valor único.').bail().isInt({ min: 1, max: 1000000 }).withMessage('La página debe ser un entero positivo válido.'),
  query('limit').optional().custom(value => typeof value === 'string').withMessage('El límite debe ser un valor único.').bail().isInt({ min: 1, max: 100 }).withMessage('El límite debe ser un entero entre 1 y 100.')
];
const search = query('q').optional().custom(value => typeof value === 'string').withMessage('La búsqueda debe ser un texto único.').bail().isLength({ max: 100 }).withMessage('La búsqueda admite hasta 100 caracteres.');
const singleChoice = (name, allowed) => query(name).optional().custom(value => typeof value === 'string').withMessage(`El filtro ${name} debe ser un valor único.`).bail().isIn(allowed).withMessage(`El filtro ${name} no es válido.`);
const singleText = (name, max) => query(name).optional().custom(value => typeof value === 'string').withMessage(`El filtro ${name} debe ser un valor único.`).bail().isLength({ max }).withMessage(`El filtro ${name} admite hasta ${max} caracteres.`);
const positiveId = name => query(name).optional().custom(value => typeof value === 'string').withMessage(`El filtro ${name} debe ser un valor único.`).bail().isInt({ min: 1 }).withMessage(`El filtro ${name} debe ser un entero positivo.`);

module.exports = { pagination, search, singleChoice, singleText, positiveId };
