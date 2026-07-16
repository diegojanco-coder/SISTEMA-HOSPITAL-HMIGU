import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const ITEMS = [
  { to: '/', label: 'Dashboard', icon: '🏠', roles: ['administrador', 'enfermero'] },
  { to: '/pacientes', label: 'Pacientes', icon: '🧒', roles: ['administrador', 'enfermero'] },
  { to: '/tutores', label: 'Tutores', icon: '👪', roles: ['administrador', 'enfermero'] },
  { to: '/vacunas', label: 'Vacunas', icon: '💉', roles: ['administrador', 'enfermero'] },
  { to: '/historial', label: 'Historial', icon: '📋', roles: ['administrador', 'enfermero'] },
  { to: '/alertas', label: 'Alertas', icon: '🔔', roles: ['administrador', 'enfermero'] },
  { to: '/reportes', label: 'Reportes', icon: '📊', roles: ['administrador', 'enfermero'] },
  { to: '/usuarios', label: 'Usuarios', icon: '👤', roles: ['administrador'] },
  { to: '/auditoria', label: 'Auditoría', icon: '🗂️', roles: ['administrador'] },
  { to: '/perfil', label: 'Perfil', icon: '⚙️', roles: ['administrador', 'enfermero'] }
];

export default function Sidebar({ abierto, onClose }) {
  const { usuario } = useAuth();

  return (
    <>
      {abierto && <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={onClose} />}
      <aside
        className={`fixed md:static z-40 top-0 left-0 h-full w-64 bg-hospital-azulOscuro text-white flex flex-col
          transition-transform duration-200 ${abierto ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        <div className="px-5 py-5 border-b border-white/10">
          <p className="font-semibold leading-tight">Sistema de Vacunación</p>
          <p className="text-xs text-hospital-celeste">Hospital Materno G. Urquidi</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {ITEMS.filter((item) => item.roles.includes(usuario?.rol)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                  isActive ? 'bg-hospital-azul text-white' : 'text-slate-200 hover:bg-white/10'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
