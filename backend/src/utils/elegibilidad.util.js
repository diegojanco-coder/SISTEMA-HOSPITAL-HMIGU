const { fechaCivil, sumarEdad } = require('./calendario.util');
// Evalúa el alcance de una regla, no determina contraindicaciones clínicas.
function evaluarAlcance(paciente, dosis, referencia = new Date()) {
 const nacimiento = fechaCivil(paciente.fecha_nacimiento), hoy = fechaCivil(referencia);
 let regla = dosis.regla_calendario;
 try { if (typeof regla === 'string') regla = JSON.parse(regla); } catch { return 'revision'; }
 if (regla?.habilitada === false) return 'revision';
 if (!regla) return hoy >= sumarEdad(nacimiento,18,'anios') ? 'revision' : null;
 if (!['regular','campana'].includes(regla.tipo) || !regla.fuente) return 'revision';
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
 if (regla.maxMesesExclusivo != null && hoy >= sumarEdad(nacimiento,regla.maxMesesExclusivo,'meses')) return 'fuera_alcance';
 return null;
}
module.exports = { evaluarAlcance };
