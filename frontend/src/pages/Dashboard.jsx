import { useAuth } from '../context/AuthContext.jsx';
import DashboardAdmin from './DashboardAdmin.jsx';
import DashboardEnfermero from './DashboardEnfermero.jsx';

export default function Dashboard() {
  const { esAdmin } = useAuth();
  return esAdmin ? <DashboardAdmin /> : <DashboardEnfermero />;
}
