import { useState } from 'react';
import { Eye, EyeOff, Plus, Lock, Mail, Sparkles, Shield, Activity, Syringe } from 'lucide-react';
import Dashboard from './components/Dashboard';
import { useAuth } from '../lib/auth-context';

export default function App() {
  const { usuario, cargando, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Credenciales incorrectas. Verifica tu email y contraseña.');
    } finally {
      setIsLoading(false);
    }
  };

  // Mientras se restaura la sesión guardada, no mostrar nada para evitar parpadeos
  if (cargando) return null;

  // Si el usuario está autenticado (JWT real), mostrar el dashboard
  if (usuario) {
    return <Dashboard />;
  }

  return (
    <div className="min-h-screen flex">
      {/* Panel Izquierdo - Imagen de Enfermera */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        {/* Imagen de fondo */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(https://images.unsplash.com/photo-1584432810601-6c7f27d2362b?w=1200&h=900&fit=crop&auto=format)`,
          }}
        />

        {/* Gradient overlay con colores vibrantes */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(6,182,212,0.92) 0%, rgba(59,130,246,0.88) 30%, rgba(147,51,234,0.85) 60%, rgba(236,72,153,0.82) 100%)'
          }}
        />

        {/* Contenido sobre la imagen */}
        <div className="relative z-10 flex flex-col h-full p-12 text-white">
          {/* Logo y nombre del hospital */}
          <div className="flex items-center gap-4 mb-12">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
                border: '2px solid rgba(255,255,255,0.3)',
              }}
            >
              <Plus className="w-8 h-8 text-white" strokeWidth={3} />
            </div>
            <div>
              <h1
                className="text-white leading-tight"
                style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  lineHeight: 1.1,
                  textShadow: '0 2px 10px rgba(0,0,0,0.3)',
                }}
              >
                Hospital Materno
                <br />
                Germán Urquidi
              </h1>
            </div>
          </div>

          {/* Contenido central */}
          <div className="flex-1 flex flex-col justify-center">
            <h2
              className="text-white mb-6"
              style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: '3rem',
                fontWeight: 800,
                lineHeight: 1.1,
                textShadow: '0 4px 20px rgba(0,0,0,0.4)',
                letterSpacing: '-0.02em'
              }}
            >
              Sistema Inteligente
              <br />
              de Vacunación
            </h2>
            <p
              className="text-white/90 text-lg leading-relaxed max-w-lg mb-10"
              style={{
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                textShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}
            >
              Plataforma integral para el control y seguimiento del esquema de vacunación.
              Diseñado específicamente para el personal de enfermería.
            </p>

            {/* Feature cards */}
            <div className="flex flex-col gap-4">
              {[
                { icon: Shield, title: 'Alertas Automáticas', desc: 'Notificaciones por vacuna próxima o atrasada' },
                { icon: Activity, title: 'Historial Completo', desc: 'Registro detallado de cada paciente' },
                { icon: Syringe, title: 'Calendario PAI', desc: 'Basado en esquema de Bolivia actualizado' },
              ].map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="flex items-start gap-4 p-4 rounded-xl transition-all duration-300 hover:bg-white/10"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3
                      className="text-white font-bold mb-1"
                      style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '1rem' }}
                    >
                      {title}
                    </h3>
                    <p
                      className="text-white/80 text-sm"
                      style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                    >
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 text-white/60 text-xs" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            <span>© 2026 Hospital Materno Germán Urquidi</span>
            <span>•</span>
            <span>Sistema de Salud de Bolivia</span>
          </div>
        </div>
      </div>

      {/* Panel Derecho - Formulario */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="flex lg:hidden items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
              <Plus className="w-6 h-6 text-white" strokeWidth={3} />
            </div>
            <div>
              <h1 className="text-gray-900 font-bold text-lg leading-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Hospital Materno
                <br />
                Germán Urquidi
              </h1>
            </div>
          </div>

          {/* Encabezado */}
          <div className="mb-8">
            <h2
              className="text-gray-900 mb-2"
              style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: '2.2rem',
                fontWeight: 800,
                lineHeight: 1.1,
              }}
            >
              Bienvenido/a
            </h2>
            <p
              className="text-gray-600"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '1rem' }}
            >
              Ingresa tus credenciales institucionales
            </p>
          </div>

          {/* Mensaje de error */}
          {error && (
            <div
              className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm mb-4"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              {error}
            </div>
          )}

          {/* Info de credenciales de prueba */}
          <div
            className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-sm mb-6"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            <strong>Credenciales de prueba (datos semilla):</strong>
            <div className="mt-2 space-y-1 text-xs">
              <div>👨‍⚕️ Admin: admin@hmgu.gob.bo / Admin123!</div>
              <div>👩‍⚕️ Enfermería: enfermeria@hmgu.gob.bo / Admin123!</div>
            </div>
          </div>

          {/* Formulario */}
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            {/* Email */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="email"
                className="text-gray-700 text-sm font-semibold"
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              >
                Correo Institucional o Usuario
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Mail className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@hmgu.gob.bo"
                  required
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 outline-none transition-all"
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.95rem' }}
                />
              </div>
            </div>

            {/* Contraseña */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="password"
                className="text-gray-700 text-sm font-semibold"
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              >
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Lock className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  required
                  className="w-full pl-12 pr-14 py-3.5 rounded-xl border-2 border-gray-200 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 outline-none transition-all"
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '0.95rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Botón */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-white font-bold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 mt-4"
              style={{
                background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 40%, #8b5cf6 70%, #ec4899 100%)',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontSize: '1rem',
                boxShadow: '0 10px 30px rgba(6,182,212,0.3)',
              }}
            >
              {isLoading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Verificando acceso...</span>
                </>
              ) : (
                <>
                  <span>Ingresar al Sistema</span>
                  <Sparkles className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <p
            className="text-center text-gray-500 mt-8 text-sm"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            Sistema restringido al personal de enfermería autorizado
          </p>
        </div>
      </div>
    </div>
  );
}
