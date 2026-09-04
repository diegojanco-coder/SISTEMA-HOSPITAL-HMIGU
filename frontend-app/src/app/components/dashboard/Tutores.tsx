import { useCallback, useEffect, useState } from 'react';
import { Plus, Search, X, UserSquare2 } from 'lucide-react';
import { errorCI, errorEmail, errorLongitud, errorNombre, errorTelefono, LIMITES_TEXTO, normalizarEspacios, validateForm } from '../../../lib/validaciones';
import { listarTutores, crearTutor, actualizarTutor, eliminarTutor, type DatosTutor } from '../../../services/tutores.service';
import type { Tutor } from '../../../lib/types';

const inputClass = 'w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none';
const labelClass = 'block text-sm font-semibold text-gray-700 mb-2';
const fontBody = { fontFamily: 'Plus Jakarta Sans, sans-serif' };
const fontHeading = { fontFamily: 'Outfit, sans-serif' };

export default function Tutores() {
  const [tutores, setTutores] = useState<Tutor[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Tutor | null>(null);
  const limit = 10;

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await listarTutores({ page, limit, q: busqueda });
      setTutores(data.rows);
      setTotal(data.total);
    } finally { setCargando(false); }
  }, [page, busqueda]);

  useEffect(() => { const t = setTimeout(cargar, 300); return () => clearTimeout(t); }, [cargar]);

  async function onEliminar(t: Tutor) {
    if (!window.confirm(`¿Desactivar a ${t.nombres} ${t.apellidos}?`)) return;
    await eliminarTutor(t.id);
    cargar();
  }

  const totalPaginas = Math.max(Math.ceil(total / limit), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900" style={fontHeading}>Gestión de Tutores</h3>
          <p className="text-gray-600" style={fontBody}>{total} tutores registrados</p>
        </div>
        <button onClick={() => { setEditando(null); setModalAbierto(true); }} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-semibold hover:scale-105 transition-transform shadow-lg">
          <Plus className="w-5 h-5" /> Nuevo Tutor
        </button>
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={busqueda} onChange={(e) => { setBusqueda(normalizarEspacios(e.target.value)); setPage(1); }} placeholder="Buscar por nombre o CI..." className={`${inputClass} pl-10`} style={fontBody} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Tutor', 'CI', 'Parentesco', 'Teléfono', 'Acciones'].map((h) => (
                  <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase" style={fontBody}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cargando && <tr><td colSpan={5} className="text-center text-gray-400 py-8">Cargando...</td></tr>}
              {!cargando && tutores.length === 0 && <tr><td colSpan={5} className="text-center text-gray-400 py-8">No se encontraron tutores.</td></tr>}
              {tutores.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                        {t.nombres.charAt(0)}
                      </div>
                      <p className="font-semibold text-gray-900" style={fontBody}>{t.nombres} {t.apellidos}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700" style={fontBody}>{t.carnet_identidad}</td>
                  <td className="px-6 py-4 text-gray-700 capitalize" style={fontBody}>{t.parentesco.replace('_', ' ')}</td>
                  <td className="px-6 py-4 text-gray-700" style={fontBody}>{t.telefono || '-'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditando(t); setModalAbierto(true); }} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors">Editar</button>
                      <button onClick={() => onEliminar(t)} className="px-4 py-2 rounded-lg bg-red-100 text-red-700 text-sm font-medium hover:bg-red-200 transition-colors">Desactivar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-600" style={fontBody}>Página {page} de {totalPaginas}</p>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">Anterior</button>
            <button disabled={page >= totalPaginas} onClick={() => setPage((p) => p + 1)} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">Siguiente</button>
          </div>
        </div>
      </div>

      {modalAbierto && (
        <TutorModal
          tutor={editando}
          onClose={() => setModalAbierto(false)}
          onSaved={() => { setModalAbierto(false); cargar(); }}
        />
      )}
    </div>
  );
}

function TutorModal({ tutor, onClose, onSaved }: { tutor: Tutor | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<DatosTutor>({
    nombres: tutor?.nombres || '',
    apellidos: tutor?.apellidos || '',
    carnetIdentidad: tutor?.carnet_identidad || '',
    parentesco: tutor?.parentesco || 'madre',
    telefono: tutor?.telefono || '',
    email: tutor?.email || '',
    direccion: tutor?.direccion || '',
  });
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validacion = validateForm(form, { nombres: LIMITES_TEXTO.tutor, apellidos: LIMITES_TEXTO.tutor, carnetIdentidad: LIMITES_TEXTO.ci, telefono: LIMITES_TEXTO.telefono, email: LIMITES_TEXTO.email }, { nombres: 'nombre', apellidos: 'apellido', carnetIdentidad: 'CI', telefono: 'teléfono', email: 'email' });
    const errorFormato = errorNombre(form.nombres, 'nombre') || errorNombre(form.apellidos, 'apellido') || errorCI(form.carnetIdentidad, true) || errorTelefono(form.telefono, true) || errorEmail(form.email, true);
    if (validacion || errorFormato) { setErrorMsg(validacion || errorFormato); return; }
    setGuardando(true);
    setErrorMsg('');
    try {
      if (tutor) await actualizarTutor(tutor.id, form);
      else await crearTutor(form);
      onSaved();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'No se pudo guardar el tutor');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h3 className="text-2xl font-bold text-white flex items-center gap-2" style={fontHeading}>
            <UserSquare2 className="w-6 h-6" /> {tutor ? 'Editar Tutor' : 'Nuevo Tutor'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{errorMsg}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className={labelClass} style={fontBody}>Nombres *</label>
              <input required maxLength={LIMITES_TEXTO.tutor} value={form.nombres} onChange={(e) => setForm({ ...form, nombres: normalizarEspacios(e.target.value) })} className={`${inputClass} ${errorLongitud(form.nombres, LIMITES_TEXTO.tutor, 'nombre') ? 'border-red-500 ring-2 ring-red-500/20' : ''}`} style={fontBody} />
              {errorLongitud(form.nombres, LIMITES_TEXTO.tutor, 'nombre') && <p className="text-xs text-red-600">{errorLongitud(form.nombres, LIMITES_TEXTO.tutor, 'nombre')}</p>}</div>
            <div><label className={labelClass} style={fontBody}>Apellidos *</label>
              <input required maxLength={LIMITES_TEXTO.tutor} value={form.apellidos} onChange={(e) => setForm({ ...form, apellidos: normalizarEspacios(e.target.value) })} className={`${inputClass} ${errorLongitud(form.apellidos, LIMITES_TEXTO.tutor, 'apellido') ? 'border-red-500 ring-2 ring-red-500/20' : ''}`} style={fontBody} />
              {errorLongitud(form.apellidos, LIMITES_TEXTO.tutor, 'apellido') && <p className="text-xs text-red-600">{errorLongitud(form.apellidos, LIMITES_TEXTO.tutor, 'apellido')}</p>}</div>
            <div><label className={labelClass} style={fontBody}>Carnet de Identidad *</label>
              <input required maxLength={LIMITES_TEXTO.ci} inputMode="numeric" value={form.carnetIdentidad} onChange={(e) => setForm({ ...form, carnetIdentidad: normalizarEspacios(e.target.value) })} className={`${inputClass} ${errorLongitud(form.carnetIdentidad, LIMITES_TEXTO.ci, 'CI') || errorNumerico(form.carnetIdentidad, 'CI', true) ? 'border-red-500 ring-2 ring-red-500/20' : ''}`} style={fontBody} />
              {errorLongitud(form.carnetIdentidad, LIMITES_TEXTO.ci, 'CI') && <p className="text-xs text-red-600">{errorLongitud(form.carnetIdentidad, LIMITES_TEXTO.ci, 'CI')}</p>}
              {errorCI(form.carnetIdentidad, true) && <p className="text-xs text-red-600">{errorCI(form.carnetIdentidad, true)}</p>}</div>
            <div><label className={labelClass} style={fontBody}>Parentesco</label>
              <select value={form.parentesco} onChange={(e) => setForm({ ...form, parentesco: e.target.value as any })} className={inputClass} style={fontBody}>
                <option value="madre">Madre</option><option value="padre">Padre</option>
                <option value="tutor_legal">Tutor legal</option><option value="otro">Otro</option>
              </select></div>
            <div><label className={labelClass} style={fontBody}>Teléfono</label>
              <input maxLength={LIMITES_TEXTO.telefono} inputMode="numeric" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: normalizarEspacios(e.target.value) })} className={`${inputClass} ${errorLongitud(form.telefono, LIMITES_TEXTO.telefono, 'teléfono') || errorNumerico(form.telefono, 'teléfono') ? 'border-red-500 ring-2 ring-red-500/20' : ''}`} style={fontBody} />
              {errorLongitud(form.telefono, LIMITES_TEXTO.telefono, 'teléfono') && <p className="text-xs text-red-600">{errorLongitud(form.telefono, LIMITES_TEXTO.telefono, 'teléfono')}</p>}
              {errorTelefono(form.telefono, true) && <p className="text-xs text-red-600">{errorTelefono(form.telefono, true)}</p>}</div>
            <div><label className={labelClass} style={fontBody}>Correo Electrónico</label>
              <input maxLength={LIMITES_TEXTO.email} value={form.email} onChange={(e) => setForm({ ...form, email: normalizarEspacios(e.target.value) })} className={`${inputClass} ${errorLongitud(form.email, LIMITES_TEXTO.email, 'email') ? 'border-red-500 ring-2 ring-red-500/20' : ''}`} style={fontBody} />
              {errorLongitud(form.email, LIMITES_TEXTO.email, 'email') && <p className="text-xs text-red-600">{errorLongitud(form.email, LIMITES_TEXTO.email, 'email')}</p>}</div>
              {errorEmail(form.email, true) && <p className="text-xs text-red-600">{errorEmail(form.email, true)}</p>}
            <div className="md:col-span-2"><label className={labelClass} style={fontBody}>Dirección</label>
              <input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} className={inputClass} style={fontBody} /></div>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
            <button type="button" onClick={onClose} className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors">Cancelar</button>
            <button type="submit" disabled={guardando} className="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold hover:scale-105 transition-transform shadow-lg disabled:opacity-60">
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
