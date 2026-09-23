const { evaluarAlcance }=require('../utils/elegibilidad.util');
const { programarDosis }=require('../utils/programacion.util');
const { fechaCivil, sumarEdad, isoCivil }=require('../utils/calendario.util');
class AplicacionError extends Error {constructor(message){super(message);this.status=422;}}
async function validarAplicacion(db,paciente,dosis,fecha,historial) {
 if(fecha<paciente.fecha_nacimiento)throw new AplicacionError('La aplicación no puede ser anterior al nacimiento');
 let regla=dosis.regla_calendario;
 try{if(typeof regla==='string')regla=JSON.parse(regla);}catch{throw new AplicacionError('La regla requiere revisión');}
 if(regla){
  const referencia=new Date(`${fecha}T12:00:00`);
  if(evaluarAlcance(paciente,dosis,referencia))throw new AplicacionError('La dosis está fuera del alcance o requiere revisión del calendario');
  if(regla.programacion?.base!=='contacto'){
   const programada=programarDosis(paciente,dosis,historial);
   if(programada.revision)throw new AplicacionError('Falta el antecedente necesario para programar esta dosis');
   if(fecha<isoCivil(programada.fecha))throw new AplicacionError('La fecha no cumple la edad o el intervalo configurado');
  }
 }
 if(Number(dosis.intervalo_minimo_dias)>0 && Number(dosis.numero_dosis)>1){
  const [[anterior]]=regla?.programacion?.base==='dosis_previa'
   ?await db.query('SELECT id FROM dosis WHERE id=?',[regla.programacion.dosisId])
   :await db.query('SELECT id FROM dosis WHERE vacuna_id=? AND numero_dosis=?',[dosis.vacuna_id,Number(dosis.numero_dosis)-1]);
  const antecedente=anterior&&historial.find(h=>h.dosis_id===anterior.id);
  if(!antecedente)throw new AplicacionError('Falta registrar la dosis anterior para comprobar el intervalo mínimo');
  const minima=isoCivil(sumarEdad(fechaCivil(antecedente.fecha_aplicacion),Number(dosis.intervalo_minimo_dias),'dias'));
  if(fecha<minima)throw new AplicacionError('La fecha no cumple el intervalo mínimo entre dosis');
 }
}
module.exports={validarAplicacion,AplicacionError};
