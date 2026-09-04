const CI_REGEX = /^(\d{6,8})(?:-(CB|LP|SC|OR|PT|TJ|BE|PA|CH))?$/;
const CELULAR_REGEX = /^[67]\d{7}$/;
const FIJO_REGEX = /^[234]\d{6,7}$/;
const NOMBRE_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/u;

function esFechaISOValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(valor))) return false;
  const fecha = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

function esCIValida(valor) { return CI_REGEX.test(String(valor)); }
function esTelefonoBoliviano(valor) {
  const texto = String(valor);
  return CELULAR_REGEX.test(texto) || FIJO_REGEX.test(texto);
}

module.exports = {
  CI_REGEX,
  NOMBRE_REGEX,
  esCIValida,
  esTelefonoBoliviano,
  esFechaISOValida,
};