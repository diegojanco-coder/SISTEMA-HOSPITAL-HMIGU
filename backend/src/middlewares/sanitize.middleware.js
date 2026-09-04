const CAMPOS_SENSIBLES = new Set(['password', 'confirmar', 'confirmarPassword']);

function limpiar(valor, clave = '') {
  if (typeof valor === 'string') return CAMPOS_SENSIBLES.has(clave) ? valor : valor.trim().replace(/\s{2,}/g, ' ');
  if (Array.isArray(valor)) return valor.map((item) => limpiar(item));
  if (valor && typeof valor === 'object') {
    for (const [key, item] of Object.entries(valor)) valor[key] = limpiar(item, key);
  }
  return valor;
}

function sanitizarEntrada(req, res, next) {
  if (req.body) limpiar(req.body);
  if (req.query) limpiar(req.query);
  next();
}

module.exports = sanitizarEntrada;
