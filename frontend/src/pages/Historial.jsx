import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card.jsx';
import Table from '../components/ui/Table.jsx';
import SearchBar from '../components/ui/SearchBar.jsx';
import { useDebounce } from '../hooks/useDebounce';
import { listarPacientes } from '../services/pacientes.service';

/**
 * Punto de entrada para "Consultar historial de vacunación": permite
 * buscar un paciente en tiempo real y acceder a su ficha completa
 * (esquema PAI, historial de aplicaciones y carnet digital) en
 * /pacientes/:id, donde se concentra el detalle clínico.
 */
export default function Historial() {
  const [busqueda, setBusqueda] = useState('');
  const [pacientes, setPacientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const busquedaDebounced = useDebounce(busqueda);

  useEffect(() => {
    (async () => {
      setCargando(true);
      try {
        const data = await listarPacientes({ page: 1, limit: 20, q: busquedaDebounced });
        setPacientes(data.rows);
      } finally {
        setCargando(false);
      }
    })();
  }, [busquedaDebounced]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-hospital-azulOscuro">Historial de vacunación</h1>
        <p className="text-slate-500">Busque un paciente para ver su historial completo, esquema PAI y carnet digital.</p>
      </div>

      <Card>
        <div className="mb-4"><SearchBar value={busqueda} onChange={setBusqueda} placeholder="Buscar paciente por nombre, código o carnet..." /></div>
        <Table
          columnas={[
            { key: 'codigo_paciente', header: 'Código' },
            { key: 'nombre', header: 'Paciente', render: (f) => `${f.nombres} ${f.apellidos}` },
            { key: 'edad_formateada', header: 'Edad' },
            { key: 'acciones', header: '', render: (f) => (
              <Link className="text-hospital-azul text-sm hover:underline" to={`/pacientes/${f.id}`}>Ver historial completo →</Link>
            ) }
          ]}
          filas={cargando ? [] : pacientes}
          vacio={cargando ? 'Cargando...' : 'No se encontraron pacientes.'}
        />
      </Card>
    </div>
  );
}
