import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Protege rutas que requieren sesión iniciada. Si se pasa `rolesPermitidos`,
 * además valida que el usuario tenga uno de esos roles (autorización).
 */
export default function ProtectedRoute({ rolesPermitidos }) {
  const { autenticado, usuario, cargando } = useAuth();

  if (cargando) return null;
  if (!autenticado) return <Navigate to="/login" replace />;
  if (rolesPermitidos && !rolesPermitidos.includes(usuario.rol)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
