import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card.jsx';
import { listarPacientes } from '../services/pacientes.service';
import { listarUsuarios } from '../services/usuarios.service';
import { resumenAlertas } from '../services/alertas.service';

export default function DashboardAdmin() {
  const [stats, setStats] = useState({ pacientes: 0, usuarios: 0, verde: 0, amarillo: 0, rojo: 0 });
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [pac, usr, alertas] = await Promise.all([
          listarPacientes({ page: 1, limit: 1 }),
          listarUsuarios(),
          resumenAlertas()
        ]);
        const mapaAlertas = Object.fromEntries(alertas.map((a) => [a.estado_semaforo, a.total]));
        setStats({
          pacientes: pac.total,
          usuarios: usr.length,
          verde: mapaAlertas.verde || 0,
          amarillo: mapaAlertas.amarillo || 0,
          rojo: mapaAlertas.rojo || 0
        });
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  const tarjetas = [
    { label: 'Pacientes registrados', valor: stats.pacientes, color: 'text-hospital-azul', to: '/pacientes' },
    { label: 'Usuarios del sistema', valor: stats.usuarios, color: 'text-hospital-azul', to: '/usuarios' },
    { label: 'Vacunación al día', valor: stats.verde, color: 'text-green-600', to: '/alertas' },
    { label: 'Próximas / pendientes', valor: stats.amarillo, color: 'text-amber-600', to: '/alertas' },
    { label: 'Atrasadas', valor: stats.rojo, color: 'text-red-600', to: '/alertas' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-hospital-azulOscuro">Panel del Administrador</h1>
        <p className="text-slate-500">Resumen general del sistema de vacunación.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {tarjetas.map((t) => (
          <Link key={t.label} to={t.to}>
            <Card className="hover:shadow-md transition-shadow">
              <p className="text-sm text-slate-500">{t.label}</p>
              <p className={`text-3xl font-bold mt-1 ${t.color}`}>{cargando ? '...' : t.valor}</p>
            </Card>
          </Link>
        ))}
      </div>

      <Card title="Accesos rápidos">
        <div className="flex flex-wrap gap-3">
          <Link to="/pacientes" className="text-sm px-4 py-2 rounded-lg bg-hospital-celesteClaro text-hospital-azul hover:bg-hospital-celeste hover:text-white">Registrar paciente</Link>
          <Link to="/vacunas" className="text-sm px-4 py-2 rounded-lg bg-hospital-celesteClaro text-hospital-azul hover:bg-hospital-celeste hover:text-white">Gestionar catálogo de vacunas</Link>
          <Link to="/reportes" className="text-sm px-4 py-2 rounded-lg bg-hospital-celesteClaro text-hospital-azul hover:bg-hospital-celeste hover:text-white">Generar reportes</Link>
          <Link to="/auditoria" className="text-sm px-4 py-2 rounded-lg bg-hospital-celesteClaro text-hospital-azul hover:bg-hospital-celeste hover:text-white">Ver auditoría</Link>
        </div>
      </Card>
    </div>
  );
}
