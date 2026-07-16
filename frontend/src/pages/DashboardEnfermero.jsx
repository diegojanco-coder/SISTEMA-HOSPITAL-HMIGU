import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card.jsx';
import Table from '../components/ui/Table.jsx';
import AlertaBadge from '../components/vacunacion/AlertaBadge.jsx';
import { listarAlertas } from '../services/alertas.service';

export default function DashboardEnfermero() {
  const [alertas, setAlertas] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await listarAlertas({ estado: 'rojo', page: 1, limit: 8 });
        setAlertas(data);
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-hospital-azulOscuro">Panel de Enfermería</h1>
        <p className="text-slate-500">Pacientes con vacunas atrasadas que requieren atención prioritaria.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to="/pacientes" className="text-sm px-4 py-2 rounded-lg bg-hospital-azul text-white hover:bg-hospital-azulOscuro">+ Registrar paciente</Link>
        <Link to="/alertas" className="text-sm px-4 py-2 rounded-lg bg-white border border-hospital-azul text-hospital-azul hover:bg-hospital-celesteClaro">Ver todas las alertas</Link>
      </div>

      <Card title="Vacunas atrasadas (prioridad alta)">
        <Table
          columnas={[
            { key: 'paciente', header: 'Paciente', render: (f) => `${f.nombres} ${f.apellidos} (${f.codigo_paciente})` },
            { key: 'vacuna_nombre', header: 'Vacuna' },
            { key: 'nombre_dosis', header: 'Dosis' },
            { key: 'fecha_limite', header: 'Fecha límite' },
            { key: 'estado', header: 'Estado', render: () => <AlertaBadge estado="rojo" /> },
            { key: 'acciones', header: '', render: (f) => <Link className="text-hospital-azul text-sm hover:underline" to={`/pacientes/${f.paciente_id}`}>Ver ficha</Link> }
          ]}
          filas={cargando ? [] : alertas}
          vacio={cargando ? 'Cargando...' : 'No hay vacunas atrasadas. ¡Buen trabajo!'}
        />
      </Card>
    </div>
  );
}
