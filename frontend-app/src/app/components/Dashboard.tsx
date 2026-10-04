import { useState } from 'react';
import {
  Users, Syringe, Bell, FileText, LayoutDashboard, Settings, LogOut, Plus,
  Menu, X, UserSquare2, History, IdCard, ChevronRight, ShieldCheck, Search, CalendarDays,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import DashboardHome from './dashboard/DashboardHome';
import Pacientes from './dashboard/Pacientes';
import Tutores from './dashboard/Tutores';
import Vacunacion from './dashboard/Vacunacion';
import Alertas from './dashboard/Alertas';
import Reportes from './dashboard/Reportes';
import HistorialGlobal from './dashboard/Historial';
import CarnetDigital from './dashboard/CarnetDigital';
import Configuracion from './dashboard/Configuracion';

const MENU_GROUPS = [
  { label: 'Atención', items: [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard, roles: ['administrador', 'enfermero'] },
    { id: 'pacientes', label: 'Pacientes', icon: Users, roles: ['administrador', 'enfermero'] },
    { id: 'tutores', label: 'Tutores', icon: UserSquare2, roles: ['administrador', 'enfermero'] },
    { id: 'vacunacion', label: 'Vacunación', icon: Syringe, roles: ['administrador', 'enfermero'] },
    { id: 'historial', label: 'Historial', icon: History, roles: ['administrador', 'enfermero'] },
  ]},
  { label: 'Seguimiento', items: [
    { id: 'alertas', label: 'Alertas', icon: Bell, roles: ['administrador', 'enfermero'] },
    { id: 'carnet', label: 'Carnet digital', icon: IdCard, roles: ['administrador', 'enfermero'] },
    { id: 'reportes', label: 'Reportes', icon: FileText, roles: ['administrador'] },
  ]},
  { label: 'Sistema', items: [
    { id: 'configuracion', label: 'Configuración', icon: Settings, roles: ['administrador'] },
  ]},
];

const PAGE_META: Record<string, { title: string; description: string }> = {
  dashboard: { title: 'Panel de inicio', description: 'Estado general de vacunación y tareas prioritarias' },
  pacientes: { title: 'Pacientes', description: 'Registro, búsqueda y seguimiento clínico' },
  tutores: { title: 'Tutores', description: 'Responsables y datos de contacto' },
  vacunacion: { title: 'Calendario de vacunación', description: 'Esquema PAI, campañas y reglas configuradas' },
  historial: { title: 'Historial de vacunación', description: 'Consulta de aplicaciones registradas' },
  alertas: { title: 'Alertas y seguimiento', description: 'Dosis atrasadas, próximas y recomendaciones' },
  carnet: { title: 'Carnet digital', description: 'Consulta y emisión de constancias' },
  reportes: { title: 'Reportes', description: 'Indicadores para la gestión hospitalaria' },
  configuracion: { title: 'Configuración', description: 'Usuarios, inventario y parámetros del sistema' },
};

export default function Dashboard() {
  const { usuario, logout } = useAuth();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  if (!usuario) return null;

  const groups = MENU_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => item.roles.includes(usuario.rol)),
  })).filter(group => group.items.length);
  const meta = PAGE_META[activeSection] || PAGE_META.dashboard;
  const navigate = (id: string) => { setActiveSection(id); setIsSidebarOpen(false); };

  return (
    <div className="clinical-shell">
      <aside className={`clinical-sidebar fixed lg:sticky lg:top-0 inset-y-0 left-0 z-50 w-[252px] border-r border-border transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex h-full flex-col">
          <div className="border-b border-border px-4 pb-4 pt-5">
            <div className="flex items-center gap-3">
              <div className="clinical-logo-mark grid h-11 w-11 shrink-0 place-items-center rounded-[13px]"><ShieldCheck className="h-6 w-6" strokeWidth={2}/></div>
              <div className="min-w-0">
                <h1 className="text-base font-extrabold leading-none text-foreground">HMIGU</h1>
                <p className="mt-1 text-[8px] font-bold uppercase tracking-[.13em] text-cyan-300">Vacunación digital</p>
              </div>
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">Hospital Materno Infantil<br/>Germán Urquidi · Cochabamba</p>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Navegación principal">
            {groups.map(group => (
              <div key={group.label} className="mb-5">
                <p className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-[.13em] text-muted-foreground">{group.label}</p>
                <ul className="space-y-1">
                  {group.items.map(item => {
                    const Icon = item.icon;
                    const active = activeSection === item.id;
                    return <li key={item.id}><button onClick={() => navigate(item.id)} data-active={active} aria-current={active ? 'page' : undefined} className="clinical-nav-item flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors">
                      <Icon className="h-[19px] w-[19px] shrink-0"/><span className="flex-1 text-left">{item.label}</span>{active && <ChevronRight className="h-4 w-4"/>}
                    </button></li>;
                  })}
                </ul>
              </div>
            ))}
          </nav>

          <div className="border-t border-border p-3">
            <div className="mb-3 flex items-center gap-3 rounded-xl border border-cyan-300/20 bg-cyan-300/5 p-3">
              <span className="clinical-status-dot" aria-hidden="true"/>
              <div><p className="text-[10px] font-bold text-white">Prototipo académico</p><p className="mt-0.5 text-[9px] text-muted-foreground">Entorno de demostración</p></div>
            </div>
            <div className="clinical-sidebar-user">
              <span>{usuario.nombre.split(' ').map(p => p.charAt(0)).slice(0,2).join('').toUpperCase()}</span>
              <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-bold text-white">{usuario.nombre}</p><p className="mt-0.5 truncate text-[9px] capitalize text-muted-foreground">{usuario.rol === 'administrador' ? 'Administrador' : 'Personal de enfermería'}</p></div>
              <button onClick={() => logout()} aria-label="Cerrar sesión" title="Cerrar sesión" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"><LogOut className="h-4 w-4"/></button>
            </div>
          </div>
        </div>
      </aside>

      {isSidebarOpen && <button aria-label="Cerrar menú" className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[2px] lg:hidden" onClick={() => setIsSidebarOpen(false)}/>}

      <main className="min-w-0 flex-1">
        <header className="clinical-header sticky top-0 z-30 border-b border-border px-4 py-2 sm:px-6 lg:px-7">
          <div className="mx-auto flex max-w-[1560px] items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button aria-label="Abrir menú" aria-expanded={isSidebarOpen} onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-card lg:hidden">{isSidebarOpen ? <X className="h-5 w-5"/> : <Menu className="h-5 w-5"/>}</button>
              <div className="hidden min-w-0 lg:block"><p className="truncate text-xs font-semibold text-muted-foreground">{meta.title}</p></div>
            </div>
            <label className="clinical-global-search">
              <Search className="h-4 w-4 shrink-0"/>
              <input aria-label="Buscar pacientes" placeholder="Buscar paciente, carnet o vacuna..." onFocus={() => navigate('pacientes')}/>
              <kbd className="hidden xl:inline-flex">Ctrl K</kbd>
            </label>
            <div className="flex items-center gap-2">
              <span className="clinical-date-chip hidden md:inline-flex"><CalendarDays className="h-4 w-4"/>{new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date())}</span>
              <button onClick={() => navigate('alertas')} aria-label="Abrir alertas" className="clinical-header-icon"><Bell className="h-[18px] w-[18px]"/><span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white ring-2 ring-card">!</span></button>
              <div className="ml-1 flex items-center gap-2 border-l border-border pl-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-[10px] font-extrabold text-primary">{usuario.nombre.split(' ').map(p => p.charAt(0)).slice(0,2).join('').toUpperCase()}</div>
                <div className="hidden min-w-0 md:block"><p className="max-w-40 truncate text-[11px] font-bold text-foreground">{usuario.nombre}</p><p className="text-[9px] capitalize text-muted-foreground">{usuario.rol === 'administrador' ? 'Administrador' : 'Enfermería · Vacunatorio'}</p></div>
              </div>
            </div>
          </div>
        </header>

        <div className="clinical-content p-4 pb-24 sm:p-6 sm:pb-24 lg:p-7">
          {activeSection === 'dashboard' && <DashboardHome onNavigate={navigate}/>}
          {activeSection === 'pacientes' && <Pacientes/>}
          {activeSection === 'tutores' && <Tutores/>}
          {activeSection === 'vacunacion' && <Vacunacion/>}
          {activeSection === 'historial' && <HistorialGlobal/>}
          {activeSection === 'alertas' && <Alertas/>}
          {activeSection === 'carnet' && <CarnetDigital/>}
          {activeSection === 'reportes' && <Reportes onNavigate={navigate}/>}
          {activeSection === 'configuracion' && usuario.rol === 'administrador' && <Configuracion/>}
        </div>

        <nav className="clinical-mobile-nav lg:hidden" aria-label="Navegación móvil">
          {[
            { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
            { id: 'pacientes', label: 'Pacientes', icon: Users },
            { id: 'vacunacion', label: 'Vacunas', icon: Syringe },
            { id: 'alertas', label: 'Alertas', icon: Bell },
          ].map(item => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return <button key={item.id} onClick={() => navigate(item.id)} data-active={active} aria-current={active ? 'page' : undefined}>
              <Icon className="h-[18px] w-[18px]"/>
              <span>{item.label}</span>
            </button>;
          })}
          <button onClick={() => setIsSidebarOpen(true)} aria-label="Abrir todas las secciones">
            <Menu className="h-[18px] w-[18px]"/>
            <span>Más</span>
          </button>
        </nav>
      </main>
    </div>
  );
}
