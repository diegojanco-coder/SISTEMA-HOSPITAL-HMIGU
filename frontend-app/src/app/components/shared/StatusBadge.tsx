// Insignia de semáforo reutilizada en Pacientes, Alertas, Historial y Carnet.
// verde = al día, amarillo = próxima/pendiente, rojo = atrasada.
const ESTILOS: Record<string, string> = {
  verde: 'bg-green-100 text-green-700',
  'al-dia': 'bg-green-100 text-green-700',
  aplicada: 'bg-green-100 text-green-700',
  amarillo: 'bg-yellow-100 text-yellow-700',
  proxima: 'bg-yellow-100 text-yellow-700',
  pendiente: 'bg-yellow-100 text-yellow-700',
  rojo: 'bg-red-100 text-red-700',
  atrasada: 'bg-red-100 text-red-700',
  futura: 'bg-gray-100 text-gray-600',
};

const ETIQUETAS: Record<string, string> = {
  verde: 'Al día',
  'al-dia': 'Al día',
  aplicada: 'Aplicada',
  amarillo: 'Próxima',
  proxima: 'Próxima',
  pendiente: 'Pendiente',
  rojo: 'Atrasada',
  atrasada: 'Atrasada',
  futura: 'Futura',
};

export default function StatusBadge({ estado }: { estado: string }) {
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${ESTILOS[estado] || 'bg-gray-100 text-gray-600'}`}
      style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
    >
      {ETIQUETAS[estado] || estado}
    </span>
  );
}
