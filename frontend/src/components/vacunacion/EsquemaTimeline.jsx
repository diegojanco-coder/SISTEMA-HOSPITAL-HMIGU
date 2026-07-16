import AlertaBadge from './AlertaBadge.jsx';

/** Línea de tiempo del esquema PAI de un paciente, agrupada por vacuna. */
export default function EsquemaTimeline({ detalle }) {
  const porVacuna = detalle.reduce((acc, item) => {
    (acc[item.vacunaNombre] ||= []).push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {Object.entries(porVacuna).map(([vacuna, dosisList]) => (
        <div key={vacuna}>
          <h4 className="font-medium text-hospital-azulOscuro mb-2">{vacuna}</h4>
          <div className="flex flex-wrap gap-2">
            {dosisList.map((d) => (
              <div key={d.dosisId} className="border border-slate-200 rounded-lg px-3 py-2 min-w-[150px]">
                <p className="text-xs text-slate-500">{d.nombreDosis}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-slate-600">
                    {d.estado === 'aplicada' ? d.fechaAplicacion : `Límite: ${d.fechaLimite}`}
                  </span>
                  <AlertaBadge estado={d.estado} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
