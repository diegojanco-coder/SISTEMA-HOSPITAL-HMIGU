import { useState } from 'react';
import {
  Users,
  Syringe,
  Bell,
  FileText,
  LayoutDashboard,
  Settings,
  LogOut,
  Plus,
  Menu,
  X,
  Search,
  UserSquare2,
  History,
  IdCard,
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

const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['administrador', 'enfermero'] },
  { id: 'pacientes', label: 'Pacientes', icon: Users, roles: ['administrador', 'enfermero'] },
  { id: 'tutores', label: 'Tutores', icon: UserSquare2, roles: ['administrador', 'enfermero'] },
  { id: 'vacunacion', label: 'Vacunación', icon: Syringe, roles: ['administrador', 'enfermero'] },
  { id: 'historial', label: 'Historial', icon: History, roles: ['administrador', 'enfermero'] },
  { id: 'alertas', label: 'Alertas', icon: Bell, roles: ['administrador', 'enfermero'] },
  { id: 'carnet', label: 'Carnet Digital', icon: IdCard, roles: ['administrador', 'enfermero'] },
  { id: 'reportes', label: 'Reportes', icon: FileText, roles: ['administrador', 'enfermero'] },
  { id: 'configuracion', label: 'Configuración', icon: Settings, roles: ['administrador'] },
];

export default function Dashboard() {
  const { usuario, logout } = useAuth();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!usuario) return null;

  const visibleMenuItems = MENU_ITEMS.filter((item) => item.roles.includes(usuario.rol));

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 transform transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                <Plus className="w-6 h-6 text-white" strokeWidth={3} />
              </div>
              <div>
                <h1 className="text-gray-900 font-bold text-sm leading-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Hospital Materno
                  <br />
                  Germán Urquidi
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                {usuario.nombre.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {usuario.nombre}
                </p>
                <p className="text-xs text-gray-500 capitalize" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {usuario.rol === 'administrador' ? 'Administrador' : 'Enfermería'}
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-1">
              {visibleMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        setActiveSection(item.id);
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="p-4 border-t border-gray-200">
            <button
              onClick={() => logout()}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-all"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </aside>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  {visibleMenuItems.find((item) => item.id === activeSection)?.label || 'Dashboard'}
                </h2>
                <p className="text-sm text-gray-500" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  Sistema de Control de Vacunación
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative hidden md:block">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar paciente..."
                  onFocus={() => setActiveSection('pacientes')}
                  className="pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none"
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.9rem' }}
                />
              </div>
              <button
                onClick={() => setActiveSection('alertas')}
                className="p-2 rounded-lg hover:bg-gray-100 relative"
              >
                <Bell className="w-6 h-6 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 overflow-y-auto">
          {activeSection === 'dashboard' && <DashboardHome onNavigate={setActiveSection} />}
          {activeSection === 'pacientes' && <Pacientes />}
          {activeSection === 'tutores' && <Tutores />}
          {activeSection === 'vacunacion' && <Vacunacion />}
          {activeSection === 'historial' && <HistorialGlobal />}
          {activeSection === 'alertas' && <Alertas />}
          {activeSection === 'carnet' && <CarnetDigital />}
          {activeSection === 'reportes' && <Reportes onNavigate={setActiveSection} />}
          {activeSection === 'configuracion' && usuario.rol === 'administrador' && <Configuracion />}
        </div>
      </main>
    </div>
  );
}
