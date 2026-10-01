import { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { EsquemaPaciente, Paciente } from '../../../lib/types';
import { datosVisita, fechaLocal, validarVisita, type DosisEnVisita } from '../../../lib/visita';
import { obtenerEsquemaPaciente } from '../../../services/pacientes.service';
import { listarLotesDisponibles, type LoteDisponible } from '../../../services/lotes.service';
import { registrarVisita } from '../../../services/historial.service';

const inputClass = 'w-full px-4 py-3 rounded-lg border border-border bg-card text-foreground focus:ring-2 focus:ring-primary outline-none';
export default function AddVaccineModal({ paciente, aplicadoPor, onClose, onSaved }: {
  paciente: Paciente; aplicadoPor: string; onClose: () => void; onSaved: () => void;
}) {
  const [esquema, setEsquema] = useState<EsquemaPaciente | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [reintento, setReintento] = useState(0);
  const [dosisId, setDosisId] = useState('');
  const [loteId, setLoteId] = useState('');
  const [lotes, setLotes] = useState<LoteDisponible[]>([]);
  const [cargandoLotes, setCargandoLotes] = useState(false);
  const [errorLotes, setErrorLotes] = useState('');
  const [seleccionadas, setSeleccionadas] = useState<DosisEnVisita[]>([]);
  const [fecha, setFecha] = useState(fechaLocal);
  const [observaciones, setObservaciones] = useState('');
  const [revisando, setRevisando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const enviando = useRef(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let activo = true;
    setCargando(true); setErrorCarga('');
    obtenerEsquemaPaciente(paciente.id).then(data => { if (activo) setEsquema(data); })
      .catch(() => { if (activo) setErrorCarga('No se pudo cargar el esquema del paciente.'); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [paciente.id, reintento]);
  const disponibles = esquema?.dosisDisponibles ?? esquema?.detalle.filter(d => d.estado !== 'aplicada') ?? [];
  const opciones = disponibles.filter(d => ['proxima', 'pendiente', 'atrasada', 'bloqueada_por_edad'].includes(d.estado) || d.registrable);
  const bloqueadas = opciones.filter(d => d.estado === 'bloqueada_por_edad');
  const dosis = opciones.find(d => String(d.dosisId) === dosisId);
  useEffect(() => {
    let activo = true;
    setLoteId(''); setLotes([]); setErrorLotes('');
    if (!dosis) { setCargandoLotes(false); return () => { activo = false; }; }
    setCargandoLotes(true);
    listarLotesDisponibles(dosis.vacunaId).then(data => { if (activo) setLotes(data); })
      .catch(() => { if (activo) setErrorLotes('No se pudieron cargar los lotes. Vuelve a seleccionar la dosis para reintentar.'); })
      .finally(() => { if (activo) setCargandoLotes(false); });
    return () => { activo = false; };
  }, [dosis?.dosisId, dosis?.vacunaId]);
  function agregar() {
    const lote = lotes.find(l => String(l.id) === loteId);
    if (!dosis || !lote || cargandoLotes) { setError('Selecciona una dosis y un lote disponible'); return; }
    const nuevas = [...seleccionadas, { dosisId: dosis.dosisId, vacunaNombre: dosis.vacunaNombre, nombreDosis: dosis.nombreDosis, loteVacunaId: lote.id, numeroLote: lote.numero_lote, stock: lote.cantidad_disponible }];
    const problema = validarVisita(nuevas, fecha, paciente.fecha_nacimiento);
    if (problema) { setError(problema); return; }
    setSeleccionadas(nuevas); setDosisId(''); setLoteId(''); setError('');
  }
  function revisar(e: React.FormEvent) {
    e.preventDefault();
    const problema = validarVisita(seleccionadas, fecha, paciente.fecha_nacimiento);
    if (problema || dosisId) { setError(problema || 'Añade la dosis seleccionada a la lista o limpia la selección'); return; }
    setError(''); setRevisando(true);
  }
  async function guardar() {
    if (enviando.current) return;
    const problema = validarVisita(seleccionadas, fecha, paciente.fecha_nacimiento);
    if (problema) { setError(problema); return; }
    enviando.current = true; setGuardando(true); setError('');
    try {
      await registrarVisita(datosVisita(paciente.id, fecha, observaciones, seleccionadas));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'No se pudo confirmar el guardado. Consulta el historial antes de volver a registrar la visita.');
      enviando.current = false; setGuardando(false); return;
    }
    onSaved();
  }
  return <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <section role="dialog" aria-modal="true" aria-labelledby="visita-title" className="bg-card text-foreground rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
      <header className="sticky top-0 z-10 bg-primary text-primary-foreground px-6 py-4 flex items-center justify-between rounded-t-2xl">
        <div><h3 id="visita-title" className="text-xl font-bold">{revisando ? 'Revisar visita' : 'Registrar vacunación'}</h3><p className="text-sm">{paciente.nombres} {paciente.apellidos} · {paciente.codigo_paciente}</p></div>
        <button type="button" disabled={guardando} onClick={onClose} aria-label="Cerrar registro de vacunación" className="p-2 rounded-lg hover:bg-white/20 disabled:opacity-50"><X /></button>
      </header>
      <form onSubmit={revisar} className="p-6 space-y-5">
        {error && <p role="alert" className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">{error}</p>}
        {errorCarga && <div role="alert"><p>{errorCarga}</p><button type="button" onClick={() => setReintento(n => n + 1)} className="underline">Reintentar carga</button></div>}
        {!revisando && <>
          <label className="block text-sm font-semibold">Fecha de aplicación
            <input type="date" required min={paciente.fecha_nacimiento.slice(0, 10)} max={fechaLocal()} value={fecha} onChange={e => setFecha(e.target.value)} className={`${inputClass} mt-2`} />
          </label>
          <div className="rounded-xl border border-border p-4 space-y-4">
            <label className="block text-sm font-semibold">Dosis
              <select aria-label="Dosis" value={dosisId} onChange={e => { setDosisId(e.target.value); setLoteId(''); setLotes([]); setError(''); }} disabled={cargando || Boolean(errorCarga)} className={`${inputClass} mt-2`}>
                <option value="">{cargando ? 'Cargando dosis...' : 'Seleccionar dosis...'}</option>
                {opciones.map(d => <option key={d.dosisId} value={d.dosisId} disabled={d.estado === 'bloqueada_por_edad' || seleccionadas.some(s => s.dosisId === d.dosisId)}>{d.vacunaNombre} · {d.nombreDosis}{d.registrable ? ' (al contacto)' : ''}{d.estado === 'bloqueada_por_edad' ? ' (bloqueada por edad)' : ''}{seleccionadas.some(s => s.dosisId === d.dosisId) ? ' (añadida)' : ''}</option>)}
              </select>
            </label>
            {dosis?.estado === 'atrasada' && <p role="status" className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">Paciente con retraso de {dosis.diasRetraso ?? 0} días; se permite continuar el esquema.</p>}
            {bloqueadas.map(d => <p key={d.dosisId} role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800"><strong>{d.vacunaNombre} · {d.nombreDosis}:</strong> No elegible: supera la edad límite permitida.</p>)}
            {!cargando && !errorCarga && !opciones.length && <p className="text-sm text-muted-foreground">No hay dosis disponibles para registrar en el esquema actual.</p>}
            <label className="block text-sm font-semibold">Lote
              <select aria-label="Lote" value={loteId} onChange={e => setLoteId(e.target.value)} disabled={!dosis || cargandoLotes} className={`${inputClass} mt-2`}>
                <option value="">{cargandoLotes ? 'Cargando lotes...' : 'Seleccionar lote...'}</option>
                {lotes.map(l => { const disponibles = l.cantidad_disponible - seleccionadas.filter(s => s.loteVacunaId === l.id).length; return <option key={l.id} value={l.id} disabled={disponibles < 1}>{l.numero_lote} · vence {l.fecha_vencimiento.slice(0, 10)} · {disponibles} disponibles</option>; })}
              </select>
            </label>
            {errorLotes && <p role="alert" className="text-sm text-red-600">{errorLotes}</p>}
            {dosis && !cargandoLotes && !errorLotes && !lotes.length && <p className="text-sm text-muted-foreground">No hay lotes con existencias para esta vacuna.</p>}
            <button type="button" disabled={!dosis || !loteId || cargandoLotes} onClick={agregar} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50"><Plus size={18} /> Añadir dosis a la visita</button>
          </div>
        </>}
        <div className="space-y-3">
          <h4 className="font-semibold">Dosis de esta visita ({seleccionadas.length})</h4>
          {!seleccionadas.length && <p className="text-sm text-muted-foreground">Añade las dosis aplicadas durante esta atención.</p>}
          {seleccionadas.map(d => <div key={d.dosisId} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"><div><p className="font-medium">{d.vacunaNombre} · {d.nombreDosis}</p><p className="text-sm text-muted-foreground">Lote {d.numeroLote}</p></div>{!revisando && <button type="button" aria-label={`Quitar ${d.vacunaNombre} ${d.nombreDosis}`} onClick={() => { setSeleccionadas(rows => rows.filter(r => r.dosisId !== d.dosisId)); setError(''); }} className="p-2 rounded-lg hover:bg-muted"><X size={18} /></button>}</div>)}
        </div>
        {revisando ? <div className="rounded-lg bg-muted p-4 space-y-2 text-sm"><p><strong>Fecha:</strong> {fecha}</p><p><strong>Profesional:</strong> {aplicadoPor}</p>{observaciones && <p><strong>Observaciones:</strong> {observaciones}</p>}<p>Se registrarán todas las dosis de esta lista en una misma visita.</p></div> : <><label className="block text-sm font-semibold">Observaciones de la visita<textarea maxLength={255} value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={3} className={`${inputClass} mt-2`} /></label><p className="text-sm text-muted-foreground">Profesional: {aplicadoPor}</p></>}
        <footer className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
          <button type="button" disabled={guardando} onClick={revisando ? () => { setRevisando(false); setError(''); } : onClose} className="px-4 py-3 border border-border rounded-lg disabled:opacity-50">{revisando ? 'Volver a editar' : 'Cancelar'}</button>
          {revisando ? <button type="button" disabled={guardando} onClick={guardar} className="px-4 py-3 bg-primary text-primary-foreground rounded-lg disabled:opacity-50">{guardando ? 'Guardando...' : `Confirmar ${seleccionadas.length} dosis`}</button> : <button type="submit" disabled={!seleccionadas.length || cargando || Boolean(errorCarga)} className="px-4 py-3 bg-primary text-primary-foreground rounded-lg disabled:opacity-50">Revisar visita</button>}
        </footer>
      </form>
    </section>
  </div>;
}
