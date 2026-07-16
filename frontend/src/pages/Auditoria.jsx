import { useEffect, useState, useCallback } from 'react';
import Card from '../components/ui/Card.jsx';
import Table from '../components/ui/Table.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import { usePagination } from '../hooks/usePagination';
import { listarAuditoria } from '../services/auditoria.service';

export default function Auditoria() {
  const [registros, setRegistros] = useState([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const { page, setPage, limit, totalPaginas } = usePagination(15);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await listarAuditoria({ page, limit });
      setRegistros(data.rows);
      setTotal(data.total);
    } finally { setCargando(false); }
  }, [page, limit]);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-hospital-azulOscuro">Bitácora de auditoría</h1>
        <p className="text-slate-500">Registro de todas las acciones realizadas en el sistema.</p>
      </div>

      <Card>
        <Table
          columnas={[
            { key: 'created_at', header: 'Fecha/Hora' },
            { key: 'usuario_nombre', header: 'Usuario', render: (f) => f.usuario_nombre || 'Sistema' },
            { key: 'accion', header: 'Acción' },
            { key: 'entidad', header: 'Entidad' },
            { key: 'entidad_id', header: 'ID' },
            { key: 'ip', header: 'IP' }
          ]}
          filas={cargando ? [] : registros}
          vacio={cargando ? 'Cargando...' : 'No hay registros de auditoría.'}
        />
        <Pagination page={page} totalPaginas={totalPaginas(total)} onChange={setPage} />
      </Card>
    </div>
  );
}
