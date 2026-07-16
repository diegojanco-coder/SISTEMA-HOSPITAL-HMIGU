import { useState } from 'react';
import { FileText, IdCard } from 'lucide-react';
import { descargarReporte, obtenerReporte, type ReporteResultado } from '../../../services/reportes.service';

const fontBody = { fontFamily: 'Plus Jakarta Sans, sans-serif' };
const fontHeading = { fontFamily: 'Outfit, sans-serif' };

const TIPOS = [
  { value: 'pacientes-registrados', label: 'Pacientes registrados', params: [] as string[] },
  { value: 'vacunas-aplicadas', label: 'Vacunas aplicadas', params: ['desde', 'hasta'] },
  { value: 'vacunas-pendientes', label: 'Vacunas pendientes / próximas / atrasadas', params: [] },
  { value: 'cobertura-vacunacion', label: 'Cobertura de vacunación', params: [] },
  { value: 'pacientes-por-edad', label: 'Pacientes por rango de edad', params: ['edadMin', 'edadMax'] },
  { value: 'vacunas-por-fecha', label: 'Vacunas por fecha específica', params: ['fecha'] },
];

const ETIQUETAS: Record<string, string> = { desde: 'Desde', hasta: 'Hasta', edadMin: 'Edad mínima', edadMax: 'Edad máxima', fecha: 'Fecha' };

export default function Reportes({ onNavigate }: { onNavigate: (s: string) => void }) {
  const [tipo, setTipo] = useState(TIPOS[0].value);
  const [params, setParams] = useState<Record<string, string>>({});
  const [reporte, setReporte] = useState<ReporteResultado | null>(null);
  const [cargando, setCargando] = useState(false);

  const definicion = TIPOS.find((t) => t.value === tipo)!;

  async function onVer() {
    setCargando(true);
    try { setReporte(await obtenerReporte(tipo, params)); } finally { setCargando(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900" style={fontHeading}>Reportes y Estadísticas</h3>
          <p className="text-gray-600" style={fontBody}>Análisis del sistema de vacunación</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2" style={fontBody}>Tipo de reporte</label>
            <select value={tipo} onChange={(e) => { setTipo(e.target.value); setParams({}); setReporte(null); }} className="px-4 py-3 rounded-lg border border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none" style={fontBody}>
              {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          {definicion.params.map((p) => (
            <div key={p}>
              <label className="block text-sm font-semibold text-gray-700 mb-2" style={fontBody}>{ETIQUETAS[p]}</label>
              <input
                type={p.includes('edad') ? 'number' : (p === 'fecha' || p === 'desde' || p === 'hasta') ? 'date' : 'text'}
                value={params[p] || ''}
                onChange={(e) => setParams((prev) => ({ ...prev, [p]: e.target.value }))}
                className="px-4 py-3 rounded-lg border border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none"
                style={fontBody}
              />
            </div>
          ))}
          <button onClick={onVer} disabled={cargando} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-teal-600 text-white font-semibold hover:scale-105 transition-transform shadow-lg disabled:opacity-60">
            <FileText className="w-5 h-5" /> {cargando ? 'Generando...' : 'Ver Reporte'}
          </button>
          <button onClick={() => descargarReporte(tipo, params, 'pdf')} className="px-6 py-3 rounded-lg bg-white border-2 border-cyan-600 text-cyan-600 font-semibold hover:bg-cyan-50 transition-colors">PDF</button>
          <button onClick={() => descargarReporte(tipo, params, 'excel')} className="px-6 py-3 rounded-lg bg-white border-2 border-green-600 text-green-600 font-semibold hover:bg-green-50 transition-colors">Excel</button>
        </div>
      </div>

      {reporte && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h4 className="text-lg font-bold text-gray-900" style={fontHeading}>{reporte.titulo}</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>{reporte.columnas.map((c) => <th key={c.key} className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase" style={fontBody}>{c.header}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reporte.filas.length === 0 && <tr><td colSpan={reporte.columnas.length} className="text-center text-gray-400 py-8">Sin resultados.</td></tr>}
                {reporte.filas.map((fila, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    {reporte.columnas.map((c) => <td key={c.key} className="px-6 py-3 text-gray-700" style={fontBody}>{String((fila as any)[c.key] ?? '')}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border-2 border-blue-200">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0"><IdCard className="w-6 h-6 text-white" /></div>
          <div className="flex-1">
            <h4 className="text-lg font-bold text-gray-900 mb-2" style={fontHeading}>Carnets Digitales (PDF)</h4>
            <p className="text-gray-700 mb-4" style={fontBody}>Genera carnets de vacunación individuales en formato PDF con código QR de verificación.</p>
            <button onClick={() => onNavigate('carnet')} className="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors">Ir a Carnet Digital</button>
          </div>
        </div>
      </div>
    </div>
  );
}
