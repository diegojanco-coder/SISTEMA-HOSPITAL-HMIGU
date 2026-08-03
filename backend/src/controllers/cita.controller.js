const citaModel = require('../models/cita.model');

async function crear(req, res, next) {
  try {
    const { pacienteId, dosisId, fechaProgramada } = req.body;
    const creadoPor = req.usuario?.id || null;

    const cita = await citaModel.crear({ pacienteId, dosisId, fechaProgramada, creadoPor });
    res.status(201).json({ mensaje: 'Cita programada correctamente', cita });
  } catch (error) {
    next(error);
  }
}

async function listarPorPaciente(req, res, next) {
  try {
    const citas = await citaModel.listarPorPaciente(req.params.pacienteId);
    res.json(citas);
  } catch (error) {
    next(error);
  }
}

module.exports = { crear, listarPorPaciente };