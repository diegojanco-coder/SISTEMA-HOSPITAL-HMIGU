const { calcularEdadExacta } = require('./edad.util');

function resolverContactoPaciente(paciente, tutores = []) {
  const menor = calcularEdadExacta(paciente.fecha_nacimiento).anios < 18;
  const origen = menor ? 'tutor' : (paciente.contacto_alertas || (paciente.es_dependiente ? 'tutor' : 'paciente'));
  if (origen === 'paciente') return {
    origen, nombre: [paciente.nombres, paciente.apellidos].filter(Boolean).join(' '),
    email: paciente.email || null, telefono: paciente.telefono_contacto || null
  };
  const tutor = tutores.filter(t => t.estado === 'activo')
    .sort((a,b) => Number(b.es_principal) - Number(a.es_principal) || a.id - b.id)[0];
  return { origen, nombre: tutor ? [tutor.nombres, tutor.apellidos].filter(Boolean).join(' ') : null,
    email: tutor?.email || null, telefono: tutor?.telefono || null };
}

module.exports = { resolverContactoPaciente };
