const PDFDocument = require('pdfkit');

const AZUL = '#0b5394';
const CELESTE = '#4a90d9';

/**
 * Crea un documento PDFKit con el encabezado institucional estándar
 * (nombre del hospital + franja de color + título del documento).
 * El "logo" se dibuja vectorialmente para no depender de un archivo
 * de imagen externo; puede reemplazarse por doc.image(path) si se
 * cuenta con el logo oficial del hospital.
 */
function crearDocumentoConEncabezado(titulo, subtitulo = '') {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });

  // Franja superior
  doc.rect(0, 0, doc.page.width, 90).fill(AZUL);

  // "Logo" vectorial simple (cruz médica dentro de un círculo)
  doc.circle(60, 45, 22).fill('#ffffff');
  doc.fillColor(AZUL);
  doc.rect(54, 34, 12, 22).fill(AZUL);
  doc.rect(46, 42, 28, 6).fill(AZUL);

  doc
    .fillColor('#ffffff')
    .fontSize(15)
    .text('Hospital Materno Germán Urquidi', 95, 22, { width: 420 })
    .fontSize(9)
    .fillColor('#e8f0fb')
    .text('Cochabamba - Bolivia · Sistema de Vacunación Inteligente', 95, 42, { width: 420 });

  doc
    .fillColor('#ffffff')
    .fontSize(12)
    .text(titulo, 95, 62, { width: 420 });

  doc.fillColor('#000000');
  doc.moveDown(4);
  if (subtitulo) {
    doc.fontSize(10).fillColor('#555555').text(subtitulo, 40, 100);
    doc.moveDown();
  }
  doc.y = 110;
  doc.fillColor('#000000');

  return doc;
}

function dibujarTablaSimple(doc, { headers, rows, startY, colWidths }) {
  const startX = 40;
  let y = startY;
  const width = colWidths.reduce((a, b) => a + b, 0);
  doc.fontSize(9);
  const altura = cells => Math.max(20, ...cells.map((cell, i) => doc.heightOfString(String(cell ?? ''), { width: colWidths[i] - 8 }) + 8));
  const headerHeight = altura(headers);
  function celdas(cells, color) {
    let x = startX;
    cells.forEach((cell, i) => {
      doc.fillColor(color).text(String(cell ?? ''), x + 4, y + 4, { width: colWidths[i] - 8 });
      x += colWidths[i];
    });
  }
  function cabecera() {
    doc.rect(startX, y, width, headerHeight).fill(AZUL);
    celdas(headers, '#ffffff');
    y += headerHeight;
  }
  if (y + headerHeight + (rows.length ? altura(rows[0]) : 0) > doc.page.height - 60) { doc.addPage(); y = 40; }
  cabecera();
  rows.forEach((row, idx) => {
    const rowHeight = altura(row);
    if (y + rowHeight > doc.page.height - 60) {
      doc.addPage();
      y = 40;
      cabecera();
    }
    if (idx % 2 === 0) {
      doc.rect(startX, y, width, rowHeight).fill('#f2f6fc');
    }
    celdas(row, '#222222');
    y += rowHeight;
  });

  return y;
}

module.exports = { crearDocumentoConEncabezado, dibujarTablaSimple, AZUL, CELESTE };
