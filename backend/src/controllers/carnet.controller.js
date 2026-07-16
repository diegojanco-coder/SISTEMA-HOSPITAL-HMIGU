const carnetService = require('../services/carnet.service');
const { fail } = require('../utils/response.util');

async function generar(req, res, next) {
  try {
    const doc = await carnetService.generarCarnetPDF(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=carnet_${req.params.id}.pdf`);
    doc.pipe(res);
    doc.end();
  } catch (error) {
    if (error.status) return fail(res, error.message, error.status);
    return next(error);
  }
}

module.exports = { generar };
