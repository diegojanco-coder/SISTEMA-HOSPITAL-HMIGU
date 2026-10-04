import { useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowRight, BellRing, Boxes, CalendarCheck2,
  CheckCircle2, Clock3, RefreshCw, ShieldCheck, Syringe, Users,
} from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { listarPacientes } from '../../../services/pacientes.service';
import { listarAlertas, resumenAlertas } from '../../../services/alertas.service';
import { obtenerReporte } from '../../../services/reportes.service';
import type { Alerta } from '../../../lib/types';

interface Props { onNavigate: (seccion: string) => void }
interface ActividadDia { fecha: string; etiqueta: string; total: number }

function fechaLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function DashboardHome({ onNavigate }: Props) {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'administrador';
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [recarga, setRecarga] = useState(0);
  const [totalPacientes, setTotalPacientes] = useState(0);
  const [vacunasMes, setVacunasMes] = useState(0);
  const [atrasadas, setAtrasadas] = useState(0);
  const [proximas, setProximas] = useState(0);
  const [cobertura, setCobertura] = useState('Sin datos');
  const [alertasRecientes, setAlertasRecientes] = useState<Alerta[]>([]);
  const [actividad, setActividad] = useState<ActividadDia[]>([]);

  useEffect(() => {
    let activo = true;
    (async () => {
      setCargando(true); setError('');
      try {
        const hoy = new Date();
        const inicioMes = fechaLocal(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
        const hoyStr = fechaLocal(hoy);
        const [pacientes, resumen, aplicadasMes, cob, alertas] = await Promise.all([
          listarPacientes({ page: 1, limit: 1 }),
          resumenAlertas(),
          esAdmin ? obtenerReporte('vacunas-aplicadas', { desde: inicioMes, hasta: hoyStr }) : Promise.resolve({ filas: [] }),
          esAdmin ? obtenerReporte('cobertura-vacunacion') : Promise.resolve({ filas: [] }),
          listarAlertas({ page: 1, limit: 6 }),
        ]);
        if (!activo) return;
        const mapa = Object.fromEntries(resumen.map(r => [r.estado_semaforo, Number(r.total || 0)]));
        setTotalPacientes(pacientes.total);
        setVacunasMes(aplicadasMes.filas.length);
        setAtrasadas(mapa.rojo || 0);
        setProximas(mapa.amarillo || 0);
        const filasCobertura = cob.filas as { esperadas: number; aplicadas: number }[];
        const esperadas = filasCobertura.reduce((n, f) => n + Number(f.esperadas || 0), 0);
        const aplicadas = filasCobertura.reduce((n, f) => n + Number(f.aplicadas || 0), 0);
        setCobertura(esperadas ? `${(100 * aplicadas / esperadas).toFixed(1)}%` : 'Sin datos');
        setAlertasRecientes(alertas.slice(0, 6));

        const conteo = new Map<string, number>();
        for (const fila of aplicadasMes.filas) {
          const fecha = String(fila.fecha_aplicacion || '').slice(0, 10);
          conteo.set(fecha, (conteo.get(fecha) || 0) + 1);
        }
        const dias: ActividadDia[] = [];
        for (let i = 6; i >= 0; i -= 1) {
          const d = new Date(hoy); d.setDate(hoy.getDate() - i);
          const fecha = fechaLocal(d);
          dias.push({ fecha, etiqueta: new Intl.DateTimeFormat('es-BO', { weekday: 'short' }).format(d).replace('.', ''), total: conteo.get(fecha) || 0 });
        }
        setActividad(dias);
      } catch { if (activo) setError('No se pudo cargar el resumen operativo.'); }
      finally { if (activo) setCargando(false); }
    })();
    return () => { activo = false; };
  }, [esAdmin, recarga]);

  const fecha = new Intl.DateTimeFormat('es-BO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date());
  const maxActividad = Math.max(...actividad.map(d => d.total), 1);
  const pendientes = atrasadas + proximas;
  const stats = [
    { label: 'Pacientes registrados', value: cargando ? '—' : totalPacientes, note: 'Fichas activas en el sistema', icon: Users, tone: 'teal' },
    { label: 'Dosis registradas este mes', value: cargando ? '—' : esAdmin ? vacunasMes : 'Restringido', note: esAdmin ? 'Aplicaciones confirmadas' : 'Solo administración', icon: Syringe, tone: 'green' },
    { label: 'Dosis próximas', value: cargando ? '—' : proximas, note: 'Pendientes sin atraso', icon: Clock3, tone: 'blue' },
    { label: 'Pacientes con atrasos', value: cargando ? '—' : atrasadas, note: 'Requieren seguimiento', icon: AlertTriangle, tone: 'amber' },
  ];

  const coberturaNumero = useMemo(() => Number.parseFloat(cobertura) || 0, [cobertura]);

  return <div className="space-y-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="clinical-kicker mb-2">{fecha}</p><h3 className="text-3xl font-extrabold text-foreground">Buen día, {usuario?.nombre.split(' ')[0]}</h3><p className="mt-1 text-sm text-muted-foreground">Un espacio para cuidar, registrar y dar seguimiento a cada dosis.</p></div>
      <button onClick={() => onNavigate('pacientes')} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-sm hover:opacity-90 sm:w-auto"><CalendarCheck2 className="h-4 w-4"/>Registrar atención</button>
    </div>

    {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><span>{error}</span><button onClick={() => setRecarga(n => n + 1)} className="flex items-center gap-1 font-bold"><RefreshCw className="h-4 w-4"/>Reintentar</button></div>}

    <section className="care-banner">
      <div className="relative z-10 max-w-2xl"><p className="mb-2 text-[10px] font-extrabold uppercase tracking-[.14em] text-teal-300">Continuidad del cuidado</p><h4 className="text-xl font-bold text-white sm:text-2xl">Cada dosis cuenta. Cada registro, también.</h4><p className="mt-2 text-sm text-slate-300">Las alertas ayudan a priorizar el seguimiento sin interrumpir la continuidad del esquema de vacunación.</p></div>
      <div className="care-shield hidden sm:grid"><ShieldCheck className="h-7 w-7"/></div>
    </section>

    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {stats.map(stat => { const Icon = stat.icon; return <article key={stat.label} className={`reference-stat reference-stat--${stat.tone}`}>
        <div className="flex items-start justify-between gap-3"><span className="reference-stat-icon"><Icon className="h-[18px] w-[18px]"/></span><span className="reference-stat-live">En vivo</span></div><p className="mt-3 text-xs font-semibold text-muted-foreground">{stat.label}</p><p className="mt-1 text-3xl font-extrabold text-foreground">{stat.value}</p><p className="mt-1.5 text-[10px] text-muted-foreground">{stat.note}</p>
      </article>; })}
    </div>

    <div className="grid gap-4 xl:grid-cols-[1.6fr_.72fr]">
      <section className="clinical-panel p-5 sm:p-6">
        <div className="mb-5 flex items-start justify-between"><div><h4 className="text-base font-bold text-foreground">Actividad de vacunación</h4><p className="text-xs text-muted-foreground">Dosis registradas durante los últimos 7 días</p></div>{esAdmin && <span className="clinical-badge bg-secondary text-secondary-foreground">Este mes: {vacunasMes}</span>}</div>
        {!esAdmin ? <div className="clinical-empty py-10"><Activity className="mx-auto mb-2 h-7 w-7"/><p className="text-sm">La actividad detallada está disponible para administración.</p></div> :
        <div className="flex h-52 items-end gap-2 border-b border-border pt-7 sm:gap-4">{actividad.map((dia, i) => <div key={dia.fecha} className="flex h-full min-w-0 flex-1 flex-col justify-end text-center"><span className="mb-1 text-[10px] font-bold text-muted-foreground">{dia.total}</span><div className={`mx-auto w-full max-w-14 rounded-t-md ${i === actividad.length - 1 ? 'bg-primary' : 'bg-primary/20'}`} style={{ height: `${Math.max((dia.total / maxActividad) * 82, 5)}%` }}/><span className="mt-2 text-[10px] capitalize text-muted-foreground">{dia.etiqueta}</span></div>)}</div>}
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground"><span>{esAdmin ? `${vacunasMes} dosis registradas en el mes` : 'Información protegida por rol'}</span><button onClick={() => onNavigate('reportes')} disabled={!esAdmin} className="flex items-center gap-1 font-bold text-primary disabled:opacity-40">Ver reporte<ArrowRight className="h-3 w-3"/></button></div>
      </section>

      <section className="clinical-panel p-5 sm:p-6"><div className="mb-4 flex items-center justify-between"><div><h4 className="text-base font-bold text-foreground">Control operativo</h4><p className="text-xs text-muted-foreground">Estado general del sistema</p></div><Boxes className="h-5 w-5 text-primary"/></div>
        <div className="space-y-4">
          <div><div className="mb-2 flex justify-between text-xs"><span className="font-semibold text-foreground">Cobertura registrada</span><strong className="text-primary">{esAdmin ? cobertura : 'Restringido'}</strong></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: esAdmin ? `${Math.min(coberturaNumero, 100)}%` : '0%' }}/></div></div>
          <div className="rounded-xl bg-muted p-3"><div className="flex items-center gap-2"><BellRing className="h-4 w-4 text-amber-600"/><p className="text-xs font-bold text-foreground">Seguimiento pendiente</p></div><p className="mt-1 text-2xl font-extrabold text-foreground">{cargando ? '—' : pendientes}</p><p className="text-[11px] text-muted-foreground">Alertas próximas y atrasadas</p></div>
          <button onClick={() => onNavigate(esAdmin ? 'configuracion' : 'vacunacion')} className="flex w-full items-center justify-between rounded-xl border border-border px-3 py-2.5 text-left text-xs font-bold text-primary hover:bg-muted"><span>{esAdmin ? 'Revisar vacunas y lotes' : 'Consultar calendario'}</span><ArrowRight className="h-4 w-4"/></button>
        </div>
      </section>
    </div>

    <div className="grid gap-4 xl:grid-cols-[1.6fr_.72fr]">
      <section className="clinical-panel overflow-hidden"><div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6"><div><h4 className="text-base font-bold text-foreground">Prioridades de seguimiento</h4><p className="text-xs text-muted-foreground">Pacientes con avisos recientes</p></div><button onClick={() => onNavigate('alertas')} className="flex items-center gap-1 text-xs font-bold text-primary">Ver todas<ArrowRight className="h-3 w-3"/></button></div>
        <div className="p-3">{cargando && <div className="h-32 animate-pulse rounded-xl bg-muted"/>}{!cargando && !alertasRecientes.length && <div className="clinical-empty"><CheckCircle2 className="mx-auto mb-2 h-7 w-7 text-green-600"/><p className="text-sm font-bold text-foreground">Sin prioridades pendientes</p></div>}{!cargando && alertasRecientes.map(a => { const urgente = a.estado_semaforo === 'rojo'; return <button key={a.id} onClick={() => onNavigate('alertas')} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-muted"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-extrabold ${urgente ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'}`}>{a.nombres?.charAt(0)}{a.apellidos?.charAt(0)}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-foreground">{a.nombres} {a.apellidos}</span><span className="block truncate text-[11px] text-muted-foreground">{a.vacuna_nombre} · {a.nombre_dosis}</span></span><span className={`text-[10px] font-bold ${urgente ? 'text-red-600' : 'text-amber-600'}`}>{urgente ? 'Atrasada' : 'Próxima'}</span></button>; })}</div>
      </section>

      <section className="clinical-panel p-5 sm:p-6"><h4 className="text-base font-bold text-foreground">Accesos rápidos</h4><p className="mb-3 text-xs text-muted-foreground">Operaciones frecuentes</p>{[
        { label: 'Pacientes', note: 'Buscar o crear ficha', icon: Users, target: 'pacientes' },
        { label: 'Vacunación', note: 'Consultar esquema PAI', icon: Syringe, target: 'vacunacion' },
        { label: 'Alertas', note: 'Revisar pendientes', icon: BellRing, target: 'alertas' },
      ].map(item => { const Icon = item.icon; return <button key={item.label} onClick={() => onNavigate(item.target)} className="group flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-muted"><span className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-primary"><Icon className="h-4 w-4"/></span><span className="min-w-0 flex-1"><span className="block text-xs font-bold text-foreground">{item.label}</span><span className="block text-[10px] text-muted-foreground">{item.note}</span></span><ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary"/></button>; })}</section>
    </div>
  </div>;
}
