import { useCallback, useEffect, useState } from 'react';
import { Plus, Settings, Syringe, X } from 'lucide-react';
import { listarUsuarios, crearUsuario, actualizarUsuario, eliminarUsuario, type DatosUsuario } from '../../../services/usuarios.service';
import { listarVacunas, crearVacuna, agregarDosis, type DatosVacuna, type DatosDosis } from '../../../services/vacunas.service';
import { listarAuditoria } from '../../../services/auditoria.service';
import { ejecutarBackup, listarBackups, type BackupInfo } from '../../../services/backup.service';
import type { RegistroAuditoria, Usuario, Vacuna } from '../../../lib/types';
import { errorLongitud, LIMITES_TEXTO, normalizarEspacios, validateForm } from '../../../lib/validaciones';

const inputClass = 'w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none';
const labelClass = 'block text-sm font-semibold text-gray-700 mb-2';
const fontBody = { fontFamily: 'Plus Jakarta Sans, sans-serif' };
const fontHeading = { fontFamily: 'Outfit, sans-serif' };

export default function Configuracion() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [vacunas, setVacunas] = useState<Vacuna[]>([]);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [auditoria, setAuditoria] = useState<RegistroAuditoria[]>([]);
  const [showAuditoria, setShowAuditoria] = useState(false);
  const [showUsuarioModal, setShowUsuarioModal] = useState(false);
  const [editandoUsuario, setEditandoUsuario] = useState<Usuario | null>(null);
  const [showVacunaModal, setShowVacunaModal] = useState(false);
  const [showDosisModal, setShowDosisModal] = useState<Vacuna | null>(null);
  const [generandoBackup, setGenerandoBackup] = useState(false);
  const [ultimoBackup, setUltimoBackup] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const [u, v] = await Promise.all([listarUsuarios(), listarVacunas()]);
    setUsuarios(u);
    setVacunas(v);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function onEliminarUsuario(u: Usuario) {
    if (!window.confirm(`¿Desactivar a ${u.nombre_completo}?`)) return;
    await eliminarUsuario(u.id);
    cargar();
  }

  async function onGenerarBackup() {
    setGenerandoBackup(true);
    try {
      const r = await ejecutarBackup();
      setUltimoBackup(r.fecha);
      setBackups(await listarBackups());
    } finally { setGenerandoBackup(false); }
  }

  async function onVerAuditoria() {
    const data = await listarAuditoria({ page: 1, limit: 25 });
    setAuditoria(data.rows);
    setShowAuditoria(true);
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-900" style={fontHeading}>Configuración del Sistema</h3>
        <p className="text-gray-600" style={fontBody}>Panel de administración - Solo administradores</p>
      </div>

      {/* Gestión de usuarios */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-lg font-bold text-gray-900" style={fontHeading}>Gestión de Usuarios</h4>
          <button onClick={() => { setEditandoUsuario(null); setShowUsuarioModal(true); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-semibold hover:scale-105 transition-transform">
            <Plus className="w-4 h-4" /> Nuevo Usuario
          </button>
        </div>
        <div className="space-y-3">
          {usuarios.map((u) => (
            <div key={u.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-cyan-300 hover:bg-cyan-50/30 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-white font-bold">{u.nombre_completo.charAt(0)}</div>
                <div>
                  <p className="font-bold text-gray-900" style={fontBody}>{u.nombre_completo}</p>
                  <p className="text-sm text-gray-600" style={fontBody}>{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${u.rol === 'administrador' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {u.rol === 'administrador' ? 'Administrador' : 'Enfermería'}
                  </span>
                  <p className="text-xs text-gray-500 mt-1" style={fontBody}>{u.estado === 'activo' ? 'Activo' : 'Inactivo'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setEditandoUsuario(u); setShowUsuarioModal(true); }} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors">Editar</button>
                  {u.estado === 'activo' && (
                    <button onClick={() => onEliminarUsuario(u)} className="px-4 py-2 rounded-lg bg-red-100 text-red-700 text-sm font-medium hover:bg-red-200 transition-colors">Desactivar</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Catálogo de vacunas PAI */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-lg font-bold text-gray-900" style={fontHeading}>Calendario de Vacunas PAI</h4>
          <button onClick={() => setShowVacunaModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-teal-600 text-white font-semibold hover:scale-105 transition-transform">
            <Plus className="w-4 h-4" /> Agregar Vacuna
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vacunas.map((v) => (
            <div key={v.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50/30 transition-all">
              <div className="flex items-center gap-3">
                <Syringe className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-bold text-gray-900" style={fontBody}>{v.nombre}</p>
                  <p className="text-sm text-gray-600" style={fontBody}>{v.dosis.length} dosis configuradas</p>
                </div>
              </div>
              <button onClick={() => setShowDosisModal(v)} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors">+ Dosis</button>
            </div>
          ))}
        </div>
      </div>

      {/* Respaldo y auditoría */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0"><Settings className="w-6 h-6 text-white" /></div>
          <div className="flex-1">
            <h4 className="text-lg font-bold text-gray-900 mb-2" style={fontHeading}>Respaldo y Auditoría</h4>
            <p className="text-gray-700 mb-4" style={fontBody}>
              {ultimoBackup ? `Último respaldo generado: ${new Date(ultimoBackup).toLocaleString('es-BO')}` : 'Respaldo automático programado diariamente. También puedes generarlo manualmente.'}
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={onGenerarBackup} disabled={generandoBackup} className="px-6 py-3 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-colors disabled:opacity-60">
                {generandoBackup ? 'Generando...' : 'Realizar Respaldo Ahora'}
              </button>
              <button onClick={onVerAuditoria} className="px-6 py-3 rounded-lg bg-white border-2 border-purple-600 text-purple-600 font-semibold hover:bg-purple-50 transition-colors">Ver Logs del Sistema</button>
            </div>
            {backups.length > 0 && (
              <ul className="mt-4 text-sm text-gray-600 space-y-1" style={fontBody}>
                {backups.slice(0, 5).map((b) => (
                  <li key={b.archivo}>{b.archivo} — {(b.tamanioBytes / 1024).toFixed(1)} KB</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {showUsuarioModal && (
        <UsuarioModal usuario={editandoUsuario} onClose={() => setShowUsuarioModal(false)} onSaved={() => { setShowUsuarioModal(false); cargar(); }} />
      )}
      {showVacunaModal && (
        <VacunaModal onClose={() => setShowVacunaModal(false)} onSaved={() => { setShowVacunaModal(false); cargar(); }} />
      )}
      {showDosisModal && (
        <DosisModal vacuna={showDosisModal} onClose={() => setShowDosisModal(null)} onSaved={() => { setShowDosisModal(null); cargar(); }} />
      )}
      {showAuditoria && (
        <AuditoriaModal registros={auditoria} onClose={() => setShowAuditoria(false)} />
      )}
    </div>
  );
}

function UsuarioModal({ usuario, onClose, onSaved }: { usuario: Usuario | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<DatosUsuario>({
    nombreCompleto: usuario?.nombre_completo || '',
    email: usuario?.email || '',
    username: usuario?.username || '',
    rol: usuario?.rol || 'enfermero',
    password: '',
    estado: usuario?.estado || 'activo',
  });
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validacion = validateForm(form, { nombreCompleto: LIMITES_TEXTO.tutor, email: LIMITES_TEXTO.email, username: LIMITES_TEXTO.nombreUsuario, password: LIMITES_TEXTO.password }, { nombreCompleto: 'nombre', username: 'nombre_usuario', password: 'password' });
    if (validacion) { setErrorMsg(validacion); return; }
    setGuardando(true);
    setErrorMsg('');
    try {
      if (usuario) await actualizarUsuario(usuario.id, form);
      else await crearUsuario(form);
      onSaved();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'No se pudo guardar el usuario');
    } finally { setGuardando(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h3 className="text-xl font-bold text-gray-900" style={fontHeading}>{usuario ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{errorMsg}</div>}
          <div><label className={labelClass} style={fontBody}>Nombre completo *</label>
            <input required maxLength={LIMITES_TEXTO.tutor} value={form.nombreCompleto} onChange={(e) => setForm({ ...form, nombreCompleto: normalizarEspacios(e.target.value) })} className={`${inputClass} ${errorLongitud(form.nombreCompleto, LIMITES_TEXTO.tutor, 'nombre') ? 'border-red-500 ring-2 ring-red-500/20' : ''}`} style={fontBody} />
            {errorLongitud(form.nombreCompleto, LIMITES_TEXTO.tutor, 'nombre') && <p className="text-xs text-red-600">{errorLongitud(form.nombreCompleto, LIMITES_TEXTO.tutor, 'nombre')}</p>}</div>
          <div><label className={labelClass} style={fontBody}>Email *</label>
            <input required maxLength={LIMITES_TEXTO.email} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: normalizarEspacios(e.target.value) })} className={`${inputClass} ${errorLongitud(form.email, LIMITES_TEXTO.email, 'email') ? 'border-red-500 ring-2 ring-red-500/20' : ''}`} style={fontBody} />
            {errorLongitud(form.email, LIMITES_TEXTO.email, 'email') && <p className="text-xs text-red-600">{errorLongitud(form.email, LIMITES_TEXTO.email, 'email')}</p>}</div>
          <div><label className={labelClass} style={fontBody}>Usuario *</label>
            <input required maxLength={LIMITES_TEXTO.nombreUsuario} value={form.username} onChange={(e) => setForm({ ...form, username: normalizarEspacios(e.target.value) })} className={`${inputClass} ${errorLongitud(form.username, LIMITES_TEXTO.nombreUsuario, 'nombre_usuario') ? 'border-red-500 ring-2 ring-red-500/20' : ''}`} style={fontBody} />
            {errorLongitud(form.username, LIMITES_TEXTO.nombreUsuario, 'nombre_usuario') && <p className="text-xs text-red-600">{errorLongitud(form.username, LIMITES_TEXTO.nombreUsuario, 'nombre_usuario')}</p>}</div>
          <div><label className={labelClass} style={fontBody}>Rol</label>
            <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value as any })} className={inputClass} style={fontBody}>
              <option value="enfermero">Enfermería</option><option value="administrador">Administrador</option>
            </select></div>
          {usuario && (
            <div><label className={labelClass} style={fontBody}>Estado</label>
              <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value as any })} className={inputClass} style={fontBody}>
                <option value="activo">Activo</option><option value="inactivo">Inactivo</option>
              </select></div>
          )}
          {!usuario && (
            <div><label className={labelClass} style={fontBody}>Contraseña temporal *</label>
              <input required type="password" minLength={6} maxLength={LIMITES_TEXTO.password} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={`${inputClass} ${errorLongitud(form.password, LIMITES_TEXTO.password, 'password') ? 'border-red-500 ring-2 ring-red-500/20' : ''}`} style={fontBody} />
              {errorLongitud(form.password, LIMITES_TEXTO.password, 'password') && <p className="text-xs text-red-600">{errorLongitud(form.password, LIMITES_TEXTO.password, 'password')}</p>}</div>
          )}
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={guardando} className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-semibold disabled:opacity-60">{guardando ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function VacunaModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<DatosVacuna>({ nombre: '', nombreCorto: '', descripcion: '', enfermedadPrevine: '', viaAdministracion: 'intramuscular' });
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validacion = validateForm(form, { nombre: LIMITES_TEXTO.nombreVacuna, nombreCorto: LIMITES_TEXTO.nombreVacuna, descripcion: LIMITES_TEXTO.descripcionVacuna, enfermedadPrevine: LIMITES_TEXTO.fabricante }, { nombre: 'nombre', nombreCorto: 'nombre corto', enfermedadPrevine: 'fabricante' });
    if (validacion) { setErrorMsg(validacion); return; }
    setGuardando(true);
    setErrorMsg('');
    try { await crearVacuna(form); onSaved(); } catch (err: any) { setErrorMsg(err?.response?.data?.message || 'No se pudo guardar la vacuna'); } finally { setGuardando(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h3 className="text-xl font-bold text-gray-900" style={fontHeading}>Nueva Vacuna</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{errorMsg}</div>}
          <div><label className={labelClass} style={fontBody}>Nombre *</label>
            <input required maxLength={LIMITES_TEXTO.nombreVacuna} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: normalizarEspacios(e.target.value) })} className={`${inputClass} ${errorLongitud(form.nombre, LIMITES_TEXTO.nombreVacuna, 'nombre') ? 'border-red-500 ring-2 ring-red-500/20' : ''}`} style={fontBody} />
            {errorLongitud(form.nombre, LIMITES_TEXTO.nombreVacuna, 'nombre') && <p className="text-xs text-red-600">{errorLongitud(form.nombre, LIMITES_TEXTO.nombreVacuna, 'nombre')}</p>}</div>
          <div><label className={labelClass} style={fontBody}>Nombre corto *</label>
            <input required maxLength={LIMITES_TEXTO.nombreVacuna} value={form.nombreCorto} onChange={(e) => setForm({ ...form, nombreCorto: normalizarEspacios(e.target.value) })} className={`${inputClass} ${errorLongitud(form.nombreCorto, LIMITES_TEXTO.nombreVacuna, 'nombre corto') ? 'border-red-500 ring-2 ring-red-500/20' : ''}`} style={fontBody} />
            {errorLongitud(form.nombreCorto, LIMITES_TEXTO.nombreVacuna, 'nombre corto') && <p className="text-xs text-red-600">{errorLongitud(form.nombreCorto, LIMITES_TEXTO.nombreVacuna, 'nombre corto')}</p>}</div>
          <div><label className={labelClass} style={fontBody}>Enfermedad que previene</label>
            <input maxLength={LIMITES_TEXTO.fabricante} value={form.enfermedadPrevine} onChange={(e) => setForm({ ...form, enfermedadPrevine: normalizarEspacios(e.target.value) })} className={`${inputClass} ${errorLongitud(form.enfermedadPrevine, LIMITES_TEXTO.fabricante, 'enfermedad') ? 'border-red-500 ring-2 ring-red-500/20' : ''}`} style={fontBody} />
            {errorLongitud(form.enfermedadPrevine, LIMITES_TEXTO.fabricante, 'enfermedad') && <p className="text-xs text-red-600">{errorLongitud(form.enfermedadPrevine, LIMITES_TEXTO.fabricante, 'enfermedad')}</p>}</div>
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={guardando} className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-green-500 to-teal-600 text-white font-semibold disabled:opacity-60">{guardando ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DosisModal({ vacuna, onClose, onSaved }: { vacuna: Vacuna; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<DatosDosis>({ numeroDosis: vacuna.dosis.length + 1, nombreDosis: '', edadRecomendadaDias: 0, toleranciaDias: 30, intervaloMinimoDias: 0 });
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});

  function cambiarNumero(campo: keyof DatosDosis, valor: string) {
    setForm({ ...form, [campo]: valor === '' ? Number.NaN : Number(valor) });
    setErrores({ ...errores, [campo]: '' });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nuevosErrores: Record<string, string> = {};
    if (!Number.isFinite(form.numeroDosis) || form.numeroDosis < 1) nuevosErrores.numeroDosis = 'El número de dosis es obligatorio y debe ser un número mayor que 0';
    if (!Number.isFinite(form.edadRecomendadaDias) || form.edadRecomendadaDias < 0) nuevosErrores.edadRecomendadaDias = 'La edad recomendada es obligatoria y debe ser un número';
    if (!Number.isFinite(form.toleranciaDias) || form.toleranciaDias < 0) nuevosErrores.toleranciaDias = 'La tolerancia debe ser un número mayor o igual a 0';
    if (Object.keys(nuevosErrores).length > 0) { setErrores(nuevosErrores); return; }
    setGuardando(true);
    try { await agregarDosis(vacuna.id, form); onSaved(); } finally { setGuardando(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h3 className="text-xl font-bold text-gray-900" style={fontHeading}>Nueva Dosis - {vacuna.nombre}</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
          <div><label className={labelClass} style={fontBody}>N° de dosis</label>
            <input type="number" required min="1" value={Number.isNaN(form.numeroDosis) ? '' : form.numeroDosis} onChange={(e) => cambiarNumero('numeroDosis', e.target.value)} className={`${inputClass} ${errores.numeroDosis ? 'border-red-500 ring-2 ring-red-500/20' : ''}`} style={fontBody} />
            {errores.numeroDosis && <p className="text-xs text-red-600 mt-1">{errores.numeroDosis}</p>}</div>
          <div><label className={labelClass} style={fontBody}>Nombre de la dosis</label>
            <input required value={form.nombreDosis} onChange={(e) => setForm({ ...form, nombreDosis: e.target.value })} className={inputClass} style={fontBody} /></div>
          <div><label className={labelClass} style={fontBody}>Edad recomendada (días)</label>
            <input type="number" required min="0" value={Number.isNaN(form.edadRecomendadaDias) ? '' : form.edadRecomendadaDias} onChange={(e) => cambiarNumero('edadRecomendadaDias', e.target.value)} className={`${inputClass} ${errores.edadRecomendadaDias ? 'border-red-500 ring-2 ring-red-500/20' : ''}`} style={fontBody} />
            {errores.edadRecomendadaDias && <p className="text-xs text-red-600 mt-1">{errores.edadRecomendadaDias}</p>}</div>
          <div><label className={labelClass} style={fontBody}>Tolerancia (días)</label>
            <input type="number" min="0" value={Number.isNaN(form.toleranciaDias) ? '' : form.toleranciaDias} onChange={(e) => cambiarNumero('toleranciaDias', e.target.value)} className={`${inputClass} ${errores.toleranciaDias ? 'border-red-500 ring-2 ring-red-500/20' : ''}`} style={fontBody} />
            {errores.toleranciaDias && <p className="text-xs text-red-600 mt-1">{errores.toleranciaDias}</p>}</div>
          <div className="col-span-2 flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={guardando} className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-green-500 to-teal-600 text-white font-semibold disabled:opacity-60">{guardando ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AuditoriaModal({ registros, onClose }: { registros: RegistroAuditoria[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h3 className="text-xl font-bold text-gray-900" style={fontHeading}>Bitácora de Auditoría</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-600" /></button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Fecha/Hora', 'Usuario', 'Acción', 'Entidad', 'ID', 'IP'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase" style={fontBody}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {registros.length === 0 && <tr><td colSpan={6} className="text-center text-gray-400 py-8">Sin registros de auditoría.</td></tr>}
              {registros.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700" style={fontBody}>{r.created_at}</td>
                  <td className="px-4 py-3 text-gray-700" style={fontBody}>{r.usuario_nombre || 'Sistema'}</td>
                  <td className="px-4 py-3 text-gray-700" style={fontBody}>{r.accion}</td>
                  <td className="px-4 py-3 text-gray-700" style={fontBody}>{r.entidad}</td>
                  <td className="px-4 py-3 text-gray-700" style={fontBody}>{r.entidad_id ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-700" style={fontBody}>{r.ip || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
