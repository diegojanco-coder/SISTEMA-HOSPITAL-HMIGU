export default function Pagination({ page, totalPaginas, onChange }) {
  if (totalPaginas <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="px-3 py-1.5 rounded-md border border-slate-200 text-sm disabled:opacity-40 hover:bg-hospital-celesteClaro"
      >
        Anterior
      </button>
      <span className="text-sm text-slate-600">Página {page} de {totalPaginas}</span>
      <button
        disabled={page >= totalPaginas}
        onClick={() => onChange(page + 1)}
        className="px-3 py-1.5 rounded-md border border-slate-200 text-sm disabled:opacity-40 hover:bg-hospital-celesteClaro"
      >
        Siguiente
      </button>
    </div>
  );
}
