import { useEffect, useState } from 'react';
import { IdCard, QrCode, Search, Download } from 'lucide-react';
import { listarPacientes, descargarCarnetPDF } from '../../../services/pacientes.service';
import type { Paciente } from '../../../lib/types';

const fontBody = { fontFamily: 'Plus Jakarta Sans, sans-serif' };
const fontHeading = { fontFamily: 'Outfit, sans-serif' };

export default function CarnetDigital() {
  const [busqueda, setBusqueda] = useState('');
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [seleccionado, setSeleccionado] = useState<Paciente | null>(null);
  const [cargando, setCargando] = useState(true);
  const [generando, setGenerando] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      setCargando(true);
      try {
        const data = await listarPacientes({ page: 1, limit: 20, q: busqueda });
        setPacientes(data.rows);
      } finally { setCargando(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  async function generar() {
    if (!seleccionado) return;
    setGenerando(true);
    try { await descargarCarnetPDF(seleccionado.id); } finally { setGenerando(false); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-900" style={fontHeading}>Carnet Digital de Vacunación</h3>
        <p className="text-gray-600" style={fontBody}>Genera el carnet en PDF con logo del hospital, historial completo y código QR de verificación.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden lg:col-span-1">
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar paciente..." className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none" style={fontBody} />
            </div>
          </div>
          <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-100">
            {cargando && <p className="p-4 text-sm text-gray-400">Cargando...</p>}
            {!cargando && pacientes.length === 0 && <p className="p-4 text-sm text-gray-400">Sin resultados.</p>}
            {pacientes.map((p) => (
              <button key={p.id} onClick={() => setSeleccionado(p)} className={`w-full text-left p-4 hover:bg-blue-50 transition-colors ${seleccionado?.id === p.id ? 'bg-blue-50' : ''}`}>
                <p className="font-semibold text-gray-900" style={fontBody}>{p.nombres} {p.apellidos}</p>
                <p className="text-sm text-gray-500" style={fontBody}>{p.codigo_paciente} • {p.edad_formateada}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2">
          {!seleccionado && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              <IdCard className="w-10 h-10 mx-auto mb-3" />
              Selecciona un paciente para generar su carnet digital.
            </div>
          )}

          {seleccionado && (
            <div className="bg-gradient-to-br from-cyan-500 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-2xl">
                  {seleccionado.nombres.charAt(0)}
                </div>
                <div>
                  <p className="text-sm text-white/80" style={fontBody}>Hospital Materno Germán Urquidi</p>
                  <h4 className="text-xl font-bold" style={fontHeading}>{seleccionado.nombres} {seleccionado.apellidos}</h4>
                  <p className="text-sm text-white/80" style={fontBody}>{seleccionado.codigo_paciente} • {seleccionado.edad_formateada}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 text-sm" style={fontBody}>
                <div className="bg-white/10 rounded-lg p-3"><p className="text-white/70">Fecha de Nacimiento</p><p className="font-semibold">{seleccionado.fecha_nacimiento}</p></div>
                <div className="bg-white/10 rounded-lg p-3"><p className="text-white/70">Carnet de Identidad</p><p className="font-semibold">{seleccionado.carnet_identidad || 'N/A'}</p></div>
              </div>

              <div className="flex items-center gap-4 bg-white/10 rounded-xl p-4 mb-6">
                <QrCode className="w-16 h-16" />
                <p className="text-sm text-white/90" style={fontBody}>
                  El PDF generado incluye historial completo de vacunas aplicadas, próximas dosis
                  según el calendario PAI Bolivia, y un código QR de verificación único.
                </p>
              </div>

              <button
                onClick={generar}
                disabled={generando}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-white text-cyan-700 font-bold hover:scale-[1.02] transition-transform disabled:opacity-60"
              >
                <Download className="w-5 h-5" /> {generando ? 'Generando PDF...' : 'Descargar Carnet en PDF'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
