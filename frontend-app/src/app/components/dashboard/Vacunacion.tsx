import { useEffect, useState } from 'react';
import { Syringe } from 'lucide-react';
import { listarVacunas } from '../../../services/vacunas.service';
import { obtenerReporte } from '../../../services/reportes.service';
import type { Vacuna } from '../../../lib/types';

const fontBody = { fontFamily: 'Plus Jakarta Sans, sans-serif' };
const fontHeading = { fontFamily: 'Outfit, sans-serif' };
const COLORES = ['bg-blue-50 border-blue-200', 'bg-cyan-50 border-cyan-200', 'bg-teal-50 border-teal-200', 'bg-green-50 border-green-200', 'bg-lime-50 border-lime-200', 'bg-yellow-50 border-yellow-200', 'bg-orange-50 border-orange-200', 'bg-red-50 border-red-200', 'bg-pink-50 border-pink-200'];

function diasAEdad(dias: number) {
  if (dias === 0) return 'Recién nacido';
  if (dias < 30) return `${dias} días`;
  if (dias < 365) return `${Math.round(dias / 30)} meses`;
  const anios = Math.floor(dias / 365);
  return `${anios} año${anios !== 1 ? 's' : ''}`;
}

export default function Vacunacion() {
  const [vacunas, setVacunas] = useState<Vacuna[]>([]);
  const [recientes, setRecientes] = useState<Record<string, unknown>[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (async () => {
      setCargando(true);
      try {
        const hoy = new Date();
        const hace30 = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);
        const [v, reporte] = await Promise.all([
          listarVacunas(),
          obtenerReporte('vacunas-aplicadas', { desde: hace30.toISOString().slice(0, 10), hasta: hoy.toISOString().slice(0, 10) }).catch(() => ({ filas: [] })),
        ]);
        setVacunas(v);
        setRecientes(reporte.filas.slice(0, 10));
      } finally { setCargando(false); }
    })();
  }, []);

  // Agrupa las dosis de todas las vacunas por edad recomendada para armar el calendario visual
  const porEdad = new Map<number, { edad: string; vacunas: string[] }>();
  vacunas.forEach((v) => {
    v.dosis.forEach((d) => {
      const key = d.edad_recomendada_dias;
      if (!porEdad.has(key)) porEdad.set(key, { edad: diasAEdad(key), vacunas: [] });
      porEdad.get(key)!.vacunas.push(`${v.nombre_corto} - ${d.nombre_dosis}`);
    });
  });
  const calendario = Array.from(porEdad.entries()).sort((a, b) => a[0] - b[0]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900" style={fontHeading}>Control de Vacunación</h3>
          <p className="text-gray-600" style={fontBody}>Calendario PAI - Bolivia</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h4 className="text-lg font-bold text-gray-900 mb-4" style={fontHeading}>Calendario PAI - Esquema Nacional</h4>
        {cargando && <p className="text-gray-400 text-sm">Cargando...</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {calendario.map(([dias, item], idx) => (
            <div key={dias} className={`${COLORES[idx % COLORES.length]} border rounded-xl p-4`}>
              <h5 className="font-bold text-gray-900 mb-2" style={fontBody}>{item.edad}</h5>
              <ul className="space-y-1">
                {item.vacunas.map((v, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700" style={fontBody}>
                    <Syringe className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-500" /> {v}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h4 className="text-lg font-bold text-gray-900 mb-4" style={fontHeading}>Vacunaciones Recientes (últimos 30 días)</h4>
        <div className="space-y-3">
          {!cargando && recientes.length === 0 && <p className="text-sm text-gray-400">Sin aplicaciones registradas en este período.</p>}
          {recientes.map((r: any, idx) => (
            <div key={idx} className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center flex-shrink-0">
                <Syringe className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-gray-900" style={fontBody}>{r.nombres} {r.apellidos}</p>
                    <p className="text-purple-600 font-semibold text-sm" style={fontBody}>{r.vacuna} - {r.nombre_dosis}</p>
                  </div>
                  <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full" style={fontBody}>{r.fecha_aplicacion}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600" style={fontBody}>
                  <span>Lote: {r.lote || '-'}</span><span>•</span><span>Aplicada por: {r.aplicado_por || '-'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
