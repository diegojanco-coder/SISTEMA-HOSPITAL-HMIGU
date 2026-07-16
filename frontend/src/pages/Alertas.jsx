import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Table from '../components/ui/Table.jsx';
import AlertaBadge from '../components/vacunacion/AlertaBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { listarAlertas, recalcularAlertas } from '../services/alertas.service';

const FILTROS = [
  { value: '', label: 'Todas' },
  { value: 'rojo', label: 'Atrasadas' },
  { value: 'amarillo', label: 'Próximas / pendientes' },
  { value: 'verde', label: 'Al día' }
];

export default function Alertas() {
  const { esAdmin } = useAuth();
  const [alertas, setAlertas] = useState([]);
  const [filtro, setFiltro] = useState('rojo');
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await listarAlertas({ estado: filtro || undefined, page: 1, limit: 100 });
      setAlertas(data);
    } finally { setCargando(false); }
  }, [filtro]);

  useEffect(() => { cargar(); }, [cargar]);

  async function onRecalcular() {
    await recalcularAlertas();
    Swal.fire({ icon: 'success', title: 'Alertas recalculadas', confirmButtonColor: '#0b5394', timer: 1500, showConfirmButton: false });
    cargar();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-hospital-azulOscuro">Alertas de vacunación</h1>
          <p className="text-slate-500">Semáforo automático generado por el módulo inteligente de vacunación.</p>
        </div>
        {esAdmin && <Button variante="secundario" onClick={onRecalcular}>Recalcular todas</Button>}
      </div>

      <div className="flex gap-2">
        {FILTROS.map((f) => (
          <button key={f.value} onClick={() => setFiltro(f.value)}
            className={`px-3 py-1.5 rounded-full text-sm border ${filtro === f.value ? 'bg-hospital-azul text-white border-hospital-azul' : 'bg-white text-slate-600 border-slate-200'}`}>
            {f.label}
          </button>
        ))}
      </div>

      <Card>
        <Table
          columnas={[
            { key: 'paciente', header: 'Paciente', render: (f) => `${f.nombres} ${f.apellidos} (${f.codigo_paciente})` },
            { key: 'vacuna_nombre', header: 'Vacuna' },
            { key: 'nombre_dosis', header: 'Dosis' },
            { key: 'fecha_limite', header: 'Fecha límite' },
            { key: 'estado_semaforo', header: 'Estado', render: (f) => <AlertaBadge estado={f.estado_semaforo} /> },
            { key: 'acciones', header: '', render: (f) => <Link className="text-hospital-azul text-sm hover:underline" to={`/pacientes/${f.paciente_id}`}>Ver ficha</Link> }
          ]}
          filas={cargando ? [] : alertas}
          vacio={cargando ? 'Cargando...' : 'No hay alertas para el filtro seleccionado.'}
        />
      </Card>
    </div>
  );
}
