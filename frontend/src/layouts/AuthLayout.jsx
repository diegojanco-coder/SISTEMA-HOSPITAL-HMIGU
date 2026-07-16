import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-hospital-azulOscuro to-hospital-celeste px-4">
      <Outlet />
    </div>
  );
}
