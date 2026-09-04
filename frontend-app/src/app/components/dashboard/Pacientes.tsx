import { useCallback, useEffect, useState } from 'react';
import { Plus, Search, X, Users, Syringe, AlertCircle } from 'lucide-react';
import {
  listarPacientes,
  crearPaciente,
  actualizarPaciente,
  eliminarPaciente,
  obtenerEsquemaPaciente,
  descargarCarnetPDF,
  type DatosPaciente,
} from '../../../services/pacientes.service';
import { crearTutor } from '../../../services/tutores.service';
import { listarHistorialPorPaciente, registrarAplicacion } from '../../../services/historial.service';
import { listarLotesDisponibles, type LoteDisponible } from '../../../services/lotes.service';
import { useAuth } from '../../../lib/auth-context';
import type { EsquemaPaciente, HistorialItem, Paciente } from '../../../lib/types';
import { errorCI, errorEmail, errorFechaNacimiento, errorLongitud, errorNombre, errorNumerico, errorTelefono, LIMITES_TEXTO, normalizarEspacios, validateForm } from '../../../lib/validaciones';
import StatusBadge from '../shared/StatusBadge';

const inputClass =
  'w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none';
const labelClass = 'block text-sm font-semibold text-gray-700 mb-2';
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
          <h3 className="text-2xl font-bold text-gray-900" style={fontHeading}>Gestión de Pacientes</h3>
          <p className="text-gray-600" style={fontBody}>{total} pacientes registrados</p>
        </div>
        <button
          onClick={() => setShowAddPatient(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-semibold hover:scale-105 transition-transform shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Nuevo Paciente
        </button>
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
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

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Paciente', 'Edad', 'Sexo', 'Teléfono', 'Acciones'].map((h) => (
                  <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase" style={fontBody}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cargando && (
                <tr><td colSpan={5} className="text-center text-gray-400 py-8">Cargando...</td></tr>
              )}
              {!cargando && pacientes.length === 0 && (
                <tr><td colSpan={5} className="text-center text-gray-400 py-8">No se encontraron pacientes.</td></tr>
              )}
              {pacientes.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                        {p.nombres.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900" style={fontBody}>{p.nombres} {p.apellidos}</p>
                        <p className="text-sm text-gray-500" style={fontBody}>ID: {p.codigo_paciente}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700" style={fontBody}>{p.edad_formateada}</td>
                  <td className="px-6 py-4 text-gray-700" style={fontBody}>{p.sexo === 'M' ? 'Masculino' : 'Femenino'}</td>
                  <td className="px-6 py-4 text-gray-700" style={fontBody}>{p.telefono_contacto || '-'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleViewPatient(p)} className="px-4 py-2 rounded-lg bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-600 transition-colors">Ver</button>
                      <button onClick={() => handleEditPatient(p)} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors">Editar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-600" style={fontBody}>
            Mostrando página {page} de {totalPaginas} ({total} pacientes)
          </p>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40">Anterior</button>
            <button disabled={page >= totalPaginas} onClick={() => setPage((p) => p + 1)} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40">Siguiente</button>
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

      {showPatientProfile && selectedPatient && (
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
    telefonoContacto: paciente?.telefono_contacto || '',
    email: '',
  });
  const [tutor, setTutor] = useState({
    nombres: '', apellidos: '', carnetIdentidad: '', parentesco: 'madre' as const, telefono: '', email: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validacion = validateForm(form, { nombres: LIMITES_TEXTO.nombre, apellidos: LIMITES_TEXTO.apellido, carnetIdentidad: LIMITES_TEXTO.ci, telefonoContacto: LIMITES_TEXTO.telefono }, { nombres: 'nombre', apellidos: 'apellido', carnetIdentidad: 'CI', telefonoContacto: 'teléfono' });
    const errorFormato = errorNombre(form.nombres, 'nombre') || errorNombre(form.apellidos, 'apellido') || errorCI(form.carnetIdentidad) || errorTelefono(form.telefonoContacto) || errorEmail(form.email) || errorFechaNacimiento(form.fechaNacimiento);
    if (validacion || errorFormato) { setErrorMsg(validacion || errorFormato); return; }
    setGuardando(true);
    setErrorMsg('');
    try {
      const payload: DatosPaciente = { ...form };
      if (modo === 'crear') {
        const nuevo = await crearPaciente(payload);
        if (tutor.nombres || tutor.apellidos || tutor.carnetIdentidad || tutor.telefono || tutor.email) {
          await crearTutor({ ...tutor, pacienteId: nuevo.id });
        }
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
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h3 className="text-2xl font-bold text-gray-900" style={fontHeading}>
            {modo === 'crear' ? 'Registrar Nuevo Paciente' : 'Editar Paciente'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errorMsg && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{errorMsg}</div>}

          <div>
            <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2" style={fontHeading}>
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
            </div>
          </div>

          {modo === 'crear' && (
            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2" style={fontHeading}>
                <Users className="w-5 h-5 text-purple-600" /> Datos del Tutor/Responsable (opcional)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
            <button type="button" onClick={onClose} className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors">Cancelar</button>
            <button type="submit" disabled={guardando} className="px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-semibold hover:scale-105 transition-transform shadow-lg disabled:opacity-60">
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

  useEffect(() => {
    (async () => {
      setCargando(true);
      try {
        const [esq, hist] = await Promise.all([
          obtenerEsquemaPaciente(paciente.id),
          listarHistorialPorPaciente(paciente.id),
        ]);
        setEsquema(esq);
        setHistorial(hist);
      } finally {
        setCargando(false);
      }
    })();
  }, [paciente.id]);

  const pendientes = esquema?.detalle.filter((d) => ['proxima', 'pendiente', 'atrasada'].includes(d.estado)) || [];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-cyan-500 to-purple-600 px-6 py-6 flex items-center justify-between rounded-t-2xl">
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
          {cargando && <p className="text-gray-400 text-sm">Cargando ficha...</p>}

          {!cargando && esquema && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-6 border border-cyan-200">
                  <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2" style={fontHeading}>
                    <Users className="w-5 h-5 text-cyan-600" /> Datos del Paciente
                  </h4>
                  <div className="space-y-3">
                    <div><p className="text-sm text-gray-600" style={fontBody}>CI</p><p className="font-semibold text-gray-900" style={fontBody}>{paciente.carnet_identidad || 'N/A'}</p></div>
                    <div><p className="text-sm text-gray-600" style={fontBody}>Fecha de Nacimiento</p><p className="font-semibold text-gray-900" style={fontBody}>{paciente.fecha_nacimiento}</p></div>
                    <div><p className="text-sm text-gray-600" style={fontBody}>Dirección</p><p className="font-semibold text-gray-900" style={fontBody}>{paciente.direccion || 'N/A'}</p></div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                  <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2" style={fontHeading}>
                    <Users className="w-5 h-5 text-purple-600" /> Tutor(es)
                  </h4>
                  {(paciente.tutores || []).length === 0 && <p className="text-sm text-gray-500" style={fontBody}>Sin tutores registrados</p>}
                  {(paciente.tutores || []).map((t) => (
                    <div key={t.id} className="mb-2">
                      <p className="font-semibold text-gray-900" style={fontBody}>{t.nombres} {t.apellidos} ({t.parentesco})</p>
                      <p className="text-sm text-gray-600" style={fontBody}>Tel: {t.telefono || 'N/A'}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2" style={fontHeading}>
                    <Syringe className="w-5 h-5 text-green-600" /> Estado de Vacunación
                  </h4>
                  <button onClick={onRegistrarVacuna} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-teal-600 text-white font-semibold hover:scale-105 transition-transform text-sm">
                    <Plus className="w-4 h-4" /> Registrar Vacuna
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1" style={fontBody}>Vacunas Aplicadas</p>
                    <p className="text-3xl font-bold text-green-600" style={fontHeading}>{esquema.resumen.aplicadas}</p>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1" style={fontBody}>Próximas / Pendientes</p>
                    <p className="text-3xl font-bold text-yellow-600" style={fontHeading}>{esquema.resumen.proximas + esquema.resumen.pendientes}</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1" style={fontBody}>Atrasadas</p>
                    <p className="text-3xl font-bold text-red-600" style={fontHeading}>{esquema.resumen.atrasadas}</p>
                  </div>
                </div>

                <h5 className="font-bold text-gray-900 mb-3" style={fontBody}>Historial de Vacunación</h5>
                <div className="space-y-3">
                  {historial.length === 0 && <p className="text-sm text-gray-400">Aún no hay vacunas aplicadas.</p>}
                  {historial.map((h) => (
                    <div key={h.id} className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50/30 transition-all">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                        <Syringe className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-1">
                          <p className="font-bold text-gray-900" style={fontBody}>{h.vacuna_nombre} - {h.nombre_dosis}</p>
                          <StatusBadge estado="aplicada" />
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600" style={fontBody}>
                          <span>{h.fecha_aplicacion}</span><span>•</span><span>Lote: {h.lote || '-'}</span><span>•</span><span>{h.aplicado_por || '-'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2" style={fontHeading}>
                  <AlertCircle className="w-5 h-5 text-yellow-600" /> Vacunas Pendientes según Edad
                </h4>
                <div className="space-y-3">
                  {pendientes.length === 0 && <p className="text-sm text-gray-500" style={fontBody}>El paciente está al día con su esquema de vacunación.</p>}
                  {pendientes.map((d) => (
                    <div key={d.dosisId} className="flex items-center justify-between p-4 rounded-lg bg-white border border-yellow-300">
                      <div>
                        <p className="font-bold text-gray-900" style={fontBody}>{d.vacunaNombre} - {d.nombreDosis}</p>
                        <p className="text-sm text-gray-600" style={fontBody}>Fecha límite: {d.fechaLimite}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge estado={d.estado} />
                        <button onClick={onRegistrarVacuna} className="px-4 py-2 rounded-lg bg-yellow-500 text-white text-sm font-semibold hover:bg-yellow-600 transition-colors">Programar</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
            <button onClick={onEditar} className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors">Editar Información</button>
            <button onClick={() => descargarCarnetPDF(paciente.id)} className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold hover:scale-105 transition-transform shadow-lg">Generar Carnet PDF</button>
            <button onClick={onClose} className="px-6 py-3 rounded-lg bg-gray-600 text-white font-semibold hover:bg-gray-700 transition-colors">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Modal: Registrar aplicación de vacuna (dosis pendientes reales)
// ---------------------------------------------------------------------
export function AddVaccineModal({
  paciente, aplicadoPor, onClose, onSaved,
}: { paciente: Paciente; aplicadoPor: string; onClose: () => void; onSaved: () => void }) {
  const [esquema, setEsquema] = useState<EsquemaPaciente | null>(null);
  const [dosisId, setDosisId] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [loteId, setLoteId] = useState('');
  const [lotes, setLotes] = useState<LoteDisponible[]>([]);
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    obtenerEsquemaPaciente(paciente.id).then(setEsquema);
  }, [paciente.id]);

  const opciones = esquema?.detalle.filter((d) => ['proxima', 'pendiente', 'atrasada'].includes(d.estado)) || [];

  useEffect(() => {
    const dosis = opciones.find((item) => String(item.dosisId) === dosisId);
    setLoteId('');
    if (!dosis) { setLotes([]); return; }
    listarLotesDisponibles(dosis.vacunaId).then(setLotes).catch(() => setLotes([]));
  }, [dosisId, esquema]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dosisId) { setErrorMsg('Seleccione una dosis'); return; }
    if (!loteId) { setErrorMsg('Seleccione un lote'); return; }
    const validacion = validateForm({ observaciones }, { observaciones: 255 }, { observaciones: 'observaciones' });
    if (validacion) { setErrorMsg(validacion); return; }
    setGuardando(true);
    setErrorMsg('');
    try {
      await registrarAplicacion({
        pacienteId: paciente.id,
        dosisId: Number(dosisId),
        fechaAplicacion: fecha,
        loteVacunaId: Number(loteId),
        observaciones,
      });
      onSaved();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'No se pudo registrar la vacuna');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-green-500 to-teal-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="text-white">
            <h3 className="text-2xl font-bold" style={fontHeading}>Registrar Vacuna</h3>
            <p className="text-white/90 text-sm" style={fontBody}>Paciente: {paciente.nombres} {paciente.apellidos}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errorMsg && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{errorMsg}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={labelClass} style={fontBody}>Dosis pendiente *</label>
              <select required value={dosisId} onChange={(e) => setDosisId(e.target.value)} className={inputClass} style={fontBody}>
                <option value="">Seleccionar dosis...</option>
                {opciones.map((d) => (
                  <option key={d.dosisId} value={d.dosisId}>{d.vacunaNombre} - {d.nombreDosis} ({d.estado})</option>
                ))}
              </select>
              {opciones.length === 0 && esquema && (
                <p className="text-xs text-gray-400 mt-1">El paciente no tiene dosis pendientes en este momento.</p>
              )}
            </div>
            <div>
              <label className={labelClass} style={fontBody}>Fecha de Aplicación *</label>
              <input required type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputClass} style={fontBody} />
            </div>
            <div>
              <label className={labelClass} style={fontBody}>Número de Lote</label>
              <select required value={loteId} onChange={(e) => setLoteId(e.target.value)} className={inputClass} style={fontBody}>
                <option value="">Seleccionar lote (código máximo 50 caracteres)...</option>
                {lotes.map((item) => <option key={item.id} value={item.id}>{item.numero_lote} (máximo 50 caracteres)</option>)}
              </select>
              {dosisId && lotes.length === 0 && <p className="text-xs text-gray-400 mt-1">No hay lotes disponibles para esta vacuna.</p>}
            </div>
            <div className="md:col-span-2">
              <label className={labelClass} style={fontBody}>Observaciones / Reacciones</label>
              <textarea maxLength={255} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={3} className={`${inputClass} resize-none ${errorLongitud(observaciones, 255, 'observaciones') ? 'border-red-500 ring-2 ring-red-500/20' : ''}`} style={fontBody} />
              {errorLongitud(observaciones, 255, 'observaciones') && <p className="text-xs text-red-600">{errorLongitud(observaciones, 255, 'observaciones')}</p>}
            </div>
            <div className="md:col-span-2">
              <label className={labelClass} style={fontBody}>Profesional que Aplicó</label>
              <input value={aplicadoPor} disabled className={`${inputClass} bg-gray-50 text-gray-600`} style={fontBody} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
            <button type="button" onClick={onClose} className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors">Cancelar</button>
            <button type="submit" disabled={guardando} className="px-6 py-3 rounded-lg bg-gradient-to-r from-green-500 to-teal-600 text-white font-semibold hover:scale-105 transition-transform shadow-lg disabled:opacity-60">
              {guardando ? 'Guardando...' : 'Registrar Vacuna'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
