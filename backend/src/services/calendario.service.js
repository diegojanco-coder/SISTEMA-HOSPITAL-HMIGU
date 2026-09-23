const { validarEdadesPorSexo } = require('../utils/elegibilidad.util');
const transaction = require('../utils/transaction.util');
const auditoria = require('../models/auditoria.model');
const { esFechaISOValida } = require('../utils/validation.util');
class CalendarioError extends Error { constructor(message,status=422){super(message);this.status=status;} }
const territorios=['Bolivia','Beni','Chuquisaca','Cochabamba','La Paz','Oruro','Pando','Potosí','Santa Cruz','Tarija'];
const unidades=['dias','semanas','meses','anios'];
function validarRegla(data) {
 const r=data.regla;
 if(!r || typeof r!=='object' || Array.isArray(r))throw new CalendarioError('Regla de calendario inválida');
 if(!['regular','campana'].includes(r.tipo))throw new CalendarioError('Seleccione calendario regular o campaña');
 if(typeof r.fuente!=='string' || r.fuente.length>1000)throw new CalendarioError('Indique la fuente de la regla');
 try { const u=new URL(r.fuente);if(!['https:','http:'].includes(u.protocol))throw new Error(); } catch {throw new CalendarioError('La fuente debe ser una dirección web válida');}
 if(typeof r.habilitada!=='boolean')throw new CalendarioError('Indique si la regla está habilitada');
 if(!Number.isInteger(r.minMeses) || r.minMeses<0 || r.minMeses>1800)throw new CalendarioError('Edad mínima inválida');
 if(r.maxMesesExclusivo!=null && (!Number.isInteger(r.maxMesesExclusivo) || r.maxMesesExclusivo<=r.minMeses || r.maxMesesExclusivo>1800))throw new CalendarioError('La edad máxima debe superar la mínima');
 if(!validarEdadesPorSexo(r.edadesPorSexo))throw new CalendarioError('Defina rangos de edad válidos para al menos un sexo registrado');
 if(r.tipo==='campana' && (!esFechaISOValida(r.inicio) || !esFechaISOValida(r.fin) || r.fin<r.inicio || !territorios.includes(r.territorio)))throw new CalendarioError('La campaña requiere fechas válidas y territorio');
 const p=r.programacion;
 if(!p || !['nacimiento','contacto','dosis_previa'].includes(p.base))throw new CalendarioError('Seleccione el origen de la programación');
 if(p.base==='dosis_previa' && (!Number.isInteger(p.dosisId) || p.dosisId<=0 || !Number.isInteger(p.valor) || p.valor<1 || p.valor>10000 || !unidades.includes(p.unidad)))throw new CalendarioError('Defina la dosis anterior y su intervalo');
 if(p.permitirOtraVacuna!==undefined && typeof p.permitirOtraVacuna!=='boolean')throw new CalendarioError('Indique si el antecedente puede pertenecer a otra vacuna');
 if(!Number.isInteger(data.edadValor) || data.edadValor<0 || data.edadValor>60000 || !unidades.includes(data.edadUnidad))throw new CalendarioError('Edad recomendada inválida');
 if(!Number.isInteger(data.toleranciaDias) || data.toleranciaDias<0 || data.toleranciaDias>3650)throw new CalendarioError('Margen de seguimiento inválido');
 if(!Number.isInteger(data.version) || data.version<0)throw new CalendarioError('Versión de calendario inválida');
 return {tipo:r.tipo,fuente:r.fuente.trim(),habilitada:r.habilitada,minMeses:r.minMeses,maxMesesExclusivo:r.maxMesesExclusivo??null,
 ...(r.edadesPorSexo!==undefined?{edadesPorSexo:Object.fromEntries(Object.entries(r.edadesPorSexo).map(([sexo,rango])=>[sexo,{minMeses:rango.minMeses,maxMesesExclusivo:rango.maxMesesExclusivo}]))}:{}),
 ...(r.tipo==='campana'?{inicio:r.inicio,fin:r.fin,territorio:r.territorio}:{}),
 programacion:p.base==='dosis_previa'?{base:p.base,dosisId:p.dosisId,valor:p.valor,unidad:p.unidad,...(p.permitirOtraVacuna===true?{permitirOtraVacuna:true}:{})}:{base:p.base}};
}
async function guardar(id,data,actor={}) {
 const regla=validarRegla(data);
 return transaction(async db=>{
  // Orden común para serializar ediciones y evitar ciclos concurrentes.
  const [catalogo]=await db.query('SELECT * FROM dosis ORDER BY id FOR UPDATE');
  const actual=catalogo.find(d=>d.id===Number(id));
  if(!actual)throw new CalendarioError('Dosis no encontrada',404);
  const previa=typeof actual.regla_calendario==='string'?JSON.parse(actual.regla_calendario):actual.regla_calendario;
  if((previa?.version||0)!==data.version)throw new CalendarioError('La regla fue modificada. Recargue antes de guardar.',409);
  if(regla.programacion.base==='dosis_previa') {
   let referencia=regla.programacion.dosisId,origen=actual,pauta=regla.programacion;const vistos=new Set([actual.id]);
   while(referencia){
    if(vistos.has(referencia))throw new CalendarioError('Las dosis no pueden formar un ciclo');vistos.add(referencia);
    const anterior=catalogo.find(d=>d.id===referencia);
    if(!anterior || anterior.estado!=='activo' || (anterior.vacuna_id!==origen.vacuna_id && pauta.permitirOtraVacuna!==true))throw new CalendarioError('La dosis anterior debe estar activa y pertenecer a la misma vacuna, salvo selección explícita de otra vacuna');
    const a=typeof anterior.regla_calendario==='string'?JSON.parse(anterior.regla_calendario):anterior.regla_calendario;
    origen=anterior;pauta=a?.programacion;
    referencia=pauta?.base==='dosis_previa'?pauta.dosisId:null;
   }
  }
  regla.version=data.version+1;
  await db.query('UPDATE dosis SET regla_calendario=?,edad_recomendada_valor=?,edad_recomendada_unidad=?,tolerancia_dias=? WHERE id=?',[JSON.stringify(regla),data.edadValor,data.edadUnidad,data.toleranciaDias,id]);
  const [[nuevo]]=await db.query('SELECT * FROM dosis WHERE id=?',[id]);
  await auditoria.create({usuarioId:actor.usuarioId||null,accion:'EDITAR',entidad:'calendario',entidadId:id,datosPrevios:actual,datosNuevos:nuevo,ip:actor.ip,userAgent:actor.userAgent},db);
  return nuevo;
 });
}
module.exports={guardar,validarRegla,CalendarioError};

