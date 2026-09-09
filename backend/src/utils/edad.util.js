/**
 * Utilidades de cálculo de edad exacta, usadas por el motor
 * inteligente de vacunación.
 */

/**
 * Calcula la edad exacta (años, meses, días) y la edad total en días,
 * a partir de una fecha de nacimiento y una fecha de referencia (hoy por defecto).
 */
function calcularEdadExacta(fechaNacimiento, fechaReferencia = new Date()) {
  const {fechaCivil,sumarEdad,diferenciaDias}=require('./calendario.util');
  const nacimiento=fechaCivil(fechaNacimiento), referencia=fechaCivil(fechaReferencia);
  if(referencia<nacimiento)return {anios:0,meses:0,dias:0,edadEnDias:0};
  let totalMeses=(referencia.getUTCFullYear()-nacimiento.getUTCFullYear())*12+referencia.getUTCMonth()-nacimiento.getUTCMonth();
  let aniversario=sumarEdad(nacimiento,totalMeses,'meses');
  if(aniversario>referencia){totalMeses--;aniversario=sumarEdad(nacimiento,totalMeses,'meses');}
  return {anios:Math.floor(totalMeses/12),meses:totalMeses%12,dias:diferenciaDias(aniversario,referencia),edadEnDias:diferenciaDias(nacimiento,referencia)};
}

/**
 * Representación legible: "3 años, 2 meses, 10 días" (omite unidades en cero).
 */
function calcularEdadMeses(fechaNacimiento, fechaReferencia = new Date()) {
  const edad = calcularEdadExacta(fechaNacimiento, fechaReferencia);
  return (edad.anios * 12) + edad.meses;
}

function formatearEdad({ anios, meses, dias }) {
  const partes = [];
  if (anios > 0) partes.push(`${anios} año${anios !== 1 ? 's' : ''}`);
  if (meses > 0) partes.push(`${meses} mes${meses !== 1 ? 'es' : ''}`);
  if (anios === 0 && (dias > 0 || partes.length === 0)) partes.push(`${dias} día${dias !== 1 ? 's' : ''}`);
  return partes.join(', ');
}

module.exports = { calcularEdadExacta, calcularEdadMeses, formatearEdad };
