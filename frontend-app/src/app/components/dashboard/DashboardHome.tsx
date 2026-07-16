import { useEffect, useState } from 'react';
import { Users, Syringe, AlertCircle, FileText } from 'lucide-react';
import { listarPacientes } from '../../../services/pacientes.service';
import { listarAlertas, resumenAlertas } from '../../../services/alertas.service';
import { obtenerReporte } from '../../../services/reportes.service';
import type { Alerta } from '../../../lib/types';

interface Props {
  onNavigate: (seccion: string) => void;
}

export default function DashboardHome({ onNavigate }: Props) {
  const [cargando, setCargando] = useState(true);
  const [totalPacientes, setTotalPacientes] = useState(0);
  const [vacunasMes, setVacunasMes] = useState(0);
  const [alertasPendientes, setAlertasPendientes] = useState(0);
  const [cobertura, setCobertura] = useState('0%');
  const [alertasRecientes, setAlertasRecientes] = useState<Alerta[]>([]);

  useEffect(() => {
    (async () => {
      setCargando(true);
      try {
        const hoy = new Date();
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);
        const hoyStr = hoy.toISOString().slice(0, 10);

        const [pacientes, resumen, aplicadasMes, cob, alertas] = await Promise.all([
          listarPacientes({ page: 1, limit: 1 }),
          resumenAlertas(),
          obtenerReporte('vacunas-aplicadas', { desde: inicioMes, hasta: hoyStr }).catch(() => ({ filas: [] as any[] })),
          obtenerReporte('cobertura-vacunacion').catch(() => ({ filas: [] as any[] })),
          listarAlertas({ page: 1, limit: 5 }),
        ]);

        const mapaAlertas = Object.fromEntries(resumen.map((r) => [r.estado_semaforo, r.total]));
        setTotalPacientes(pacientes.total);
        setVacunasMes(aplicadasMes.filas.length);
        setAlertasPendientes((mapaAlertas['rojo'] || 0) + (mapaAlertas['amarillo'] || 0));

        const filasCobertura = cob.filas as { cobertura?: string }[];
        if (filasCobertura.length) {
          const promedio =
            filasCobertura.reduce((acc, f) => acc + parseFloat(String(f.cobertura || '0').replace('%', '')), 0) /
            filasCobertura.length;
          setCobertura(`${promedio.toFixed(1)}%`);
        }

        setAlertasRecientes(alertas.slice(0, 5));
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  const stats = [
    { label: 'Pacientes Registrados', value: cargando ? '...' : String(totalPacientes), icon: Users, color: 'bg-cyan-500' },
    { label: 'Vacunas Aplicadas (Mes)', value: cargando ? '...' : String(vacunasMes), icon: Syringe, color: 'bg-purple-500' },
    { label: 'Alertas Pendientes', value: cargando ? '...' : String(alertasPendientes), icon: AlertCircle, color: 'bg-pink-500' },
    { label: 'Cobertura de Vacunación', value: cargando ? '...' : cobertura, icon: FileText, color: 'bg-orange-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {stat.value}
              </p>
              <p className="text-sm text-gray-600" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                {stat.label}
              </p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Alertas Recientes
          </h3>
          <button
            onClick={() => onNavigate('alertas')}
            className="text-sm font-semibold text-cyan-600 hover:underline"
          >
            Ver todas
          </button>
        </div>
        <div className="space-y-3">
          {cargando && <p className="text-sm text-gray-400">Cargando...</p>}
          {!cargando && alertasRecientes.length === 0 && (
            <p className="text-sm text-gray-400">No hay alertas pendientes. ¡Todo al día!</p>
          )}
          {alertasRecientes.map((alerta) => (
            <div key={alerta.id} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${alerta.estado_semaforo === 'rojo' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                <div>
                  <p className="font-semibold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    {alerta.nombres} {alerta.apellidos}
                  </p>
                  <p className="text-sm text-gray-600" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    {alerta.vacuna_nombre} • {alerta.nombre_dosis} • {alerta.estado_semaforo === 'rojo' ? 'Atrasada' : 'Próxima'} (límite {alerta.fecha_limite})
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('alertas')}
                className="px-4 py-2 rounded-lg bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-600 transition-colors"
              >
                Ver
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
