const QRCode = require('qrcode');

/**
 * Genera un código QR (buffer PNG) con la URL/código de verificación
 * del carnet digital de un paciente.
 */
async function generarQRBuffer(texto) {
  return QRCode.toBuffer(texto, {
    errorCorrectionLevel: 'M',
    type: 'png',
    margin: 1,
    width: 200
  });
}

module.exports = { generarQRBuffer };
