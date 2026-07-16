import { useEffect, useState } from 'react';
import { Search, Syringe, History as HistoryIcon } from 'lucide-react';
import { listarPacientes, obtenerEsquemaPaciente } from '../../../services/pacientes.service';
import { listarHistorialPorPaciente } from '../../../services/historial.service';
import type { EsquemaPaciente, HistorialItem, Paciente } from '../../../lib/types';
import StatusBadge from '../shared/StatusBadge';

const fontBody = { fontFamily: 'Plus Jakarta Sans, sans-serif' };
const fontHeading = { fontFamily: 'Outfit, sans-serif' };

export default function Historial() {
  const [busqueda, setBusqueda] = useState('');
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [seleccionado, setSeleccionado] = useState<Paciente | null>(null);
  const [esquema, setEsquema] = useState<EsquemaPaciente | null>(null);
  const [historial, setHistorial] = useState<HistorialItem[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [cargandoFicha, setCargandoFicha] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      setCargandoLista(true);
      try {
        const data = await listarPacientes({ page: 1, limit: 20, q: busqueda });
        setPacientes(data.rows);
      } finally { setCargandoLista(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  async function seleccionar(p: Paciente) {
    setSeleccionado(p);
    setCargandoFicha(true);
    try {
      const [esq, hist] = await Promise.all([obtenerEsquemaPaciente(p.id), listarHistorialPorPaciente(p.id)]);
      setEsquema(esq);
      setHistorial(hist);
    } finally { setCargandoFicha(false); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-900" style={fontHeading}>Historial de Vacunación</h3>
        <p className="text-gray-600" style={fontBody}>Busca un paciente para ver su historial completo y esquema PAI.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden lg:col-span-1">
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar paciente..." className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none" style={fontBody} />
            </div>
          </div>
          <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-100">
            {cargandoLista && <p className="p-4 text-sm text-gray-400">Cargando...</p>}
            {!cargandoLista && pacientes.length === 0 && <p className="p-4 text-sm text-gray-400">Sin resultados.</p>}
            {pacientes.map((p) => (
              <button key={p.id} onClick={() => seleccionar(p)} className={`w-full text-left p-4 hover:bg-cyan-50 transition-colors ${seleccionado?.id === p.id ? 'bg-cyan-50' : ''}`}>
                <p className="font-semibold text-gray-900" style={fontBody}>{p.nombres} {p.apellidos}</p>
                <p className="text-sm text-gray-500" style={fontBody}>{p.codigo_paciente} • {p.edad_formateada}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {!seleccionado && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              <HistoryIcon className="w-10 h-10 mx-auto mb-3" />
              Selecciona un paciente de la lista para ver su historial.
            </div>
          )}

          {seleccionado && cargandoFicha && <p className="text-gray-400 text-sm">Cargando ficha...</p>}

          {seleccionado && !cargandoFicha && esquema && (
            <>
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-bold text-gray-900" style={fontHeading}>{seleccionado.nombres} {seleccionado.apellidos}</h4>
                    <p className="text-sm text-gray-500" style={fontBody}>{seleccionado.codigo_paciente} • {seleccionado.edad_formateada}</p>
                  </div>
                  <StatusBadge estado={esquema.estadoGeneral} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-green-600" style={fontHeading}>{esquema.resumen.aplicadas}</p>
                    <p className="text-xs text-gray-600" style={fontBody}>Aplicadas</p>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-yellow-600" style={fontHeading}>{esquema.resumen.proximas + esquema.resumen.pendientes}</p>
                    <p className="text-xs text-gray-600" style={fontBody}>Próximas/Pendientes</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-red-600" style={fontHeading}>{esquema.resumen.atrasadas}</p>
                    <p className="text-xs text-gray-600" style={fontBody}>Atrasadas</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h5 className="font-bold text-gray-900 mb-3" style={fontBody}>Historial de Aplicaciones</h5>
                <div className="space-y-3">
                  {historial.length === 0 && <p className="text-sm text-gray-400">Aún no hay vacunas aplicadas.</p>}
                  {historial.map((h) => (
                    <div key={h.id} className="flex items-start gap-4 p-4 rounded-lg border border-gray-200">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                        <Syringe className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900" style={fontBody}>{h.vacuna_nombre} - {h.nombre_dosis}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-600" style={fontBody}>
                          <span>{h.fecha_aplicacion}</span><span>•</span><span>Lote: {h.lote || '-'}</span><span>•</span><span>{h.aplicado_por || '-'}</span>
                          {h.observaciones && <><span>•</span><span>{h.observaciones}</span></>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h5 className="font-bold text-gray-900 mb-3" style={fontBody}>Esquema Completo (PAI Bolivia)</h5>
                <div className="space-y-2">
                  {esquema.detalle.map((d) => (
                    <div key={d.dosisId} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm" style={fontBody}>{d.vacunaNombre} - {d.nombreDosis}</p>
                        <p className="text-xs text-gray-500" style={fontBody}>{d.estado === 'aplicada' ? `Aplicada: ${d.fechaAplicacion}` : `Límite: ${d.fechaLimite}`}</p>
                      </div>
                      <StatusBadge estado={d.estado} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
