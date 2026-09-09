// Fechas civiles: UTC se usa solo para aritmética, sin convertir la fecha local.
function fechaCivil(valor) {
  const texto = typeof valor === 'string' ? valor.slice(0, 10) :
    `${valor.getFullYear()}-${String(valor.getMonth()+1).padStart(2,'0')}-${String(valor.getDate()).padStart(2,'0')}`;
  const fecha = new Date(`${texto}T00:00:00Z`);
  if (!Number.isFinite(fecha.getTime()) || fecha.toISOString().slice(0,10) !== texto) throw new Error('Fecha de calendario inválida');
  return fecha;
}
function sumarEdad(fecha, valor, unidad) {
  valor = Number(valor);
  if (!Number.isInteger(valor) || valor < 0) throw new Error('Edad de calendario inválida');
  const resultado = new Date(fecha);
  if (unidad === 'dias' || unidad === 'semanas') resultado.setUTCDate(resultado.getUTCDate() + valor * (unidad === 'semanas' ? 7 : 1));
  else if (unidad === 'meses' || unidad === 'anios') {
    const dia = resultado.getUTCDate();
    resultado.setUTCDate(1);
    resultado.setUTCMonth(resultado.getUTCMonth() + valor * (unidad === 'anios' ? 12 : 1));
    const ultimo = new Date(Date.UTC(resultado.getUTCFullYear(), resultado.getUTCMonth()+1, 0)).getUTCDate();
    resultado.setUTCDate(Math.min(dia, ultimo));
  } else throw new Error('Unidad de calendario inválida');
  return resultado;
}
const isoCivil = fecha => fecha.toISOString().slice(0,10);
const diferenciaDias = (desde, hasta) => (hasta - desde) / 86400000;
module.exports = { fechaCivil, sumarEdad, isoCivil, diferenciaDias };
