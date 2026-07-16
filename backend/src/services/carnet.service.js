const crypto = require('crypto');
const pacienteModel = require('../models/paciente.model');
const dosisModel = require('../models/dosis.model');
const historialModel = require('../models/historial.model');
const motor = require('./motorVacunacion.service');
const { crearDocumentoConEncabezado, dibujarTablaSimple, AZUL } = require('../utils/pdf.util');
const { generarQRBuffer } = require('../utils/qr.util');
const { formatearEdad } = require('../utils/edad.util');

class CarnetError extends Error {
  constructor(message, status = 404) {
    super(message);
    this.status = status;
  }
}

/**
 * Genera un código de verificación determinístico y no reversible
 * para el carnet (se imprime junto al QR). No sustituye un mecanismo
 * de firma digital, pero permite validar que el PDF corresponde a un
 * paciente específico del sistema.
 */
function generarCodigoVerificacion(pacienteId) {
  return crypto.createHash('sha256').update(`carnet-${pacienteId}-${process.env.JWT_SECRET || 'hmgu'}`).digest('hex').slice(0, 12).toUpperCase();
}

async function generarCarnetPDF(pacienteId) {
  const paciente = await pacienteModel.findById(pacienteId);
  if (!paciente) throw new CarnetError('Paciente no encontrado');

  const tutores = await pacienteModel.findTutoresByPacienteId(pacienteId);
  const catalogoDosis = await dosisModel.findAllConVacuna();
  const historial = await historialModel.findByPacienteId(pacienteId);
  const { edad, detalle } = motor.evaluarEsquema(paciente, catalogoDosis, historial);

  const codigoVerificacion = generarCodigoVerificacion(pacienteId);
  const qrBuffer = await generarQRBuffer(
    `HMGU-CARNET|paciente:${paciente.codigo_paciente}|verificacion:${codigoVerificacion}`
  );

  const doc = crearDocumentoConEncabezado(
    'Carnet Digital de Vacunación',
    `Código de paciente: ${paciente.codigo_paciente}`
  );

  // Datos del paciente
  doc.fontSize(11).fillColor('#000000');
  doc.text(`Nombre completo: ${paciente.nombres} ${paciente.apellidos}`, 40, 120);
  doc.text(`Fecha de nacimiento: ${paciente.fecha_nacimiento}   Edad actual: ${formatearEdad(edad)}`);
  doc.text(`Sexo: ${paciente.sexo === 'M' ? 'Masculino' : 'Femenino'}   CI: ${paciente.carnet_identidad || 'N/A'}`);
  if (tutores.length) {
    doc.text(`Tutor(es): ${tutores.map((t) => `${t.nombres} ${t.apellidos} (${t.parentesco})`).join(' | ')}`);
  }

  doc.image(qrBuffer, doc.page.width - 140, 118, { width: 90, height: 90 });
  doc.fontSize(7).fillColor('#666666').text(`Verificación: ${codigoVerificacion}`, doc.page.width - 140, 210, { width: 90, align: 'center' });
  doc.fillColor('#000000');

  // Historial completo (aplicadas)
  let y = 235;
  doc.fontSize(12).fillColor(AZUL).text('Historial de vacunas aplicadas', 40, y);
  y += 20;
  const aplicadas = detalle.filter((d) => d.estado === 'aplicada');
  if (aplicadas.length === 0) {
    doc.fontSize(9).fillColor('#555').text('Aún no se registran vacunas aplicadas.', 40, y);
    y += 20;
  } else {
    y = dibujarTablaSimple(doc, {
      headers: ['Vacuna', 'Dosis', 'Fecha aplicación', 'Lote'],
      rows: aplicadas.map((d) => [d.vacunaNombre, d.nombreDosis, d.fechaAplicacion, d.lote || '-']),
      startY: y,
      colWidths: [180, 150, 110, 75]
    });
  }

  // Próximas vacunas
  y += 20;
  const pendientesOProximas = detalle.filter((d) => ['proxima', 'pendiente', 'atrasada'].includes(d.estado));
  doc.fontSize(12).fillColor(AZUL).text('Próximas vacunas / pendientes', 40, y);
  y += 20;
  if (pendientesOProximas.length === 0) {
    doc.fontSize(9).fillColor('#555').text('El paciente está al día con su esquema de vacunación.', 40, y);
  } else {
    dibujarTablaSimple(doc, {
      headers: ['Vacuna', 'Dosis', 'Fecha límite', 'Estado'],
      rows: pendientesOProximas.map((d) => [d.vacunaNombre, d.nombreDosis, d.fechaLimite, d.estado.toUpperCase()]),
      startY: y,
      colWidths: [180, 150, 110, 75]
    });
  }

  doc.fontSize(7).fillColor('#888888').text(
    `Documento generado el ${new Date().toLocaleString('es-BO')} por el Sistema de Vacunación Inteligente del Hospital Materno Germán Urquidi.`,
    40, doc.page.height - 40, { width: doc.page.width - 80 }
  );

  return doc; // El controlador se encarga de doc.pipe(res) y doc.end()
}

module.exports = { generarCarnetPDF, generarCodigoVerificacion, CarnetError };
