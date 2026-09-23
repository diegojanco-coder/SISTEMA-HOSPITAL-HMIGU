import { useEffect, useRef, useState } from 'react';
import type { HistorialItem, Paciente, Vacuna } from '../../../lib/types';
import { fechaLocal } from '../../../lib/visita';
import { registrarAntecedente } from '../../../services/historial.service';
import { listarVacunas } from '../../../services/vacunas.service';

export default function AntecedenteModal({ paciente, historial, onClose, onSaved }: {
  paciente: Paciente; historial: HistorialItem[]; onClose: () => void; onSaved: () => void;
}) {
  const [vacunas, setVacunas] = useState<Vacuna[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [reintento, setReintento] = useState(0);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const enviando = useRef(false);
  const [form, setForm] = useState({ dosisId: '', fechaAplicacion: '', establecimiento: '', documentoReferencia: '', observaciones: '' });

  useEffect(() => {
    let activo = true;
    setCargando(true); setErrorCarga('');
    listarVacunas().then(datos => { if (activo) setVacunas(datos); })
      .catch(() => { if (activo) setErrorCarga('No se pudo cargar el catálogo de vacunas.'); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [reintento]);

  const registradas = new Set(historial.map(h => h.dosis_id));
  const disponibles = vacunas.filter(v => v.estado === 'activo').map(v => ({
    ...v, dosis: v.dosis.filter(d => d.estado === 'activo' && !registradas.has(d.id)),
  })).filter(v => v.dosis.length > 0);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (enviando.current) return;
    const dosisId = Number(form.dosisId);
    const establecimiento = form.establecimiento.trim();
    const documentoReferencia = form.documentoReferencia.trim();
    if (!disponibles.some(v => v.dosis.some(d => d.id === dosisId))) { setError('Selecciona una dosis disponible.'); return; }
    if (!establecimiento || !documentoReferencia) { setError('Indica el establecimiento y el documento que respalda el antecedente.'); return; }
    if (!form.fechaAplicacion || form.fechaAplicacion < paciente.fecha_nacimiento.slice(0, 10) || form.fechaAplicacion > fechaLocal()) {
      setError('La fecha debe estar entre el nacimiento del paciente y hoy.'); return;
    }
    enviando.current = true; setGuardando(true); setError('');
    try {
      await registrarAntecedente({ pacienteId: paciente.id, dosisId, fechaAplicacion: form.fechaAplicacion, establecimiento, documentoReferencia, observaciones: form.observaciones.trim() });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'No se pudo confirmar el registro. Revisa el historial antes de reintentar.');
      enviando.current = false; setGuardando(false); return;
    }
    onSaved();
  }

  const input = 'block w-full mt-2 rounded-lg border border-border bg-card p-3';
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <section role="dialog" aria-modal="true" aria-labelledby="antecedente-title" className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-card p-6 text-foreground">
      <h3 id="antecedente-title" className="text-xl font-bold">Registrar antecedente externo</h3>
      <p className="mt-2 text-sm">{paciente.nombres} {paciente.apellidos}</p>
      <p className="mt-2 text-sm text-muted-foreground">Registra una vacuna recibida en otro establecimiento y respaldada por un carnet, certificado u otro documento. Se incorporará al historial sin descontar existencias del hospital.</p>
      <form onSubmit={guardar} className="mt-4 space-y-4">
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
        {cargando && <p role="status">Cargando catálogo...</p>}
        {errorCarga && <div role="alert"><p>{errorCarga}</p><button type="button" className="mt-2 underline" onClick={() => setReintento(n => n + 1)}>Reintentar catálogo</button></div>}
        {!cargando && !errorCarga && disponibles.length === 0 && <p role="status">No hay dosis activas pendientes de registrar para este paciente.</p>}
        <fieldset disabled={guardando || cargando || Boolean(errorCarga)} className="space-y-4 disabled:opacity-60">
          <label className="block">Vacuna y dosis<select className={input} required value={form.dosisId} onChange={e => setForm({ ...form, dosisId: e.target.value })}>
            <option value="">Selecciona la vacuna y dosis</option>
            {disponibles.map(v => <optgroup key={v.id} label={v.nombre}>{v.dosis.map(d => <option key={d.id} value={d.id}>{v.nombre} · {d.nombre_dosis}</option>)}</optgroup>)}
          </select></label>
          <label className="block">Fecha de aplicación<input className={input} required type="date" min={paciente.fecha_nacimiento.slice(0, 10)} max={fechaLocal()} value={form.fechaAplicacion} onChange={e => setForm({ ...form, fechaAplicacion: e.target.value })} /></label>
          <label className="block">Establecimiento<input className={input} required maxLength={150} value={form.establecimiento} onChange={e => setForm({ ...form, establecimiento: e.target.value })} /></label>
          <label className="block">Documento de referencia<input className={input} required maxLength={200} aria-describedby="documento-ayuda" value={form.documentoReferencia} onChange={e => setForm({ ...form, documentoReferencia: e.target.value })} /><span id="documento-ayuda" className="mt-1 block text-xs text-muted-foreground">Por ejemplo: número de carnet o certificado y página donde consta la dosis.</span></label>
          <label className="block">Observaciones<textarea className={input} maxLength={255} value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} /></label>
        </fieldset>
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" disabled={guardando} onClick={onClose} className="rounded-lg border border-border px-4 py-3">Cancelar</button>
          <button type="submit" disabled={guardando || cargando || Boolean(errorCarga) || disponibles.length === 0} className="rounded-lg bg-primary px-4 py-3 text-primary-foreground disabled:opacity-50">{guardando ? 'Guardando...' : 'Guardar antecedente'}</button>
        </div>
      </form>
    </section>
  </div>;
}
