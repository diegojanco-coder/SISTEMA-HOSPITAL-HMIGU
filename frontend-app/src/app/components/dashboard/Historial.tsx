import { useEffect, useRef, useState } from 'react';
import { Search, Syringe, History as HistoryIcon } from 'lucide-react';
import { listarPacientes, obtenerEsquemaPaciente } from '../../../services/pacientes.service';
import { listarHistorialPorPaciente, corregirAplicacion } from '../../../services/historial.service';
import type { EsquemaPaciente, HistorialItem, Paciente } from '../../../lib/types';
import { useAuth } from '../../../lib/auth-context';
import { fechaLocal } from '../../../lib/visita';
import StatusBadge from '../shared/StatusBadge';

const fontBody = { fontFamily: 'Plus Jakarta Sans, sans-serif' };
const fontHeading = { fontFamily: 'Outfit, sans-serif' };

export default function Historial() {
  const { esAdmin } = useAuth();
  const [editando, setEditando] = useState<HistorialItem | null>(null);
  const [error, setError] = useState('');
  const solicitud = useRef(0);
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
      } catch { setError('No se pudo cargar la lista de pacientes'); } finally { setCargandoLista(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  async function seleccionar(p: Paciente) {
    const actual = ++solicitud.current;
    setError('');
    setSeleccionado(p);
    setCargandoFicha(true);
    try {
      const [esq, hist] = await Promise.all([obtenerEsquemaPaciente(p.id), listarHistorialPorPaciente(p.id)]);
      if (solicitud.current === actual) { setEsquema(esq); setHistorial(hist); }
    } catch { if (solicitud.current === actual) setError('No se pudo cargar el historial. Selecciona el paciente para reintentar.'); } finally { if (solicitud.current === actual) setCargandoFicha(false); }
  }

  return (
    <div className="space-y-6">
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
      {editando && seleccionado && <CorreccionModal registro={editando} paciente={seleccionado} onClose={() => setEditando(null)} onSaved={() => { setEditando(null); seleccionar(seleccionado); }} />}
      <div>
        <h3 className="text-2xl font-bold text-foreground" style={fontHeading}>Historial de Vacunación</h3>
        <p className="text-muted-foreground" style={fontBody}>Busca un paciente para ver su historial completo y esquema PAI.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card rounded-xl border border-border overflow-hidden lg:col-span-1">
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="w-5 h-5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar paciente..." className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none" style={fontBody} />
            </div>
          </div>
          <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-100">
            {cargandoLista && <p className="p-4 text-sm text-muted-foreground">Cargando...</p>}
            {!cargandoLista && pacientes.length === 0 && <p className="p-4 text-sm text-muted-foreground">Sin resultados.</p>}
            {pacientes.map((p) => (
              <button key={p.id} onClick={() => seleccionar(p)} className={`w-full text-left p-4 hover:bg-cyan-50 transition-colors ${seleccionado?.id === p.id ? 'bg-cyan-50' : ''}`}>
                <p className="font-semibold text-foreground" style={fontBody}>{p.nombres} {p.apellidos}</p>
                <p className="text-sm text-muted-foreground" style={fontBody}>{p.codigo_paciente} • {p.edad_formateada}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {!seleccionado && (
            <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
              <HistoryIcon className="w-10 h-10 mx-auto mb-3" />
              Selecciona un paciente de la lista para ver su historial.
            </div>
          )}

          {seleccionado && cargandoFicha && <p className="text-muted-foreground text-sm">Cargando ficha...</p>}

          {seleccionado && !cargandoFicha && !error && esquema && (
            <>
              <div className="bg-card rounded-xl p-6 border border-border">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-bold text-foreground" style={fontHeading}>{seleccionado.nombres} {seleccionado.apellidos}</h4>
                    <p className="text-sm text-muted-foreground" style={fontBody}>{seleccionado.codigo_paciente} • {seleccionado.edad_formateada}</p>
                  </div>
                  <StatusBadge estado={esquema.estadoGeneral} />
                </div>
                {esquema.advertencia && <p role="status" className="mb-4 rounded-lg border border-border bg-muted p-3 text-sm text-foreground">{esquema.advertencia}</p>}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-green-600" style={fontHeading}>{esquema.resumen.aplicadas}</p>
                    <p className="text-xs text-muted-foreground" style={fontBody}>Aplicadas</p>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-yellow-600" style={fontHeading}>{esquema.resumen.proximas + esquema.resumen.pendientes}</p>
                    <p className="text-xs text-muted-foreground" style={fontBody}>Próximas/Pendientes</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-red-600" style={fontHeading}>{esquema.resumen.atrasadas}</p>
                    <p className="text-xs text-muted-foreground" style={fontBody}>Atrasadas</p>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-xl p-6 border border-border">
                <h5 className="font-bold text-foreground mb-3" style={fontBody}>Historial de Aplicaciones</h5>
                <div className="space-y-3">
                  {historial.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay vacunas aplicadas.</p>}
                  {historial.map((h) => (
                    <div key={h.id} className="flex items-start gap-4 p-4 rounded-lg border border-border">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                        <Syringe className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        {esAdmin && <button type="button" onClick={() => setEditando(h)} className="float-right rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">Corregir registro</button>}
                        <p className="font-bold text-foreground" style={fontBody}>{h.vacuna_nombre} - {h.nombre_dosis}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground" style={fontBody}>
                          <span>{h.fecha_aplicacion}</span><span>•</span><span>Lote: {h.lote || '-'}</span><span>•</span><span>{h.aplicado_por || '-'}</span>
                          {h.observaciones && <><span>•</span><span>{h.observaciones}</span></>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card rounded-xl p-6 border border-border">
                <h5 className="font-bold text-foreground mb-3" style={fontBody}>Esquema Completo (PAI Bolivia)</h5>
                <div className="space-y-2">
                  {esquema.detalle.map((d) => (
                    <div key={d.dosisId} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div>
                        <p className="font-semibold text-foreground text-sm" style={fontBody}>{d.vacunaNombre} - {d.nombreDosis}</p>
                        <p className="text-xs text-muted-foreground" style={fontBody}>{d.estado === 'aplicada' ? `Aplicada: ${d.fechaAplicacion}` : (d.fechaLimite ? `Límite: ${d.fechaLimite}` : 'Fecha pendiente de evaluación')}</p>
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

function CorreccionModal({ registro, paciente, onClose, onSaved }: { registro: HistorialItem; paciente: Paciente; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ fechaAplicacion: registro.fecha_aplicacion.slice(0, 10), establecimiento: registro.establecimiento || '', observaciones: registro.observaciones || '' });
  const [guardando, setGuardando] = useState(false);
  const enviando = useRef(false);
  const [error, setError] = useState('');
  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (enviando.current) return;
    enviando.current = true; setGuardando(true); setError('');
    try { await corregirAplicacion(registro.id, form); }
    catch (err: any) { setError(err?.response?.data?.message || 'No se pudo confirmar la corrección. Revisa el historial antes de reintentar.'); enviando.current = false; setGuardando(false); return; }
    onSaved();
  }
  const input = 'block w-full mt-2 rounded-lg border border-border bg-card p-3';
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <section role="dialog" aria-modal="true" aria-labelledby="corregir-title" className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-card p-6 text-foreground">
      <h3 id="corregir-title" className="text-xl font-bold">Corregir registro de vacunación</h3>
      <p className="mt-2 text-sm">{paciente.nombres} {paciente.apellidos} · {registro.vacuna_nombre} · {registro.nombre_dosis}</p>
      <p className="mt-2 text-sm text-muted-foreground">La corrección quedará registrada en la auditoría.</p>
      <form onSubmit={guardar} className="mt-4 space-y-4">
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
        <label className="block">Fecha de aplicación<input className={input} required type="date" min={paciente.fecha_nacimiento.slice(0, 10)} max={fechaLocal()} value={form.fechaAplicacion} onChange={e => setForm({ ...form, fechaAplicacion: e.target.value })} /></label>
        <label className="block">Establecimiento<input className={input} required maxLength={150} value={form.establecimiento} onChange={e => setForm({ ...form, establecimiento: e.target.value })} /></label>
        <label className="block">Observaciones<textarea className={input} maxLength={255} value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} /></label>
        <div className="flex justify-end gap-3"><button type="button" disabled={guardando} onClick={onClose} className="rounded-lg border border-border px-4 py-3">Cancelar</button><button type="submit" disabled={guardando} className="rounded-lg bg-primary px-4 py-3 text-primary-foreground disabled:opacity-50">{guardando ? 'Guardando...' : 'Guardar corrección'}</button></div>
      </form>
    </section>
  </div>;
}
