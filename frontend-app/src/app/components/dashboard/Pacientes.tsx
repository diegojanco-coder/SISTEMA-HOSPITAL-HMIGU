import { useCallback, useEffect, useState } from 'react';
import { Plus, Search, X, Users, Syringe, AlertCircle, ContactRound, PhoneCall, UserRoundCheck, ChevronRight } from 'lucide-react';
import {
  listarPacientes,
  obtenerPaciente,
  obtenerEsquemaPaciente,
  descargarCarnetPDF,
} from '../../../services/pacientes.service';
import { listarHistorialPorPaciente } from '../../../services/historial.service';
import HistorialDetalle from '../shared/HistorialDetalle';
import AddVaccineModal from './AddVaccineModal';
import PatientFormModal from './PatientFormModal';
export { default as AddVaccineModal } from './AddVaccineModal';
import { useAuth } from '../../../lib/auth-context';
import type { EsquemaPaciente, HistorialItem, Paciente } from '../../../lib/types';
import { errorLongitud, normalizarEspacios } from '../../../lib/validaciones';
import StatusBadge from '../shared/StatusBadge';

const inputClass =
  'w-full px-4 py-3 rounded-lg border border-border focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none';
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
  const conContacto = pacientes.filter(p => p.contacto_principal?.telefono || p.telefono_contacto).length;
  const registrosCompletos = pacientes.filter(p => !p.registro_pendiente && !p.identidad_provisional).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="clinical-kicker mb-2">Consulta y seguimiento</p>
          <h3 className="text-3xl font-extrabold text-foreground" style={fontHeading}>Pacientes</h3>
          <p className="mt-1 text-sm text-muted-foreground" style={fontBody}>Encuentra una ficha, revisa el esquema y continúa la atención sin perder el contexto.</p>
        </div>
        <button
          onClick={() => setShowAddPatient(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-lg transition-transform hover:opacity-90 sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          Nuevo Paciente
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Pacientes registrados', value: total, note: 'Fichas disponibles', icon: ContactRound },
          { label: 'Con identidad verificada', value: registrosCompletos, note: `En esta página de ${pacientes.length}`, icon: UserRoundCheck },
          { label: 'Con teléfono de contacto', value: conContacto, note: `En esta página de ${pacientes.length}`, icon: PhoneCall },
        ].map(item => { const Icon = item.icon; return <article key={item.label} className="patient-summary-card">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary"><Icon className="h-5 w-5"/></span>
          <span className="min-w-0"><span className="block text-2xl font-extrabold text-foreground">{cargando ? '—' : item.value}</span><span className="block text-xs font-bold text-foreground">{item.label}</span><span className="mt-0.5 block text-[10px] text-muted-foreground">{item.note}</span></span>
        </article>; })}
      </div>

      <div className="clinical-panel p-4 sm:p-5">
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

      <div className="clinical-panel overflow-hidden">
        <div className="hidden overflow-x-auto md:block">
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
                        {!!p.registro_pendiente && <p className="text-xs text-muted-foreground">Prerregistro pendiente</p>}
                        {!!p.identidad_provisional && <p className="text-xs text-muted-foreground">Identidad provisional</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-foreground" style={fontBody}>{p.edad_formateada}</td>
                  <td className="px-6 py-4 text-foreground" style={fontBody}>{p.sexo === 'M' ? 'Masculino' : 'Femenino'}</td>
                  <td className="px-6 py-4 text-foreground" style={fontBody}>{p.contacto_principal?.telefono || p.telefono_contacto || '-'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleViewPatient(p)} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90">Ver ficha</button>
                      <button onClick={() => handleEditPatient(p)} className="rounded-lg bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary">Editar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-border md:hidden">
          {cargando && <div className="p-8 text-center text-sm text-muted-foreground">Cargando pacientes...</div>}
          {!cargando && pacientes.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No se encontraron pacientes.</div>}
          {!cargando && pacientes.map(p => <article key={p.id} className="p-4">
            <button onClick={() => handleViewPatient(p)} className="flex w-full items-start gap-3 text-left">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary text-sm font-extrabold text-primary">{p.nombres.charAt(0)}{p.apellidos.charAt(0)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-foreground">{p.nombres} {p.apellidos}</span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">{p.codigo_paciente} · {p.edad_formateada}</span>
                <span className="mt-2 flex flex-wrap gap-1.5">
                  <span className="clinical-badge bg-secondary text-secondary-foreground">{p.sexo === 'M' ? 'Masculino' : 'Femenino'}</span>
                  {!!p.registro_pendiente && <span className="clinical-badge bg-yellow-50 text-yellow-700">Prerregistro</span>}
                  {!!p.identidad_provisional && <span className="clinical-badge bg-blue-50 text-blue-700">Identidad provisional</span>}
                </span>
              </span>
              <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground"/>
            </button>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="text-xs text-muted-foreground">{p.contacto_principal?.telefono || p.telefono_contacto || 'Sin teléfono'}</span>
              <button onClick={() => handleEditPatient(p)} className="rounded-lg px-3 py-1.5 text-xs font-bold text-primary hover:bg-secondary">Editar datos</button>
            </div>
          </article>)}
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-sm text-muted-foreground" style={fontBody}>
            Mostrando página {page} de {totalPaginas} ({total} pacientes)
          </p>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-border px-4 py-2 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40">Anterior</button>
            <button disabled={page >= totalPaginas} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-border px-4 py-2 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40">Siguiente</button>
          </div>
        </div>
      </div>

      {showAddPatient && (
        <PatientFormModal
          modo="crear"
          onClose={() => setShowAddPatient(false)}
          onSaved={() => { cargar(); }}
          onVerFicha={(p) => { setShowAddPatient(false); handleViewPatient(p); }}
          onIrVacunacion={(p) => { setShowAddPatient(false); handleAddVaccineToPatient(p); }}
        />
      )}

      {showEditPatient && selectedPatient && (
        <PatientFormModal
          modo="editar"
          paciente={selectedPatient}
          onClose={() => setShowEditPatient(false)}
          onSaved={(p) => { setSelectedPatient(p); cargar(); }}
          onVerFicha={(p) => { setShowEditPatient(false); handleViewPatient(p); }}
          onIrVacunacion={(p) => { setShowEditPatient(false); handleAddVaccineToPatient(p); }}
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
          {!cargando && !errorCarga && <div className="rounded-lg border border-border bg-muted p-4 text-sm">
            {!!detallePaciente.registro_pendiente && <p className="font-semibold">Prerregistro pendiente de completar</p>}
            {!!detallePaciente.identidad_provisional && <p>Identidad provisional: confirmar nombre desde Editar Información.</p>}
            <p>Contacto principal: {detallePaciente.contacto_principal?.nombre || "Sin confirmar"}</p>
            <p>Correo: {detallePaciente.contacto_principal?.email || "Pendiente"} · Teléfono: {detallePaciente.contacto_principal?.telefono || "Pendiente"}</p>
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
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                          <p className="font-bold text-foreground" style={fontBody}>{h.vacuna_nombre} - {h.nombre_dosis}</p>
                          <StatusBadge estado="aplicada" />
                        </div>
                        <HistorialDetalle registro={h} />
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
                  {pendientes.length === 0 && <p className="text-sm text-muted-foreground" style={fontBody}>{esquema.advertencia || esquema.estadoGeneral === 'revision' ? 'No hay dosis pendientes programadas. El esquema requiere revisión antes de confirmar que está completo.' : 'El paciente está al día con su esquema de vacunación.'}</p>}
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
