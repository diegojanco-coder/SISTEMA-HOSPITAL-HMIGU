export default function Table({ columnas, filas, claveFila = 'id', vacio = 'No hay registros para mostrar.' }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-100">
      <table className="min-w-full text-sm">
        <thead className="bg-hospital-azul text-white">
          <tr>
            {columnas.map((col) => (
              <th key={col.key} className="text-left font-medium px-4 py-3 whitespace-nowrap">{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filas.length === 0 && (
            <tr><td colSpan={columnas.length} className="text-center text-slate-400 py-8">{vacio}</td></tr>
          )}
          {filas.map((fila, idx) => (
            <tr key={fila[claveFila] ?? idx} className="odd:bg-white even:bg-hospital-celesteClaro/40 hover:bg-hospital-celesteClaro">
              {columnas.map((col) => (
                <td key={col.key} className="px-4 py-3 whitespace-nowrap">
                  {col.render ? col.render(fila) : fila[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
