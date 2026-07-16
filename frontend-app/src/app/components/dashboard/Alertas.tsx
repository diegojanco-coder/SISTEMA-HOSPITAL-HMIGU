import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Bell, Syringe } from 'lucide-react';
import { listarAlertas, recalcularAlertas } from '../../../services/alertas.service';
import { useAuth } from '../../../lib/auth-context';
import type { Alerta } from '../../../lib/types';

const fontBody = { fontFamily: 'Plus Jakarta Sans, sans-serif' };
const fontHeading = { fontFamily: 'Outfit, sans-serif' };

export default function Alertas() {
  const { esAdmin } = useAuth();
  const [atrasadas, setAtrasadas] = useState<Alerta[]>([]);
  const [proximas, setProximas] = useState<Alerta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [recalculando, setRecalculando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [rojas, amarillas] = await Promise.all([
        listarAlertas({ estado: 'rojo', limit: 50 }),
        listarAlertas({ estado: 'amarillo', limit: 50 }),
      ]);
      setAtrasadas(rojas);
      setProximas(amarillas);
    } finally { setCargando(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function onRecalcular() {
    setRecalculando(true);
    try { await recalcularAlertas(); await cargar(); } finally { setRecalculando(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900" style={fontHeading}>Sistema de Alertas</h3>
          <p className="text-gray-600" style={fontBody}>{atrasadas.length} atrasadas • {proximas.length} próximas/pendientes</p>
        </div>
        {esAdmin && (
          <button onClick={onRecalcular} disabled={recalculando} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold hover:scale-105 transition-transform shadow-lg disabled:opacity-60">
            <Bell className="w-5 h-5" /> {recalculando ? 'Recalculando...' : 'Recalcular Alertas'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-red-50 rounded-xl p-6 border-2 border-red-300">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center"><AlertCircle className="w-6 h-6 text-white" /></div>
          </div>
          <p className="text-4xl font-bold text-red-600 mb-1" style={fontHeading}>{cargando ? '...' : atrasadas.length}</p>
          <p className="text-gray-700 font-medium" style={fontBody}>Vacunas Atrasadas</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-6 border-2 border-yellow-300">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center"><Bell className="w-6 h-6 text-white" /></div>
          </div>
          <p className="text-4xl font-bold text-yellow-600 mb-1" style={fontHeading}>{cargando ? '...' : proximas.length}</p>
          <p className="text-gray-700 font-medium" style={fontBody}>Próximas / Pendientes</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border-2 border-red-200">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-6 h-6 text-red-600" />
          <h4 className="text-lg font-bold text-gray-900" style={fontHeading}>Vacunas Atrasadas - Urgente</h4>
        </div>
        <div className="space-y-3">
          {!cargando && atrasadas.length === 0 && <p className="text-sm text-gray-400">No hay vacunas atrasadas. ¡Buen trabajo!</p>}
          {atrasadas.map((a) => (
            <div key={a.id} className="flex items-start gap-4 p-4 rounded-lg bg-red-50 border border-red-200">
              <div className="w-3 h-3 mt-1.5 rounded-full bg-red-500 flex-shrink-0 animate-pulse" />
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-gray-900" style={fontBody}>{a.nombres} {a.apellidos} <span className="text-gray-600 font-normal">({a.codigo_paciente})</span></p>
                    <p className="text-red-700 font-semibold" style={fontBody}>{a.vacuna_nombre} - {a.nombre_dosis}</p>
                  </div>
                  <span className="text-xs font-bold text-red-700 bg-red-200 px-3 py-1 rounded-full">Límite: {a.fecha_limite}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border-2 border-yellow-200">
        <div className="flex items-center gap-2 mb-4">
          <Syringe className="w-6 h-6 text-yellow-600" />
          <h4 className="text-lg font-bold text-gray-900" style={fontHeading}>Vacunas Próximas / Pendientes</h4>
        </div>
        <div className="space-y-3">
          {!cargando && proximas.length === 0 && <p className="text-sm text-gray-400">No hay vacunas próximas en este momento.</p>}
          {proximas.map((a) => (
            <div key={a.id} className="flex items-start gap-4 p-4 rounded-lg bg-yellow-50 border border-yellow-200">
              <div className="w-3 h-3 mt-1.5 rounded-full bg-yellow-500 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-gray-900" style={fontBody}>{a.nombres} {a.apellidos} <span className="text-gray-600 font-normal">({a.codigo_paciente})</span></p>
                    <p className="text-yellow-700 font-semibold" style={fontBody}>{a.vacuna_nombre} - {a.nombre_dosis}</p>
                  </div>
                  <span className="text-xs font-bold text-yellow-700 bg-yellow-200 px-3 py-1 rounded-full">Límite: {a.fecha_limite}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
