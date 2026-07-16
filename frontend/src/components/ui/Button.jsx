const VARIANTES = {
  primario: 'bg-hospital-azul hover:bg-hospital-azulOscuro text-white',
  secundario: 'bg-white hover:bg-hospital-celesteClaro text-hospital-azul border border-hospital-azul',
  peligro: 'bg-hospital-rojo hover:bg-red-700 text-white',
  fantasma: 'bg-transparent hover:bg-hospital-celesteClaro text-hospital-azul'
};

export default function Button({ children, variante = 'primario', className = '', ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
        transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTES[variante]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
