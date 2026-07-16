const reporteService = require('../services/reporte.service');
const { fail, ok } = require('../utils/response.util');

async function generar(req, res, next) {
  try {
    const { tipo } = req.params;
    const { formato = 'json' } = req.query;
    const reporte = await reporteService.generarReporte(tipo, req.query);

    if (formato === 'pdf') {
      const doc = reporteService.generarPDF(reporte);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${tipo}.pdf`);
      doc.pipe(res);
      doc.end();
      return;
    }

    if (formato === 'excel') {
      const buffer = await reporteService.generarExcel(reporte);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${tipo}.xlsx`);
      return res.send(buffer);
    }

    return ok(res, reporte);
  } catch (error) {
    if (error.status) return fail(res, error.message, error.status);
    return next(error);
  }
}

module.exports = { generar };
