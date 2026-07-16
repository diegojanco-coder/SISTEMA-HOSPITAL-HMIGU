import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import MainLayout from '../layouts/MainLayout.jsx';
import AuthLayout from '../layouts/AuthLayout.jsx';

import Login from '../pages/Login.jsx';
import Dashboard from '../pages/Dashboard.jsx';
import Usuarios from '../pages/Usuarios.jsx';
import Pacientes from '../pages/Pacientes.jsx';
import PacienteDetalle from '../pages/PacienteDetalle.jsx';
import Tutores from '../pages/Tutores.jsx';
import Historial from '../pages/Historial.jsx';
import Vacunas from '../pages/Vacunas.jsx';
import Alertas from '../pages/Alertas.jsx';
import Reportes from '../pages/Reportes.jsx';
import Auditoria from '../pages/Auditoria.jsx';
import Perfil from '../pages/Perfil.jsx';
import NotFound from '../pages/NotFound.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pacientes" element={<Pacientes />} />
          <Route path="/pacientes/:id" element={<PacienteDetalle />} />
          <Route path="/tutores" element={<Tutores />} />
          <Route path="/historial" element={<Historial />} />
          <Route path="/vacunas" element={<Vacunas />} />
          <Route path="/alertas" element={<Alertas />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/perfil" element={<Perfil />} />

          <Route element={<ProtectedRoute rolesPermitidos={['administrador']} />}>
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/auditoria" element={<Auditoria />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
      <Route path="/404" element={<Navigate to="/" />} />
    </Routes>
  );
}
