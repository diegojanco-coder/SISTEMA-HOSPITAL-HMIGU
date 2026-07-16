const auditoriaModel = require('../models/auditoria.model');

async function registrar(data) {
  return auditoriaModel.create(data);
}

async function listar(filtros) {
  return auditoriaModel.findAll(filtros);
}

module.exports = { registrar, listar };
