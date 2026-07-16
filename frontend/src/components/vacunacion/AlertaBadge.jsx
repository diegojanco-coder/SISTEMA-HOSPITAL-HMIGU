import Badge from '../ui/Badge.jsx';

const MAPA = {
  verde: { color: 'verde', texto: 'Al día' },
  amarillo: { color: 'amarillo', texto: 'Próxima' },
  rojo: { color: 'rojo', texto: 'Atrasada' },
  aplicada: { color: 'azul', texto: 'Aplicada' },
  proxima: { color: 'amarillo', texto: 'Próxima' },
  pendiente: { color: 'amarillo', texto: 'Pendiente' },
  atrasada: { color: 'rojo', texto: 'Atrasada' },
  futura: { color: 'gris', texto: 'Futura' }
};

/** Semáforo de estado: verde = al día, amarillo = próxima, rojo = atrasada. */
export default function AlertaBadge({ estado }) {
  const info = MAPA[estado] || { color: 'gris', texto: estado };
  return <Badge color={info.color}>{info.texto}</Badge>;
}
