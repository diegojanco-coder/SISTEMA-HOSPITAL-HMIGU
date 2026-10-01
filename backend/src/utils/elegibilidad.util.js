const { fechaCivil, sumarEdad, diferenciaDias } = require('./calendario.util');
// Propiedad opcional: su ausencia conserva el comportamiento de las reglas anteriores.
function validarEdadesPorSexo(rangos) {
 if(rangos===undefined)return true;
 if(!rangos || typeof rangos!=='object' || Array.isArray(rangos))return false;
 const claves=Object.keys(rangos);
 if(!claves.length || claves.some(k=>!['F','M'].includes(k)))return false;
 return claves.every(k=>{
  const r=rangos[k];
  if(!r || typeof r!=='object' || Array.isArray(r) || Object.keys(r).some(c=>!['minMeses','maxMesesExclusivo'].includes(c)))return false;
  return Number.isInteger(r.minMeses) && r.minMeses>=0 && r.minMeses<=1800 &&
   (r.maxMesesExclusivo===null || (Number.isInteger(r.maxMesesExclusivo) && r.maxMesesExclusivo>r.minMeses && r.maxMesesExclusivo<=1800));
 });
}
// Evalúa el alcance de una regla, no determina contraindicaciones clínicas.
function evaluarAlcance(paciente, dosis, referencia = new Date()) {
 const nacimiento = fechaCivil(paciente.fecha_nacimiento), hoy = fechaCivil(referencia);
 const edadDias=diferenciaDias(nacimiento,hoy);
 if(dosis.edad_maxima_dias!=null && edadDias>Number(dosis.edad_maxima_dias))return 'bloqueada_por_edad';
 if(dosis.edad_minima_dias!=null && edadDias<Number(dosis.edad_minima_dias))return 'fuera_alcance';
 let regla = dosis.regla_calendario;
 try { if (typeof regla === 'string') regla = JSON.parse(regla); } catch { return 'revision'; }
 if (regla?.habilitada === false) return 'revision';
 if (!regla) return hoy >= sumarEdad(nacimiento,18,'anios') ? 'revision' : null;
 if (!['regular','campana'].includes(regla.tipo) || !regla.fuente) return 'revision';
 if (!validarEdadesPorSexo(regla.edadesPorSexo)) return 'revision';
 if (regla.edadesPorSexo!==undefined && !['F','M'].includes(paciente.sexo)) return 'revision';
 if (regla.tipo === 'campana') {
  if (!regla.inicio || !regla.fin || !regla.territorio) return 'revision';
  try {
   const inicio=fechaCivil(regla.inicio), fin=fechaCivil(regla.fin);
   if (fin < inicio) return 'revision';
   if (hoy < inicio || hoy > fin) return 'fuera_alcance';
  } catch { return 'revision'; }
  if (regla.territorio !== 'Bolivia') {
   if (!paciente.departamento) return 'revision';
   if (paciente.departamento !== regla.territorio) return 'fuera_alcance';
  }
 }
 if (regla.minMeses == null && regla.maxMesesExclusivo == null) return 'revision';
 for (const valor of [regla.minMeses,regla.maxMesesExclusivo]) {
  if (valor != null && (!Number.isInteger(valor) || valor < 0)) return 'revision';
 }
 if (regla.minMeses != null && regla.maxMesesExclusivo != null && regla.minMeses >= regla.maxMesesExclusivo) return 'revision';
 if (regla.minMeses != null && hoy < sumarEdad(nacimiento,regla.minMeses,'meses')) return 'fuera_alcance';
 // El máximo de la ventana programática marca atraso, no contraindicación.
 // Solo edad_maxima_dias representa un límite estricto de seguridad.
 if (regla.edadesPorSexo!==undefined) {
  const rango=regla.edadesPorSexo[paciente.sexo];
  if (!rango) return 'fuera_alcance';
  if (hoy < sumarEdad(nacimiento,rango.minMeses,'meses')) return 'fuera_alcance';
 }
 return null;
}
module.exports = { evaluarAlcance, validarEdadesPorSexo };
