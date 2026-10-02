const { fechaCivil, sumarEdad } = require('./calendario.util');
// Las reglas de seguimiento son explícitas: nunca se deducen del número de dosis.
function programarDosis(paciente, dosis, historial) {
 let regla=dosis.regla_calendario;
 try { if(typeof regla==='string') regla=JSON.parse(regla); } catch { return {revision:true}; }
 const pauta=regla?.programacion;
 try {
  if(pauta?.base==='campana')return regla.tipo==='campana'&&regla.inicio?{fecha:fechaCivil(regla.inicio)}:{revision:true};
  if(pauta?.base==='ultima_aplicacion'){
   if(!Number.isInteger(pauta.valor)||pauta.valor<1||!['dias','semanas','meses','anios'].includes(pauta.unidad))return {revision:true};
   const anteriores=historial.filter(h=>h.dosis_id===dosis.id&&h.fecha_aplicacion).sort((a,b)=>String(b.fecha_aplicacion).localeCompare(String(a.fecha_aplicacion)));
   if(!anteriores.length)return pauta.sinAntecedente==='contacto'?{contacto:true}:{revision:true};
   return {fecha:sumarEdad(fechaCivil(anteriores[0].fecha_aplicacion),pauta.valor,pauta.unidad),recurrente:true};
  }
  if (!pauta || pauta.base==='nacimiento') return {fecha:sumarEdad(fechaCivil(paciente.fecha_nacimiento),dosis.edad_recomendada_valor ?? dosis.edad_recomendada_dias,dosis.edad_recomendada_unidad ?? 'dias')};
  if(pauta.base==='contacto') return {revision:true};
  if(pauta.base!=='dosis_previa' || !Number.isInteger(pauta.dosisId) || pauta.dosisId<=0 || pauta.dosisId===dosis.id) return {revision:true};
  if(!Number.isInteger(pauta.valor) || pauta.valor<0 || !['dias','semanas','meses','anios'].includes(pauta.unidad)) return {revision:true};
  const anteriores=historial.filter(h=>h.dosis_id===pauta.dosisId);
  if(anteriores.length!==1 || !anteriores[0].fecha_aplicacion) return {revision:true};
  return {fecha:sumarEdad(fechaCivil(anteriores[0].fecha_aplicacion),pauta.valor,pauta.unidad)};
 } catch { return {revision:true}; }
}
module.exports={programarDosis};
