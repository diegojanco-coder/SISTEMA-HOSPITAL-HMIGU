/**
 * Sanitización básica de strings de entrada para reforzar la
 * protección contra inyección SQL/HTML, en conjunto con las
 * consultas parametrizadas (mysql2) y express-validator.
 */
function sanitizarTexto(valor) {
  if (typeof valor !== 'string') return valor;
  return valor
    .trim()
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/[<>]/g, '');
}

function sanitizarObjeto(obj) {
  const limpio = {};
  for (const [clave, valor] of Object.entries(obj || {})) {
    limpio[clave] = typeof valor === 'string' ? sanitizarTexto(valor) : valor;
  }
  return limpio;
}

module.exports = { sanitizarTexto, sanitizarObjeto };
