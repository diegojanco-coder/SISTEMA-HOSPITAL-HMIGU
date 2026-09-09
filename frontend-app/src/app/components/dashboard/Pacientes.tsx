import { useCallback, useEffect, useState } from 'react';
import { Plus, Search, X, Users, Syringe, AlertCircle } from 'lucide-react';
import {
  listarPacientes,
  crearPaciente,
  actualizarPaciente,
  eliminarPaciente,
  obtenerPaciente,
  obtenerEsquemaPaciente,
  descargarCarnetPDF,
  type DatosPaciente,
} from '../../../services/pacientes.service';
import { listarTutores } from '../../../services/tutores.service';
import { listarHistorialPorPaciente } from '../../../services/historial.service';
import AddVaccineModal from './AddVaccineModal';
export { default as AddVaccineModal } from './AddVaccineModal';
import { useAuth } from '../../../lib/auth-context';
import type { EsquemaPaciente, HistorialItem, Paciente, Tutor } from '../../../lib/types';
import { errorCI, errorEmail, errorFechaNacimiento, errorLongitud, errorNombre, errorNumerico, errorTelefono, LIMITES_TEXTO, normalizarEspacios, validateForm } from '../../../lib/validaciones';
import StatusBadge from '../shared/StatusBadge';

const inputClass =
  'w-full px-4 py-3 rounded-lg border border-border focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none';
const labelClass = 'block text-sm font-semibold text-foreground mb-2';
const fontBody = { fontFamily: 'Plus Jakarta Sans, sans-serif' };
const fontHeading = { fontFamily: 'Outfit, sans-serif' };

export default function Pacientes() {
  const { usuario } = useAuth();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [errorBusqueda, setErrorBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showEditPatient, setShowEditPatient] = useState(false);
  const [showPatientProfile, setShowPatientProfile] = useState(false);
  const [showAddVaccine, setShowAddVaccine] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Paciente | null>(null);

  const limit = 10;

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await listarPacientes({ page, limit, q: busqueda });
      setPacientes(data.rows);
      setTotal(data.total);
    } finally {
      setCargando(false);
    }
  }, [page, busqueda]);

  useEffect(() => {
    const t = setTimeout(cargar, 300);
    return () => clearTimeout(t);
  }, [cargar]);

  function handleViewPatient(p: Paciente) {
    setSelectedPatient(p);
    setShowPatientProfile(true);
  }
  function handleEditPatient(p: Paciente) {
    setSelectedPatient(p);
    setShowEditPatient(true);
  }
  function handleAddVaccineToPatient(p: Paciente) {
    setSelectedPatient(p);
    setShowAddVaccine(true);
  }

  const totalPaginas = Math.max(Math.ceil(total / limit), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-foreground" style={fontHeading}>Gestión de Pacientes</h3>
          <p className="text-muted-foreground" style={fontBody}>{total} pacientes registrados</p>
        </div>
        <button
          onClick={() => setShowAddPatient(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-white font-semibold hover:opacity-90 transition-transform shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Nuevo Paciente
        </button>
      </div>

      <div className="bg-card rounded-xl p-6 border border-border">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busqueda}
            maxLength={100}
            onBeforeInput={(e) => {
              if (e.currentTarget.value.length >= 100 && e.data) {
                e.preventDefault();
                setErrorBusqueda(errorLongitud(`${e.currentTarget.value}x`, 100, 'búsqueda'));
              }
            }}
            onPaste={(e) => {
              if (e.currentTarget.value.length + e.clipboardData.getData('text').length > 100) {
                e.preventDefault();
                setErrorBusqueda('El campo búsqueda no puede exceder los 100 caracteres');
              }
            }}
            onChange={(e) => {
              const valor = e.target.value;
              setBusqueda(normalizarEspacios(valor));
              setErrorBusqueda(errorLongitud(valor, 100, 'búsqueda'));
              setPage(1);
            }}
            placeholder="Buscar por nombre, CI o código..."
            className={`${inputClass} pl-10 ${errorBusqueda ? 'border-red-500 ring-2 ring-red-500/20' : ''}`}
            style={fontBody}
          />
          {errorBusqueda && <p className="text-xs text-red-600 mt-2">{errorBusqueda}</p>}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                {['Paciente', 'Edad', 'Sexo', 'Teléfono', 'Acciones'].map((h) => (
                  <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase" style={fontBody}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cargando && (
                <tr><td colSpan={5} className="text-center text-muted-foreground py-8">Cargando...</td></tr>
              )}
              {!cargando && pacientes.length === 0 && (
                <tr><td colSpan={5} className="text-center text-muted-foreground py-8">No se encontraron pacientes.</td></tr>
              )}
              {pacientes.map((p) => (
                <tr key={p.id} className="hover:bg-muted transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-white font-bold text-sm">
                        {p.nombres.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground" style={fontBody}>{p.nombres} {p.apellidos}</p>
                        <p className="text-sm text-muted-foreground" style={fontBody}>ID: {p.codigo_paciente}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-foreground" style={fontBody}>{p.edad_formateada}</td>
                  <td className="px-6 py-4 text-foreground" style={fontBody}>{p.sexo === 'M' ? 'Masculino' : 'Femenino'}</td>
                  <td className="px-6 py-4 text-foreground" style={fontBody}>{p.telefono_contacto || '-'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleViewPatient(p)} className="px-4 py-2 rounded-lg bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-600 transition-colors">Ver</button>
                      <button onClick={() => handleEditPatient(p)} className="px-4 py-2 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-gray-200 transition-colors">Editar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <p className="text-sm text-muted-foreground" style={fontBody}>
            Mostrando página {page} de {totalPaginas} ({total} pacientes)
          </p>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors disabled:opacity-40">Anterior</button>
            <button disabled={page >= totalPaginas} onClick={() => setPage((p) => p + 1)} className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors disabled:opacity-40">Siguiente</button>
          </div>
        </div>
      </div>

      {showAddPatient && (
        <PatientFormModal
          modo="crear"
          onClose={() => setShowAddPatient(false)}
          onSaved={() => { setShowAddPatient(false); cargar(); }}
        />
      )}

      {showEditPatient && selectedPatient && (
        <PatientFormModal
          modo="editar"
          paciente={selectedPatient}
          onClose={() => setShowEditPatient(false)}
          onSaved={() => { setShowEditPatient(false); cargar(); }}
        />
      )}

      {showPatientProfile && !showAddVaccine && selectedPatient && (
        <PatientProfileModal
          paciente={selectedPatient}
          onClose={() => setShowPatientProfile(false)}
          onEditar={() => { setShowPatientProfile(false); setShowEditPatient(true); }}
          onRegistrarVacuna={() => handleAddVaccineToPatient(selectedPatient)}
        />
      )}

      {showAddVaccine && selectedPatient && (
        <AddVaccineModal
          paciente={selectedPatient}
          aplicadoPor={usuario?.nombre || ''}
          onClose={() => setShowAddVaccine(false)}
          onSaved={() => { setShowAddVaccine(false); cargar(); }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Modal: Crear / Editar paciente (incluye datos del tutor al crear)
// ---------------------------------------------------------------------
function PatientFormModal({
  modo, paciente, onClose, onSaved,
}: { modo: 'crear' | 'editar'; paciente?: Paciente; onClose: () => void; onSaved: () => void }) {
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [form, setForm] = useState({
    nombres: paciente?.nombres || '',
    apellidos: paciente?.apellidos || '',
    carnetIdentidad: paciente?.carnet_identidad || '',
    fechaNacimiento: paciente?.fecha_nacimiento || '',
    sexo: (paciente?.sexo || 'F') as 'M' | 'F',
    direccion: paciente?.direccion || '',
    departamento: paciente?.departamento || '',
    telefonoContacto: paciente?.telefono_contacto || '',
    email: paciente?.email || '',
    esDependiente: Boolean(paciente?.es_dependiente),
  });
  const [tutor, setTutor] = useState({
    nombres: '', apellidos: '', carnetIdentidad: '', parentesco: 'madre' as const, telefono: '', email: '',
  });

  const [tutores, setTutores] = useState<Tutor[]>([]);
  const [tutorId, setTutorId] = useState('');
  const [vinculados, setVinculados] = useState<Tutor[]>([]);
  const [cargandoTutores, setCargandoTutores] = useState(true);
  const [errorTutores, setErrorTutores] = useState('');
  useEffect(() => {
    let activo = true;
    async function cargar() {
      try {
        const lista: Tutor[] = [];
        let page = 1;
        while (true) {
          const result = await listarTutores({ page, limit: 100 });
          lista.push(...result.rows);
          if (lista.length >= result.total || !result.rows.length) break;
          page++;
        }
        const detalle = paciente ? await obtenerPaciente(paciente.id) : null;
        if (activo) { setTutores(lista); setVinculados((detalle?.tutores || []).filter(t => t.estado === 'activo')); }
      } catch { if (activo) setErrorTutores('No se pudieron cargar los tutores. Cierra el formulario e intenta nuevamente.'); }
      finally { if (activo) setCargandoTutores(false); }
    }
    cargar();
    return () => { activo = false; };
  }, [paciente?.id]);
  const hoy = new Date();
  const nacimiento = new Date(`${form.fechaNacimiento}T00:00:00`);
  const edad = hoy.getFullYear() - nacimiento.getFullYear() - (hoy.getMonth() < nacimiento.getMonth() || (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate()) ? 1 : 0);
  const requiereTutor = form.esDependiente || edad < 18;
  const tutorNuevo = !tutorId && Boolean(tutor.nombres || tutor.apellidos || tutor.carnetIdentidad || tutor.telefono || tutor.email);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validacion = validateForm(form, { nombres: LIMITES_TEXTO.nombre, apellidos: LIMITES_TEXTO.apellido, carnetIdentidad: LIMITES_TEXTO.ci, telefonoContacto: LIMITES_TEXTO.telefono }, { nombres: 'nombre', apellidos: 'apellido', carnetIdentidad: 'CI', telefonoContacto: 'teléfono' });
    const errorFormato = errorNombre(form.nombres, 'nombre') || errorNombre(form.apellidos, 'apellido') || errorCI(form.carnetIdentidad) || errorTelefono(form.telefonoContacto) || errorEmail(form.email) || errorFechaNacimiento(form.fechaNacimiento);
    if (validacion || errorFormato) { setErrorMsg(validacion || errorFormato); return; }
    if (cargandoTutores || errorTutores) { setErrorMsg(errorTutores || 'Espera a que se carguen los tutores'); return; }
    if (requiereTutor && !tutorId && !tutorNuevo && !vinculados.length) { setErrorMsg('Los menores y pacientes dependientes necesitan un tutor'); return; }
    if (tutorNuevo) {
      const errorTutor = !tutor.nombres || !tutor.apellidos || !tutor.carnetIdentidad || !tutor.telefono || !tutor.email
        ? 'Completa el nombre, apellido, CI, teléfono y correo del tutor'
        : errorNombre(tutor.nombres, 'nombre del tutor') || errorNombre(tutor.apellidos, 'apellido del tutor') || errorCI(tutor.carnetIdentidad) || errorTelefono(tutor.telefono) || errorEmail(tutor.email);
      if (errorTutor) { setErrorMsg(errorTutor); return; }
    }
    setGuardando(true);
    setErrorMsg('');
    try {
      const payload: DatosPaciente = { ...form, ...(tutorId ? { tutorId: Number(tutorId) } : tutorNuevo ? { tutor } : {}) };
      if (modo === 'crear') {
        await crearPaciente(payload);
      } else if (paciente) {
        await actualizarPaciente(paciente.id, payload);
      }
      onSaved();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'No se pudo guardar el paciente');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h3 className="text-2xl font-bold text-foreground" style={fontHeading}>
            {modo === 'crear' ? 'Registrar Nuevo Paciente' : 'Editar Paciente'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="w-6 h-6 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errorMsg && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{errorMsg}</div>}

          <div>
            <h4 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2" style={fontHeading}>
              <Users className="w-5 h-5 text-cyan-600" /> Datos del Paciente
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass} style={fontBody}>Nombres *</label>
                <input required maxLength={LIMITES_TEXTO.nombre} value={form.nombres} onChange={(e) => setForm({ ...form, nombres: normalizarEspacios(e.target.value) })} className={`${inputClass} ${errorLongitud(form.nombres, LIMITES_TEXTO.nombre, 'nombre') ? 'border-red-500 ring-2 ring-red-500/20' : ''}`} style={fontBody} />
                {errorLongitud(form.nombres, LIMITES_TEXTO.nombre, 'nombre') && <p className="text-xs text-red-600 mt-1">{errorLongitud(form.nombres, LIMITES_TEXTO.nombre, 'nombre')}</p>}
              </div>
              <div>
                <label className={labelClass} style={fontBody}>Apellidos *</label>
                <input required maxLength={LIMITES_TEXTO.apellido} value={form.apellidos} onChange={(e) => setForm({ ...form, apellidos: normalizarEspacios(e.target.value) })} className={`${inputClass} ${errorLongitud(form.apellidos, LIMITES_TEXTO.apellido, 'apellido') ? 'border-red-500 ring-2 ring-red-500/20' : ''}`} style={fontBody} />
                {errorLongitud(form.apellidos, LIMITES_TEXTO.apellido, 'apellido') && <p className="text-xs text-red-600 mt-1">{errorLongitud(form.apellidos, LIMITES_TEXTO.apellido, 'apellido')}</p>}
              </div>
              <div>
                <label className={labelClass} style={fontBody}>Carnet de Identidad</label>
                <input maxLength={LIMITES_TEXTO.ci} value={form.carnetIdentidad} onChange={(e) => setForm({ ...form, carnetIdentidad: normalizarEspacios(e.target.value) })} className={`${inputClass} ${errorLongitud(form.carnetIdentidad, LIMITES_TEXTO.ci, 'CI') || errorNumerico(form.carnetIdentidad, 'CI') ? 'border-red-500 ring-2 ring-red-500/20' : ''}`} style={fontBody} />
                {errorLongitud(form.carnetIdentidad, LIMITES_TEXTO.ci, 'CI') && <p className="text-xs text-red-600 mt-1">{errorLongitud(form.carnetIdentidad, LIMITES_TEXTO.ci, 'CI')}</p>}
                {errorCI(form.carnetIdentidad) && <p className="text-xs text-red-600 mt-1">{errorCI(form.carnetIdentidad)}</p>}
              </div>
              <div>
                <label className={labelClass} style={fontBody}>Fecha de Nacimiento *</label>
                <input required type="date" value={form.fechaNacimiento} onChange={(e) => setForm({ ...form, fechaNacimiento: e.target.value })} className={inputClass} style={fontBody} />
                {errorFechaNacimiento(form.fechaNacimiento) && <p className="text-xs text-red-600 mt-1">{errorFechaNacimiento(form.fechaNacimiento)}</p>}
              </div>
              <div>
                <label className={labelClass} style={fontBody}>Sexo *</label>
                <select required value={form.sexo} onChange={(e) => setForm({ ...form, sexo: e.target.value as 'M' | 'F' })} className={inputClass} style={fontBody}>
                  <option value="F">Femenino</option>
                  <option value="M">Masculino</option>
                </select>
              </div>
              <div>
                <label className={labelClass} style={fontBody}>Teléfono de Contacto</label>
                <input maxLength={LIMITES_TEXTO.telefono} inputMode="numeric" value={form.telefonoContacto} onChange={(e) => setForm({ ...form, telefonoContacto: normalizarEspacios(e.target.value) })} className={`${inputClass} ${errorLongitud(form.telefonoContacto, LIMITES_TEXTO.telefono, 'teléfono') || errorNumerico(form.telefonoContacto, 'teléfono de contacto') ? 'border-red-500 ring-2 ring-red-500/20' : ''}`} style={fontBody} />
                {errorLongitud(form.telefonoContacto, LIMITES_TEXTO.telefono, 'teléfono') && <p className="text-xs text-red-600 mt-1">{errorLongitud(form.telefonoContacto, LIMITES_TEXTO.telefono, 'teléfono')}</p>}
                {errorTelefono(form.telefonoContacto) && <p className="text-xs text-red-600 mt-1">{errorTelefono(form.telefonoContacto)}</p>}
              </div>
              <div>
                <label className={labelClass} style={fontBody}>Correo Electrónico</label>
                <input type="email" maxLength={LIMITES_TEXTO.email} value={form.email} onChange={(e) => setForm({ ...form, email: normalizarEspacios(e.target.value) })} className={`${inputClass} ${errorEmail(form.email) ? 'border-red-500 ring-2 ring-red-500/20' : ''}`} style={fontBody} />
                {errorEmail(form.email) && <p className="text-xs text-red-600 mt-1">{errorEmail(form.email)}</p>}
              </div>
              <div className="md:col-span-2">
                <label className={labelClass} style={fontBody}>Dirección</label>
                <input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: normalizarEspacios(e.target.value) })} className={inputClass} style={fontBody} />
              </div>
              <label className="block">Departamento de residencia<select className={inputClass} value={form.departamento} onChange={e=>setForm({...form,departamento:e.target.value})}><option value="">Sin confirmar</option>{['Beni','Chuquisaca','Cochabamba','La Paz','Oruro','Pando','Potosí','Santa Cruz','Tarija'].map(d=><option key={d}>{d}</option>)}</select></label>
            </div>
          </div>

          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={form.esDependiente} onChange={e => setForm({ ...form, esDependiente: e.target.checked })} />
            Paciente dependiente: requiere un tutor o responsable
          </label>
          {(
            <div className="border-t border-border pt-6">
              <h4 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2" style={fontHeading}>
                <Users className="w-5 h-5 text-purple-600" /> Datos del Tutor/Responsable {requiereTutor ? '(obligatorio)' : '(opcional)'}
              </h4>
              {vinculados.length > 0 && <p className="mb-3 text-sm">Tutor vinculado: {vinculados.map(t => `${t.nombres} ${t.apellidos}`).join(', ')}</p>}
              {errorTutores && <p role="alert" className="text-red-600 mb-3">{errorTutores}</p>}
              <label className={labelClass}>Tutor existente</label>
              <select value={tutorId} onChange={e => setTutorId(e.target.value)} className={`${inputClass} mb-4`} disabled={cargandoTutores}>
                <option value="">{cargandoTutores ? 'Cargando tutores...' : 'Registrar uno nuevo o conservar el tutor actual'}</option>
                {tutores.map(t => <option key={t.id} value={t.id}>{t.nombres} {t.apellidos} — CI {t.carnet_identidad}</option>)}
              </select>
              <fieldset disabled={Boolean(tutorId)} className="grid grid-cols-1 md:grid-cols-2 gap-4 disabled:opacity-50">
                <div>
                  <label className={labelClass} style={fontBody}>Nombres del Tutor</label>
                  <input maxLength={LIMITES_TEXTO.tutor} value={tutor.nombres} onChange={(e) => setTutor({ ...tutor, nombres: normalizarEspacios(e.target.value) })} className={inputClass} style={fontBody} />
                </div>
                <div>
                  <label className={labelClass} style={fontBody}>Apellidos del Tutor</label>
                  <input maxLength={LIMITES_TEXTO.tutor} value={tutor.apellidos} onChange={(e) => setTutor({ ...tutor, apellidos: normalizarEspacios(e.target.value) })} className={inputClass} style={fontBody} />
                </div>
                <div>
                  <label className={labelClass} style={fontBody}>CI del Tutor</label>
                  <input maxLength={LIMITES_TEXTO.ci} value={tutor.carnetIdentidad} onChange={(e) => setTutor({ ...tutor, carnetIdentidad: e.target.value })} className={inputClass} style={fontBody} />
                </div>
                <div>
                  <label className={labelClass} style={fontBody}>Parentesco</label>
                  <select value={tutor.parentesco} onChange={(e) => setTutor({ ...tutor, parentesco: e.target.value as any })} className={inputClass} style={fontBody}>
                    <option value="madre">Madre</option>
                    <option value="padre">Padre</option>
                    <option value="tutor_legal">Tutor legal</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass} style={fontBody}>Teléfono</label>
                  <input maxLength={LIMITES_TEXTO.telefono} value={tutor.telefono} onChange={(e) => setTutor({ ...tutor, telefono: e.target.value })} className={inputClass} style={fontBody} />
                </div>
                <div>
                  <label className={labelClass} style={fontBody}>Correo Electrónico</label>
                  <input maxLength={LIMITES_TEXTO.email} value={tutor.email} onChange={(e) => setTutor({ ...tutor, email: e.target.value })} className={inputClass} style={fontBody} />
                </div>
              </fieldset>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-border pt-6">
            <button type="button" onClick={onClose} className="px-6 py-3 rounded-lg border border-border text-foreground font-semibold hover:bg-muted transition-colors">Cancelar</button>
            <button type="submit" disabled={guardando || cargandoTutores || Boolean(errorTutores)} className="px-6 py-3 rounded-lg bg-primary text-primary-foreground text-white font-semibold hover:opacity-90 transition-transform shadow-lg disabled:opacity-60">
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Modal: Ficha / Perfil del paciente (esquema PAI + historial)
// ---------------------------------------------------------------------
export function PatientProfileModal({
  paciente, onClose, onEditar, onRegistrarVacuna,
}: { paciente: Paciente; onClose: () => void; onEditar: () => void; onRegistrarVacuna: () => void }) {
  const [esquema, setEsquema] = useState<EsquemaPaciente | null>(null);
  const [historial, setHistorial] = useState<HistorialItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [detallePaciente, setDetallePaciente] = useState(paciente);
  const [errorCarga, setErrorCarga] = useState('');
  const [reintento, setReintento] = useState(0);

  useEffect(() => {
    let activo = true;
    setCargando(true); setErrorCarga('');
    Promise.all([
      obtenerEsquemaPaciente(paciente.id),
      listarHistorialPorPaciente(paciente.id),
      obtenerPaciente(paciente.id),
    ]).then(([esq, hist, datos]) => {
      if (activo) { setEsquema(esq); setHistorial(hist); setDetallePaciente(datos); }
    }).catch(() => {
      if (activo) setErrorCarga('No se pudo cargar la ficha del paciente. Intenta nuevamente.');
    }).finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [paciente.id, reintento]);

  const pendientes = esquema?.detalle.filter((d) => ['proxima', 'pendiente', 'atrasada'].includes(d.estado)) || [];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-primary text-primary-foreground px-6 py-6 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-2xl">
              {paciente.nombres.charAt(0)}
            </div>
            <div className="text-white">
              <h3 className="text-2xl font-bold" style={fontHeading}>{paciente.nombres} {paciente.apellidos}</h3>
              <p className="text-white/90" style={fontBody}>ID: {paciente.codigo_paciente} • {paciente.edad_formateada}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {cargando && <p className="text-muted-foreground text-sm">Cargando ficha...</p>}

          {errorCarga && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            <p>{errorCarga}</p>
            <button type="button" onClick={() => setReintento(n => n + 1)} className="mt-2 underline">Reintentar carga</button>
          </div>}
          {!cargando && !errorCarga && esquema && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-muted rounded-xl p-6 border border-border">
                  <h4 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2" style={fontHeading}>
                    <Users className="w-5 h-5 text-cyan-600" /> Datos del Paciente
                  </h4>
                  <div className="space-y-3">
                    <div><p className="text-sm text-muted-foreground" style={fontBody}>CI</p><p className="font-semibold text-foreground" style={fontBody}>{paciente.carnet_identidad || 'N/A'}</p></div>
                    <div><p className="text-sm text-muted-foreground" style={fontBody}>Fecha de Nacimiento</p><p className="font-semibold text-foreground" style={fontBody}>{paciente.fecha_nacimiento}</p></div>
                    <div><p className="text-sm text-muted-foreground" style={fontBody}>Dirección</p><p className="font-semibold text-foreground" style={fontBody}>{paciente.direccion || 'N/A'}</p></div>
                  </div>
                </div>
                <div className="bg-muted rounded-xl p-6 border border-border">
                  <h4 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2" style={fontHeading}>
                    <Users className="w-5 h-5 text-purple-600" /> Tutor(es)
                  </h4>
                  {(detallePaciente.tutores || []).length === 0 && <p className="text-sm text-muted-foreground" style={fontBody}>Sin tutores registrados</p>}
                  {(detallePaciente.tutores || []).map((t) => (
                    <div key={t.id} className="mb-2">
                      <p className="font-semibold text-foreground" style={fontBody}>{t.nombres} {t.apellidos} ({t.parentesco})</p>
                      <p className="text-sm text-muted-foreground" style={fontBody}>Tel: {t.telefono || 'N/A'}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card rounded-xl p-6 border border-border">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-bold text-foreground flex items-center gap-2" style={fontHeading}>
                    <Syringe className="w-5 h-5 text-green-600" /> Estado de Vacunación
                  </h4>
                  <button onClick={onRegistrarVacuna} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-white font-semibold hover:opacity-90 transition-transform text-sm">
                    <Plus className="w-4 h-4" /> Registrar Vacuna
                  </button>
                </div>

                {esquema.advertencia && <p role="status" className="mb-4 rounded-lg border border-border bg-muted p-3 text-sm text-foreground">{esquema.advertencia}</p>}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1" style={fontBody}>Vacunas Aplicadas</p>
                    <p className="text-3xl font-bold text-green-600" style={fontHeading}>{esquema.resumen.aplicadas}</p>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1" style={fontBody}>Próximas / Pendientes</p>
                    <p className="text-3xl font-bold text-yellow-600" style={fontHeading}>{esquema.resumen.proximas + esquema.resumen.pendientes}</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1" style={fontBody}>Atrasadas</p>
                    <p className="text-3xl font-bold text-red-600" style={fontHeading}>{esquema.resumen.atrasadas}</p>
                  </div>
                </div>

                <h5 className="font-bold text-foreground mb-3" style={fontBody}>Historial de Vacunación</h5>
                <div className="space-y-3">
                  {historial.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay vacunas aplicadas.</p>}
                  {historial.map((h) => (
                    <div key={h.id} className="flex items-start gap-4 p-4 rounded-lg border border-border hover:border-green-300 hover:bg-green-50/30 transition-all">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                        <Syringe className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-1">
                          <p className="font-bold text-foreground" style={fontBody}>{h.vacuna_nombre} - {h.nombre_dosis}</p>
                          <StatusBadge estado="aplicada" />
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground" style={fontBody}>
                          <span>{h.fecha_aplicacion}</span><span>•</span><span>Lote: {h.lote || '-'}</span><span>•</span><span>{h.aplicado_por || '-'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <h4 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2" style={fontHeading}>
                  <AlertCircle className="w-5 h-5 text-yellow-600" /> Vacunas Pendientes según Edad
                </h4>
                <div className="space-y-3">
                  {pendientes.length === 0 && <p className="text-sm text-muted-foreground" style={fontBody}>El paciente está al día con su esquema de vacunación.</p>}
                  {pendientes.map((d) => (
                    <div key={d.dosisId} className="flex items-center justify-between p-4 rounded-lg bg-card border border-yellow-300">
                      <div>
                        <p className="font-bold text-foreground" style={fontBody}>{d.vacunaNombre} - {d.nombreDosis}</p>
                        <p className="text-sm text-muted-foreground" style={fontBody}>Fecha límite: {d.fechaLimite}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge estado={d.estado} />
                        <button onClick={onRegistrarVacuna} className="px-4 py-2 rounded-lg bg-yellow-500 text-white text-sm font-semibold hover:bg-yellow-600 transition-colors">Registrar aplicación</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-border pt-6">
            <button onClick={onEditar} className="px-6 py-3 rounded-lg border border-border text-foreground font-semibold hover:bg-muted transition-colors">Editar Información</button>
            <button onClick={() => descargarCarnetPDF(paciente.id)} className="px-6 py-3 rounded-lg bg-primary text-primary-foreground text-white font-semibold hover:opacity-90 transition-transform shadow-lg">Generar Carnet PDF</button>
            <button onClick={onClose} className="px-6 py-3 rounded-lg bg-gray-600 text-white font-semibold hover:bg-gray-700 transition-colors">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
