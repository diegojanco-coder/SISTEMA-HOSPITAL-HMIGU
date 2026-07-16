import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Navbar({ onToggleSidebar }) {
  const { usuario, cerrarSesion } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    const confirmacion = await Swal.fire({
      title: '¿Cerrar sesión?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, salir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0b5394'
    });
    if (confirmacion.isConfirmed) {
      await cerrarSesion();
      navigate('/login');
    }
  }

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 md:px-6">
      <button className="md:hidden text-2xl text-hospital-azul" onClick={onToggleSidebar}>☰</button>
      <div className="hidden md:block" />
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-slate-700">{usuario?.nombre_completo || usuario?.nombre}</p>
          <p className="text-xs text-slate-400 capitalize">{usuario?.rol}</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-hospital-azul text-white flex items-center justify-center font-semibold">
          {(usuario?.nombre_completo || usuario?.nombre || '?').charAt(0).toUpperCase()}
        </div>
        <button onClick={handleLogout} className="text-sm text-hospital-rojo hover:underline">Salir</button>
      </div>
    </header>
  );
}
