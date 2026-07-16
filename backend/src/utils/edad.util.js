/**
 * Utilidades de cálculo de edad exacta, usadas por el motor
 * inteligente de vacunación.
 */

/**
 * Calcula la edad exacta (años, meses, días) y la edad total en días,
 * a partir de una fecha de nacimiento y una fecha de referencia (hoy por defecto).
 */
function calcularEdadExacta(fechaNacimiento, fechaReferencia = new Date()) {
  const nacimiento = new Date(fechaNacimiento);
  const referencia = new Date(fechaReferencia);

  let anios = referencia.getFullYear() - nacimiento.getFullYear();
  let meses = referencia.getMonth() - nacimiento.getMonth();
  let dias = referencia.getDate() - nacimiento.getDate();

  if (dias < 0) {
    meses -= 1;
    const ultimoDiaMesAnterior = new Date(referencia.getFullYear(), referencia.getMonth(), 0).getDate();
    dias += ultimoDiaMesAnterior;
  }
  if (meses < 0) {
    anios -= 1;
    meses += 12;
  }

  const msPorDia = 1000 * 60 * 60 * 24;
  const edadEnDias = Math.floor((referencia.setHours(0, 0, 0, 0) - nacimiento.setHours(0, 0, 0, 0)) / msPorDia);

  return { anios, meses, dias, edadEnDias: Math.max(edadEnDias, 0) };
}

/**
 * Representación legible: "3 años, 2 meses, 10 días" (omite unidades en cero).
 */
function formatearEdad({ anios, meses, dias }) {
  const partes = [];
  if (anios > 0) partes.push(`${anios} año${anios !== 1 ? 's' : ''}`);
  if (meses > 0) partes.push(`${meses} mes${meses !== 1 ? 'es' : ''}`);
  if (anios === 0 && (dias > 0 || partes.length === 0)) partes.push(`${dias} día${dias !== 1 ? 's' : ''}`);
  return partes.join(', ');
}

module.exports = { calcularEdadExacta, formatearEdad };
