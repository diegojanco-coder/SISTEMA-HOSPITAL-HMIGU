import { useState } from 'react';
import Swal from 'sweetalert2';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Table from '../components/ui/Table.jsx';
import { obtenerReporte, descargarReporte } from '../services/reportes.service';

const TIPOS = [
  { value: 'pacientes-registrados', label: 'Pacientes registrados', params: [] },
  { value: 'vacunas-aplicadas', label: 'Vacunas aplicadas', params: ['desde', 'hasta'] },
  { value: 'vacunas-pendientes', label: 'Vacunas pendientes / próximas / atrasadas', params: [] },
  { value: 'cobertura-vacunacion', label: 'Cobertura de vacunación', params: [] },
  { value: 'pacientes-por-edad', label: 'Pacientes por rango de edad', params: ['edadMin', 'edadMax'] },
  { value: 'vacunas-por-fecha', label: 'Vacunas por fecha específica', params: ['fecha'] }
];

const ETIQUETAS = { desde: 'Desde', hasta: 'Hasta', edadMin: 'Edad mínima', edadMax: 'Edad máxima', fecha: 'Fecha' };

export default function Reportes() {
  const [tipo, setTipo] = useState(TIPOS[0].value);
  const [params, setParams] = useState({});
  const [reporte, setReporte] = useState(null);
  const [cargando, setCargando] = useState(false);

  const definicion = TIPOS.find((t) => t.value === tipo);

  async function onVer() {
    setCargando(true);
    try {
      const data = await obtenerReporte(tipo, params);
      setReporte(data);
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'No se pudo generar el reporte', text: error.response?.data?.message || 'Verifique los parámetros' });
    } finally { setCargando(false); }
  }

  async function onDescargar(formato) {
    try {
      await descargarReporte(tipo, params, formato);
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'No se pudo descargar el reporte', text: error.response?.data?.message || '' });
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-hospital-azulOscuro">Reportes</h1>
        <p className="text-slate-500">Genera y exporta reportes del sistema en PDF o Excel.</p>
      </div>

      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-sm text-slate-600">Tipo de reporte</label>
            <select className="block border border-slate-200 rounded-lg px-3 py-2 mt-1" value={tipo}
              onChange={(e) => { setTipo(e.target.value); setParams({}); setReporte(null); }}>
              {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          {definicion.params.map((p) => (
            <div key={p}>
              <label className="text-sm text-slate-600">{ETIQUETAS[p]}</label>
              <input
                type={p.includes('edad') ? 'number' : p === 'fecha' || p === 'desde' || p === 'hasta' ? 'date' : 'text'}
                className="block border border-slate-200 rounded-lg px-3 py-2 mt-1"
                value={params[p] || ''}
                onChange={(e) => setParams((prev) => ({ ...prev, [p]: e.target.value }))}
              />
            </div>
          ))}
          <Button onClick={onVer} disabled={cargando}>{cargando ? 'Generando...' : 'Ver reporte'}</Button>
          <Button variante="secundario" onClick={() => onDescargar('pdf')}>Exportar PDF</Button>
          <Button variante="secundario" onClick={() => onDescargar('excel')}>Exportar Excel</Button>
        </div>
      </Card>

      {reporte && (
        <Card title={reporte.titulo}>
          <Table
            columnas={reporte.columnas.map((c) => ({ key: c.key, header: c.header }))}
            filas={reporte.filas}
            vacio="El reporte no arrojó resultados."
          />
        </Card>
      )}
    </div>
  );
}
