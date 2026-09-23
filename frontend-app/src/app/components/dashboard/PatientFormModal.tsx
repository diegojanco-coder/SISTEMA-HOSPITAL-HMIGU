import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Baby, Check, ChevronLeft, ChevronRight, UserRound, X } from 'lucide-react';
import { actualizarPaciente, crearPaciente, obtenerPaciente, type DatosPaciente } from '../../../services/pacientes.service';
import { listarTutores, type DatosTutor } from '../../../services/tutores.service';
import type { Paciente, Tutor } from '../../../lib/types';
import { errorCI, errorEmail, errorNombre, errorTelefono, LIMITES_TEXTO } from '../../../lib/validaciones';
import { edadPaciente as edadCalculada } from '../../../lib/edad-paciente';
import { fechaLocal } from '../../../lib/visita';

const inputClass = 'w-full rounded-lg border border-border bg-card px-3 py-3 text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';
const buttonClass = 'rounded-lg border border-border px-4 py-3 text-sm font-semibold transition-colors hover:bg-muted disabled:opacity-50';
const primaryClass = 'rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50';
type TipoPaciente = 'menor' | 'adulto';
type Errores = Record<string, string>;

function Campo({ id, label, error, children, ayuda }: { id: string; label: string; error?: string; children: ReactNode; ayuda?: string }) {
  return <div className="min-w-0">
    <label htmlFor={id} className="mb-2 block text-sm font-semibold">{label}</label>
    {children}
    {ayuda && <p id={`${id}-ayuda`} className="mt-1 text-xs text-muted-foreground">{ayuda}</p>}
    {error && <p id={`${id}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
  </div>;
}

export default function PatientFormModal({ modo, paciente, onClose, onSaved, onVerFicha, onIrVacunacion }: {
  modo: 'crear' | 'editar'; paciente?: Paciente; onClose: () => void;
  onSaved: (paciente: Paciente) => void; onVerFicha: (paciente: Paciente) => void; onIrVacunacion: (paciente: Paciente) => void;
}) {
  const [tipo, setTipo] = useState<TipoPaciente | null>(modo === 'editar' ? (edadCalculada(paciente?.fecha_nacimiento?.slice(0, 10) || '')?.anios ?? 18) < 18 ? 'menor' : 'adulto' : null);
  const [paso, setPaso] = useState(1);
  const [form, setForm] = useState({ nombres: '', apellidos: '', carnetIdentidad: '', fechaNacimiento: '', sexo: 'F' as 'F' | 'M', direccion: '', departamento: '', telefonoContacto: '', email: '', esDependiente: false, identidadProvisional: false });
  const [tutorNuevo, setTutorNuevo] = useState<DatosTutor>({ nombres: '', apellidos: '', carnetIdentidad: '', parentesco: 'madre', telefono: '', email: '' });
  const [modoTutor, setModoTutor] = useState<'existente' | 'nuevo'>('existente');
  const [tutorElegido, setTutorElegido] = useState<Tutor | null>(null);
  const [sinCorreoPaciente, setSinCorreoPaciente] = useState(false);
  const [sinCorreoTutor, setSinCorreoTutor] = useState(false);
  const [contactoAlertas, setContactoAlertas] = useState<'paciente' | 'tutor'>('paciente');
  const [busquedaTutor, setBusquedaTutor] = useState('');
  const [paginaTutor, setPaginaTutor] = useState(1);
  const [tutores, setTutores] = useState<Tutor[]>([]);
  const [totalTutores, setTotalTutores] = useState(0);
  const [cargandoTutores, setCargandoTutores] = useState(false);
  const [errorTutores, setErrorTutores] = useState('');
  const [reintentoTutores, setReintentoTutores] = useState(0);
  const [cargandoDetalle, setCargandoDetalle] = useState(modo === 'editar');
  const [errorDetalle, setErrorDetalle] = useState('');
  const [reintentoDetalle, setReintentoDetalle] = useState(0);
  const [errores, setErrores] = useState<Errores>({});
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmado, setConfirmado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState<Paciente | null>(null);
  const enviando = useRef(false);
  const panel = useRef<HTMLDivElement>(null);
  const encabezado = useRef<HTMLHeadingElement>(null);
  const requiereTutor = tipo === 'menor' || form.esDependiente;
  const destinatarioTutor = tipo === 'menor' || (form.esDependiente && contactoAlertas === 'tutor');
  const edad = edadCalculada(form.fechaNacimiento);
  const tutorActivo = modoTutor === 'existente' ? tutorElegido : null;
  const correoTutor = modoTutor === 'existente' ? tutorActivo?.email || '' : sinCorreoTutor ? '' : tutorNuevo.email || '';
  const telefonoTutor = modoTutor === 'existente' ? tutorActivo?.telefono || '' : tutorNuevo.telefono || '';
  const nombreTutor = modoTutor === 'existente' ? `${tutorActivo?.nombres || ''} ${tutorActivo?.apellidos || ''}`.trim() : `${tutorNuevo.nombres} ${tutorNuevo.apellidos}`.trim();
  const nombrePaciente = form.identidadProvisional ? `Recién nacido ${form.apellidos.trim() || 'Por confirmar'}` : `${form.nombres} ${form.apellidos}`.trim();
  const contacto = destinatarioTutor ? { nombre: nombreTutor, email: correoTutor, telefono: telefonoTutor } : { nombre: nombrePaciente, email: sinCorreoPaciente ? '' : form.email, telefono: form.telefonoContacto };
  const pendiente = form.identidadProvisional || !contacto.email.trim() || (requiereTutor && !correoTutor.trim());

  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null;
    encabezado.current?.focus();
    return () => { previo?.focus(); };
  }, []);
  useEffect(() => { encabezado.current?.focus(); panel.current?.scrollTo({ top: 0 }); }, [paso, tipo, guardado]);
  useEffect(() => {
    if (modo !== 'editar' || !paciente) return;
    let activo = true;
    setCargandoDetalle(true); setErrorDetalle('');
    obtenerPaciente(paciente.id).then(p => {
      if (!activo) return;
      const menor = (edadCalculada(p.fecha_nacimiento.slice(0, 10))?.anios ?? 18) < 18;
      setTipo(menor ? 'menor' : 'adulto');
      setForm({ nombres: p.nombres, apellidos: p.apellidos, carnetIdentidad: p.carnet_identidad || '', fechaNacimiento: p.fecha_nacimiento.slice(0, 10), sexo: p.sexo, direccion: p.direccion || '', departamento: p.departamento || '', telefonoContacto: p.telefono_contacto || '', email: p.email || '', esDependiente: Boolean(p.es_dependiente), identidadProvisional: Boolean(p.identidad_provisional) });
      const vinculados = (p.tutores || []).filter(t => t.estado === 'activo');
      const principal = vinculados.find(t => t.es_principal) || vinculados[0] || null;
      setTutorElegido(principal); setSinCorreoTutor(Boolean(principal && !principal.email));
      setSinCorreoPaciente(!p.email);
      setContactoAlertas(menor ? 'tutor' : p.contacto_alertas || (p.es_dependiente ? 'tutor' : 'paciente'));
    }).catch(() => { if (activo) setErrorDetalle('No se pudieron cargar los datos completos del paciente.'); })
      .finally(() => { if (activo) setCargandoDetalle(false); });
    return () => { activo = false; };
  }, [modo, paciente?.id, reintentoDetalle]);

  useEffect(() => {
    if (paso !== 2 || !requiereTutor || modoTutor !== 'existente') return;
    let activo = true;
    setCargandoTutores(true); setErrorTutores('');
    const temporizador = window.setTimeout(() => {
      listarTutores({ q: busquedaTutor.trim(), page: paginaTutor, limit: 5 }).then(datos => {
        if (activo) { setTutores(datos.rows.filter(t => t.estado === 'activo')); setTotalTutores(datos.total); }
      }).catch(() => { if (activo) { setTutores([]); setErrorTutores('No se pudieron buscar los tutores.'); } })
        .finally(() => { if (activo) setCargandoTutores(false); });
    }, 250);
    return () => { activo = false; window.clearTimeout(temporizador); };
  }, [paso, requiereTutor, modoTutor, busquedaTutor, paginaTutor, reintentoTutores]);

  function limpiarError(campo: string) { setErrores(prev => ({ ...prev, [campo]: '' })); setErrorMsg(''); setConfirmado(false); }
  function cambiar<K extends keyof typeof form>(campo: K, valor: typeof form[K]) { setForm(prev => ({ ...prev, [campo]: valor })); limpiarError(campo); }
  function cambiarTutor<K extends keyof DatosTutor>(campo: K, valor: DatosTutor[K]) { setTutorNuevo(prev => ({ ...prev, [campo]: valor })); limpiarError(`tutor.${campo}`); }
  function atributos(campo: string) { return { id: `registro-${campo}`, 'aria-invalid': Boolean(errores[campo]), 'aria-describedby': errores[campo] ? `registro-${campo}-error` : undefined }; }
  function validarDatos(): Errores {
    const resultado: Errores = {};
    if (!form.identidadProvisional && (!form.nombres.trim() || errorNombre(form.nombres, 'nombre'))) resultado.nombres = !form.nombres.trim() ? 'Escribe los nombres del paciente.' : errorNombre(form.nombres, 'nombre');
    if (!form.identidadProvisional && !form.apellidos.trim()) resultado.apellidos = 'Escribe los apellidos del paciente.';
    else if (errorNombre(form.apellidos, 'apellido')) resultado.apellidos = errorNombre(form.apellidos, 'apellido');
    if (errorCI(form.carnetIdentidad)) resultado.carnetIdentidad = errorCI(form.carnetIdentidad);
    if (!edad) resultado.fechaNacimiento = 'Indica una fecha válida que no sea futura.';
    else if ((tipo === 'menor' && edad.anios >= 18) || (tipo === 'adulto' && edad.anios < 18)) resultado.fechaNacimiento = `La fecha corresponde a ${edad.anios < 18 ? 'un menor' : 'un adulto'}. Cambia el tipo de paciente o corrige la fecha.`;
    return resultado;
  }
  function validarContacto(): Errores {
    const resultado: Errores = {};
    if (requiereTutor) {
      if (modoTutor === 'existente' && !tutorElegido) resultado.tutorId = 'Selecciona un tutor o registra uno nuevo.';
      if (modoTutor === 'nuevo') {
        if (!tutorNuevo.nombres.trim() || errorNombre(tutorNuevo.nombres, 'nombre del tutor')) resultado['tutor.nombres'] = !tutorNuevo.nombres.trim() ? 'Escribe los nombres del tutor.' : errorNombre(tutorNuevo.nombres, 'nombre del tutor');
        if (!tutorNuevo.apellidos.trim() || errorNombre(tutorNuevo.apellidos, 'apellido del tutor')) resultado['tutor.apellidos'] = !tutorNuevo.apellidos.trim() ? 'Escribe los apellidos del tutor.' : errorNombre(tutorNuevo.apellidos, 'apellido del tutor');
        if (errorCI(tutorNuevo.carnetIdentidad)) resultado['tutor.carnetIdentidad'] = errorCI(tutorNuevo.carnetIdentidad);
      }
      if (errorTelefono(telefonoTutor, true)) resultado['tutor.telefono'] = modoTutor === 'existente' ? 'El tutor necesita un teléfono válido. Actualízalo en Tutores o selecciona otro responsable.' : errorTelefono(telefonoTutor, true);
      if (errorEmail(correoTutor, !sinCorreoTutor)) resultado['tutor.email'] = errorEmail(correoTutor, !sinCorreoTutor);
    }
    if (!destinatarioTutor) {
      if (errorTelefono(form.telefonoContacto, true)) resultado.telefonoContacto = errorTelefono(form.telefonoContacto, true);
      if (errorEmail(sinCorreoPaciente ? '' : form.email, !sinCorreoPaciente)) resultado.email = errorEmail(sinCorreoPaciente ? '' : form.email, !sinCorreoPaciente);
    }
    return resultado;
  }
  function avanzar() {
    const resultado = paso === 1 ? validarDatos() : validarContacto();
    setErrores(resultado); setErrorMsg('');
    if (Object.keys(resultado).length) {
      setErrorMsg('Revisa los campos señalados para continuar.');
      requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setPaso(p => p + 1);
  }
  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (paso < 3) { avanzar(); return; }
    if (enviando.current || !tipo) return;
    const datos = validarDatos(); const contactos = validarContacto();
    if (Object.keys(datos).length || Object.keys(contactos).length) { setErrores({ ...datos, ...contactos }); setPaso(Object.keys(datos).length ? 1 : 2); setErrorMsg('Revisa los campos señalados antes de guardar.'); return; }
    if (!confirmado) { setErrores({ confirmado: 'Confirma que revisaste los datos del paciente y su contacto.' }); return; }
    enviando.current = true; setGuardando(true); setErrorMsg(''); setErrores({});
    const payload: DatosPaciente = {
      ...form, tipoPaciente: tipo, nombres: form.identidadProvisional ? 'Recién nacido' : form.nombres.trim(), apellidos: form.apellidos.trim() || 'Por confirmar', carnetIdentidad: form.carnetIdentidad.trim(),
      esDependiente: tipo === 'adulto' && form.esDependiente, identidadProvisional: tipo === 'menor' && form.identidadProvisional,
      guardarPrerregistro: pendiente, contactoAlertas: destinatarioTutor ? 'tutor' : 'paciente',
      email: destinatarioTutor || sinCorreoPaciente ? '' : form.email.trim(), telefonoContacto: destinatarioTutor ? '' : form.telefonoContacto.trim(),
      ...(requiereTutor ? modoTutor === 'existente' ? { tutorId: tutorElegido!.id } : { tutor: { ...tutorNuevo, nombres: tutorNuevo.nombres.trim(), apellidos: tutorNuevo.apellidos.trim(), carnetIdentidad: tutorNuevo.carnetIdentidad?.trim() || '', email: correoTutor.trim(), telefono: telefonoTutor.trim(), guardarPrerregistro: !correoTutor.trim() } } : {}),
    };
    try {
      const resultado = modo === 'crear' ? await crearPaciente(payload) : await actualizarPaciente(paciente!.id, payload);
      setGuardado(resultado); onSaved(resultado);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'No se pudo confirmar el registro. Revisa la lista de pacientes antes de reintentar.');
      const detalles = err?.response?.data?.errors;
      if (Array.isArray(detalles)) {
        const campos: Errores = {};
        for (const detalle of detalles) if (detalle.campo && detalle.mensaje) campos[detalle.campo] = detalle.mensaje;
        setErrores(campos);
        if (Object.keys(campos).some(c => ['nombres', 'apellidos', 'carnetIdentidad', 'fechaNacimiento', 'sexo', 'tipoPaciente', 'identidadProvisional'].includes(c))) setPaso(1);
        else if (Object.keys(campos).length) setPaso(2);
      }
    } finally { enviando.current = false; setGuardando(false); }
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
    <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="registro-title" className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card text-foreground shadow-xl"
      onKeyDown={e => {
        if (e.key === 'Escape' && !guardando) { e.stopPropagation(); onClose(); }
        if (e.key === 'Tab') {
          const elementos = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]') || []).filter(el => el.offsetParent !== null);
          const primero = elementos[0]; const ultimo = elementos[elementos.length - 1];
          if (e.shiftKey && (document.activeElement === primero || document.activeElement === encabezado.current)) { e.preventDefault(); ultimo?.focus(); }
          else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero?.focus(); }
        }
      }}>
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
        <div><h3 id="registro-title" ref={encabezado} tabIndex={-1} className="text-xl font-bold outline-none" style={{ fontFamily: 'Outfit, sans-serif' }}>{guardado ? 'Paciente guardado' : modo === 'crear' ? 'Registrar Nuevo Paciente' : 'Editar Paciente'}</h3><p className="mt-1 text-sm text-muted-foreground">{guardado ? guardado.codigo_paciente : 'Identidad y contacto para el seguimiento de vacunación.'}</p></div>
        <button type="button" disabled={guardando} onClick={onClose} aria-label="Cerrar registro" className="rounded-lg p-2 hover:bg-muted disabled:opacity-50"><X className="h-5 w-5" /></button>
      </div>

      {guardado ? <div className="space-y-5 p-5 sm:p-6">
        <div className="flex items-center gap-3"><Check className="h-6 w-6 text-primary" /><p className="font-semibold">{guardado.nombres} {guardado.apellidos}</p></div>
        <p role="status">{guardado.registro_pendiente ? 'Prerregistro guardado. Puedes completar los datos pendientes desde Editar Información.' : 'Los datos del paciente se guardaron correctamente.'}</p>
        <p className="text-sm text-muted-foreground">Guardar el registro no envía correos ni activa las alertas por correo.</p>
        <div className="flex flex-wrap gap-3"><button type="button" onClick={() => onVerFicha(guardado)} className={primaryClass}>Ver ficha del paciente</button><button type="button" onClick={() => onIrVacunacion(guardado)} className={buttonClass}>Ir a vacunación</button><button type="button" onClick={onClose} className={buttonClass}>Cerrar</button></div>
      </div> : cargandoDetalle ? <p role="status" className="p-6">Cargando datos del paciente...</p> : errorDetalle ? <div role="alert" className="space-y-3 p-6"><p>{errorDetalle}</p><button type="button" onClick={() => setReintentoDetalle(n => n + 1)} className={buttonClass}>Reintentar datos del paciente</button></div> : !tipo ? <div className="space-y-5 p-5 sm:p-6">
        <p className="font-semibold">¿A quién vas a registrar?</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <button type="button" onClick={() => { setTipo('menor'); setContactoAlertas('tutor'); }} className="rounded-xl border border-border p-5 text-left hover:border-primary hover:bg-muted"><Baby className="mb-3 h-7 w-7 text-primary" /><span className="block font-semibold">Menor o recién nacido</span><span className="mt-2 block text-sm text-muted-foreground">Menor de 18 años. Los datos de contacto corresponden a su tutor.</span></button>
          <button type="button" onClick={() => { setTipo('adulto'); setContactoAlertas('paciente'); }} className="rounded-xl border border-border p-5 text-left hover:border-primary hover:bg-muted"><UserRound className="mb-3 h-7 w-7 text-primary" /><span className="block font-semibold">Adulto</span><span className="mt-2 block text-sm text-muted-foreground">Desde los 18 años. Puedes añadir un responsable si lo necesita.</span></button>
        </div>
      </div> : <form onSubmit={guardar} noValidate className="space-y-5 p-5 sm:p-6">
        <ol aria-label="Pasos del registro" className="grid grid-cols-3 gap-2 text-sm">{['Datos', 'Contacto', 'Revisión'].map((nombre, i) => <li key={nombre} aria-current={paso === i + 1 ? 'step' : undefined} className={`rounded-lg border px-2 py-3 text-center ${paso === i + 1 ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted text-muted-foreground'}`}>{i + 1}. {nombre}</li>)}</ol>
        {errorMsg && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{errorMsg}</div>}
        <fieldset disabled={guardando} className="space-y-5 disabled:opacity-60">
          {paso === 1 && <>
            <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-semibold">Datos del {tipo === 'menor' ? 'menor o recién nacido' : 'paciente adulto'}</h4><button type="button" onClick={() => { setTipo(null); setErrores({}); setErrorMsg(''); cambiar('identidadProvisional', false); }} className="text-sm font-semibold underline">Cambiar tipo de paciente</button></div>
            {tipo === 'menor' && <div className="rounded-lg border border-border bg-muted p-3"><label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={form.identidadProvisional} onChange={e => cambiar('identidadProvisional', e.target.checked)} /><span>Recién nacido sin nombre confirmado</span></label>{form.identidadProvisional && <p className="mt-2 text-sm text-muted-foreground">Se guardará como «Recién nacido» con un código único y la identidad pendiente de confirmar.</p>}</div>}
            <div className="grid gap-4 sm:grid-cols-2">
              {!form.identidadProvisional && <Campo id="registro-nombres" label="Nombres *" error={errores.nombres}><input {...atributos('nombres')} className={inputClass} autoComplete="given-name" maxLength={LIMITES_TEXTO.nombre} value={form.nombres} onChange={e => cambiar('nombres', e.target.value)} /></Campo>}
              <Campo id="registro-apellidos" label={form.identidadProvisional ? 'Referencia familiar / apellidos (opcional)' : 'Apellidos *'} error={errores.apellidos} ayuda={form.identidadProvisional ? 'Si aún no se conoce, se guardará «Por confirmar».' : undefined}><input {...atributos('apellidos')} className={inputClass} autoComplete="family-name" maxLength={LIMITES_TEXTO.apellido} value={form.apellidos} onChange={e => cambiar('apellidos', e.target.value)} /></Campo>
              <Campo id="registro-carnetIdentidad" label="CI del paciente (opcional)" error={errores.carnetIdentidad} ayuda="Déjalo vacío si no tiene documento."><input {...atributos('carnetIdentidad')} className={inputClass} maxLength={LIMITES_TEXTO.ci} value={form.carnetIdentidad} onChange={e => cambiar('carnetIdentidad', e.target.value.toUpperCase())} /></Campo>
              <Campo id="registro-fechaNacimiento" label="Fecha de nacimiento *" error={errores.fechaNacimiento}><input {...atributos('fechaNacimiento')} type="date" max={fechaLocal()} className={inputClass} value={form.fechaNacimiento} onChange={e => cambiar('fechaNacimiento', e.target.value)} />{edad && <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">Edad calculada: {edad.texto}</p>}</Campo>
              <Campo id="registro-sexo" label="Sexo *" error={errores.sexo}><select {...atributos('sexo')} className={inputClass} value={form.sexo} onChange={e => cambiar('sexo', e.target.value as 'M' | 'F')}><option value="F">Femenino</option><option value="M">Masculino</option></select></Campo>
              <Campo id="registro-departamento" label="Departamento de residencia"><select id="registro-departamento" className={inputClass} value={form.departamento} onChange={e => cambiar('departamento', e.target.value)}><option value="">Sin confirmar</option>{['Beni', 'Chuquisaca', 'Cochabamba', 'La Paz', 'Oruro', 'Pando', 'Potosí', 'Santa Cruz', 'Tarija'].map(d => <option key={d}>{d}</option>)}</select></Campo>
              <Campo id="registro-direccion" label="Dirección (opcional)"><input id="registro-direccion" maxLength={255} className={inputClass} value={form.direccion} onChange={e => cambiar('direccion', e.target.value)} /></Campo>
            </div>
            {tipo === 'adulto' && <label className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm"><input type="checkbox" className="mt-1" checked={form.esDependiente} onChange={e => { cambiar('esDependiente', e.target.checked); setContactoAlertas(e.target.checked ? 'tutor' : 'paciente'); }} /><span>Requiere tutor o responsable (adulto dependiente)</span></label>}
          </>}

          {paso === 2 && <>
            <h4 className="font-semibold">{requiereTutor ? 'Tutor y datos de contacto' : 'Contacto del paciente'}</h4>
            {tipo === 'menor' && <p className="text-sm text-muted-foreground">El menor no necesita correo ni teléfono propios. Registraremos los datos de su tutor.</p>}
            {tipo === 'adulto' && form.esDependiente && <fieldset className="space-y-2 rounded-lg border border-border p-3"><legend className="px-1 text-sm font-semibold">¿Quién recibirá los recordatorios?</legend><label className="flex items-center gap-2 text-sm"><input type="radio" name="destinatario" checked={contactoAlertas === 'tutor'} onChange={() => { setContactoAlertas('tutor'); setErrores({}); }} />El tutor o responsable</label><label className="flex items-center gap-2 text-sm"><input type="radio" name="destinatario" checked={contactoAlertas === 'paciente'} onChange={() => { setContactoAlertas('paciente'); setErrores({}); }} />El paciente, en su contacto propio</label></fieldset>}
            {requiereTutor && <section className="space-y-4 rounded-xl border border-border p-4" aria-label="Tutor o responsable obligatorio">
              <div className="flex flex-wrap gap-2"><button type="button" aria-pressed={modoTutor === 'existente'} onClick={() => { setModoTutor('existente'); setSinCorreoTutor(Boolean(tutorElegido && !tutorElegido.email && modo === 'editar')); setErrores({}); }} className={modoTutor === 'existente' ? primaryClass : buttonClass}>Buscar tutor existente</button><button type="button" aria-pressed={modoTutor === 'nuevo'} onClick={() => { setModoTutor('nuevo'); setSinCorreoTutor(false); setErrores({}); }} className={modoTutor === 'nuevo' ? primaryClass : buttonClass}>Registrar tutor nuevo</button></div>
              {modoTutor === 'existente' ? <div className="space-y-3">
                <Campo id="registro-busquedaTutor" label="Buscar tutor por nombre o CI"><input id="registro-busquedaTutor" className={inputClass} maxLength={100} value={busquedaTutor} onChange={e => { setBusquedaTutor(e.target.value); setPaginaTutor(1); }} placeholder="Nombre o documento del responsable" /></Campo>
                {cargandoTutores && <p role="status" className="text-sm text-muted-foreground">Buscando tutores...</p>}
                {errorTutores && <div role="alert" className="text-sm"><p>{errorTutores}</p><button type="button" onClick={() => setReintentoTutores(n => n + 1)} className="mt-2 underline">Reintentar búsqueda de tutores</button></div>}
                {!cargandoTutores && !errorTutores && <>
                  <ul className="space-y-2" aria-label="Resultados de tutores">{tutores.map(t => <li key={t.id}><button type="button" aria-pressed={tutorElegido?.id === t.id} className={`w-full rounded-lg border p-3 text-left text-sm ${tutorElegido?.id === t.id ? 'border-primary bg-muted' : 'border-border hover:bg-muted'}`} onClick={() => { setTutorElegido(t); setSinCorreoTutor(false); setErrores({}); }}><span className="block font-semibold">{t.nombres} {t.apellidos}</span><span className="block text-muted-foreground">CI: {t.carnet_identidad || 'Sin documento'} · Tel.: {t.telefono || 'Sin teléfono'}</span></button></li>)}</ul>
                  {!tutores.length && <p className="text-sm text-muted-foreground">No se encontraron tutores. Puedes registrar uno nuevo.</p>}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>Página {paginaTutor} de {Math.max(1, Math.ceil(totalTutores / 5))}</span><div className="flex gap-2"><button type="button" className={buttonClass} disabled={paginaTutor <= 1} onClick={() => setPaginaTutor(p => p - 1)}>Tutores anteriores</button><button type="button" className={buttonClass} disabled={paginaTutor * 5 >= totalTutores} onClick={() => setPaginaTutor(p => p + 1)}>Más tutores</button></div></div>
                </>}
                {errores.tutorId && <p role="alert" className="text-sm text-red-600">{errores.tutorId}</p>}
                {tutorElegido && <div className="space-y-2 rounded-lg border border-border bg-muted p-3 text-sm"><p className="font-semibold">Tutor seleccionado: {nombreTutor}</p><p className="break-all">Correo: {correoTutor || 'Sin correo'}</p><p>Teléfono: {telefonoTutor || 'Sin teléfono'}</p><p className="text-muted-foreground">Será el tutor principal. Para corregir sus datos compartidos, utiliza el módulo Tutores.</p>{!correoTutor && <label className="flex items-start gap-2"><input type="checkbox" className="mt-1" checked={sinCorreoTutor} onChange={e => { setSinCorreoTutor(e.target.checked); limpiarError('tutor.email'); }} /><span>El tutor no dispone de correo; guardar como prerregistro</span></label>}{errores['tutor.telefono'] && <p role="alert" className="text-red-600">{errores['tutor.telefono']}</p>}{errores['tutor.email'] && <p role="alert" className="text-red-600">{errores['tutor.email']}</p>}</div>}
              </div> : <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Campo id="registro-tutor.nombres" label="Nombres del tutor *" error={errores['tutor.nombres']}><input {...atributos('tutor.nombres')} className={inputClass} maxLength={LIMITES_TEXTO.tutor} value={tutorNuevo.nombres} onChange={e => cambiarTutor('nombres', e.target.value)} /></Campo>
                  <Campo id="registro-tutor.apellidos" label="Apellidos del tutor *" error={errores['tutor.apellidos']}><input {...atributos('tutor.apellidos')} className={inputClass} maxLength={LIMITES_TEXTO.tutor} value={tutorNuevo.apellidos} onChange={e => cambiarTutor('apellidos', e.target.value)} /></Campo>
                  <Campo id="registro-tutor.carnetIdentidad" label="CI del tutor (opcional)" error={errores['tutor.carnetIdentidad']}><input {...atributos('tutor.carnetIdentidad')} className={inputClass} maxLength={LIMITES_TEXTO.ci} value={tutorNuevo.carnetIdentidad} onChange={e => cambiarTutor('carnetIdentidad', e.target.value.toUpperCase())} /></Campo>
                  <Campo id="registro-tutor.parentesco" label="Relación con el paciente *"><select id="registro-tutor.parentesco" className={inputClass} value={tutorNuevo.parentesco} onChange={e => cambiarTutor('parentesco', e.target.value as DatosTutor['parentesco'])}><option value="madre">Madre</option><option value="padre">Padre</option><option value="tutor_legal">Tutor legal</option><option value="otro">Otro responsable</option></select></Campo>
                  <Campo id="registro-tutor.telefono" label="Teléfono o referencia del tutor *" error={errores['tutor.telefono']}><input {...atributos('tutor.telefono')} type="tel" className={inputClass} maxLength={LIMITES_TEXTO.telefono} value={tutorNuevo.telefono} onChange={e => cambiarTutor('telefono', e.target.value)} /></Campo>
                  {!sinCorreoTutor && <Campo id="registro-tutor.email" label="Correo electrónico del tutor *" error={errores['tutor.email']}><input {...atributos('tutor.email')} type="email" className={inputClass} maxLength={LIMITES_TEXTO.email} value={tutorNuevo.email} onChange={e => cambiarTutor('email', e.target.value)} /></Campo>}
                </div>
                <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={sinCorreoTutor} onChange={e => { setSinCorreoTutor(e.target.checked); limpiarError('tutor.email'); }} /><span>El tutor no dispone de correo; guardar como prerregistro</span></label>
              </div>}
            </section>}
            {!destinatarioTutor && <section className="space-y-4" aria-label="Contacto propio del paciente"><div className="grid gap-4 sm:grid-cols-2">
              <Campo id="registro-telefonoContacto" label="Teléfono o referencia del paciente *" error={errores.telefonoContacto}><input {...atributos('telefonoContacto')} type="tel" className={inputClass} maxLength={LIMITES_TEXTO.telefono} value={form.telefonoContacto} onChange={e => cambiar('telefonoContacto', e.target.value)} /></Campo>
              {!sinCorreoPaciente && <Campo id="registro-email" label="Correo electrónico del paciente *" error={errores.email}><input {...atributos('email')} type="email" className={inputClass} maxLength={LIMITES_TEXTO.email} value={form.email} onChange={e => cambiar('email', e.target.value)} /></Campo>}
            </div><label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={sinCorreoPaciente} onChange={e => { setSinCorreoPaciente(e.target.checked); limpiarError('email'); }} /><span>El paciente no dispone de correo; guardar como prerregistro</span></label></section>}
            {(sinCorreoTutor && requiereTutor || sinCorreoPaciente && !destinatarioTutor) && <p role="status" className="rounded-lg border border-border bg-muted p-3 text-sm">El registro quedará pendiente de completar. No se habilitarán alertas por correo para este paciente.</p>}
          </>}

          {paso === 3 && <>
            <h4 className="font-semibold">Revisa los datos antes de guardar</h4>
            <dl className="grid gap-4 rounded-xl border border-border bg-muted p-4 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Paciente</dt><dd className="mt-1 font-semibold">{nombrePaciente}</dd></div><div><dt className="text-muted-foreground">Código interno</dt><dd className="mt-1">{paciente?.codigo_paciente || 'Se asignará al guardar'}</dd></div><div><dt className="text-muted-foreground">Fecha de nacimiento y edad</dt><dd className="mt-1">{form.fechaNacimiento} · {edad?.texto}</dd></div><div><dt className="text-muted-foreground">Documento</dt><dd className="mt-1">{form.carnetIdentidad || 'Sin documento'}</dd></div><div><dt className="text-muted-foreground">Sexo</dt><dd className="mt-1">{form.sexo === 'F' ? 'Femenino' : 'Masculino'}</dd></div><div><dt className="text-muted-foreground">Tipo de registro</dt><dd className="mt-1">{tipo === 'menor' ? 'Menor con tutor' : form.esDependiente ? 'Adulto dependiente' : 'Adulto independiente'}</dd></div>{requiereTutor && <div className="sm:col-span-2"><dt className="text-muted-foreground">Tutor principal</dt><dd className="mt-1">{nombreTutor}</dd></div>}</dl>
            <div className="space-y-2 rounded-xl border border-border p-4 text-sm"><h5 className="font-semibold">Contacto para los recordatorios</h5><p>{destinatarioTutor ? 'Tutor o responsable' : 'Paciente'}: {contacto.nombre}</p><p className="break-all">Correo: {contacto.email || 'Pendiente de completar'}</p><p>Teléfono: {contacto.telefono}</p><p className="text-muted-foreground">Guardar el registro no envía mensajes ni activa el servicio de correo.</p></div>
            {pendiente && <div role="status" className="rounded-lg border border-border bg-muted p-3 text-sm"><p className="font-semibold">Se guardará como prerregistro pendiente.</p>{form.identidadProvisional && <p>Identidad provisional: falta confirmar el nombre del recién nacido.</p>}{!contacto.email.trim() && <p>Falta el correo del contacto principal.</p>}{requiereTutor && !correoTutor.trim() && !destinatarioTutor && <p>Falta el correo del tutor.</p>}<p>Podrás completar los datos después desde Editar Información.</p></div>}
            <label className="flex items-start gap-3 text-sm"><input {...atributos('confirmado')} type="checkbox" className="mt-1" checked={confirmado} onChange={e => { setConfirmado(e.target.checked); setErrores(prev => ({ ...prev, confirmado: '' })); }} /><span>Confirmé los datos del paciente y el contacto para sus recordatorios.</span></label>{errores.confirmado && <p id="registro-confirmado-error" role="alert" className="text-sm text-red-600">{errores.confirmado}</p>}
          </>}
        </fieldset>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
          <button type="button" disabled={guardando} onClick={() => { if (paso > 1) { setPaso(p => p - 1); setConfirmado(false); setErrorMsg(''); } else onClose(); }} className={`${buttonClass} flex items-center gap-1`}>{paso > 1 && <ChevronLeft className="h-4 w-4" />}{paso > 1 ? 'Anterior' : 'Cancelar'}</button>
          <button type="submit" disabled={guardando} className={`${primaryClass} flex items-center gap-1`}>{guardando ? 'Guardando...' : paso < 3 ? 'Continuar' : pendiente ? 'Guardar prerregistro' : 'Guardar paciente'}{paso < 3 && <ChevronRight className="h-4 w-4" />}</button>
        </div>
      </form>}
    </div>
  </div>;
}
