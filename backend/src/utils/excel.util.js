const ExcelJS = require('exceljs');

/**
 * Construye un workbook de Excel a partir de columnas y filas genéricas.
 * Devuelve un Buffer listo para enviarse como descarga.
 */
async function construirExcel({ nombreHoja = 'Reporte', columnas, filas, titulo }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistema de Vacunación Inteligente - HMGU';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(nombreHoja);

  if (titulo) {
    sheet.mergeCells(1, 1, 1, columnas.length);
    const celdaTitulo = sheet.getCell(1, 1);
    celdaTitulo.value = titulo;
    celdaTitulo.font = { bold: true, size: 14, color: { argb: 'FF0B5394' } };
    sheet.addRow([]);
  }

  const headerRow = sheet.addRow(columnas.map((c) => c.header));
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B5394' } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
  });

  filas.forEach((fila) => {
    sheet.addRow(columnas.map((c) => fila[c.key]));
  });

  sheet.columns.forEach((col, i) => {
    col.width = columnas[i]?.width || 20;
  });

  return workbook.xlsx.writeBuffer();
}

module.exports = { construirExcel };
