const ESTILOS = {
  verde: 'bg-green-100 text-green-700',
  amarillo: 'bg-amber-100 text-amber-700',
  rojo: 'bg-red-100 text-red-700',
  azul: 'bg-blue-100 text-blue-700',
  gris: 'bg-slate-100 text-slate-600'
};

export default function Badge({ color = 'gris', children }) {
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${ESTILOS[color]}`}>
      {children}
    </span>
  );
}
