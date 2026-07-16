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
  const rowHeight = 20;

  doc.fontSize(9).fillColor('#ffffff');
  doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), rowHeight).fill(AZUL);
  let x = startX;
  headers.forEach((h, i) => {
    doc.fillColor('#ffffff').text(h, x + 4, y + 6, { width: colWidths[i] - 8 });
    x += colWidths[i];
  });
  y += rowHeight;

  doc.fillColor('#000000').fontSize(9);
  rows.forEach((row, idx) => {
    if (y > doc.page.height - 60) {
      doc.addPage();
      y = 40;
    }
    if (idx % 2 === 0) {
      doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), rowHeight).fill('#f2f6fc');
      doc.fillColor('#000000');
    }
    x = startX;
    row.forEach((cell, i) => {
      doc.fillColor('#222222').text(String(cell ?? ''), x + 4, y + 6, { width: colWidths[i] - 8 });
      x += colWidths[i];
    });
    y += rowHeight;
  });

  return y;
}

module.exports = { crearDocumentoConEncabezado, dibujarTablaSimple, AZUL, CELESTE };
