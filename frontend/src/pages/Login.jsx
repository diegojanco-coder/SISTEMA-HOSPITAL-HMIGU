import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext.jsx';
import Button from '../components/ui/Button.jsx';

export default function Login() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { iniciarSesion } = useAuth();
  const navigate = useNavigate();
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(datos) {
    setEnviando(true);
    try {
      await iniciarSesion(datos.login, datos.password);
      navigate('/');
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'No se pudo iniciar sesión',
        text: error.response?.data?.message || 'Verifique sus credenciales e intente nuevamente.',
        confirmButtonColor: '#0b5394'
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
      <div className="text-center mb-6">
        <div className="w-14 h-14 mx-auto rounded-full bg-hospital-azul text-white flex items-center justify-center text-2xl">+</div>
        <h1 className="text-xl font-bold text-hospital-azulOscuro mt-3">Sistema de Vacunación Inteligente</h1>
        <p className="text-sm text-slate-500">Hospital Materno Germán Urquidi · Cochabamba</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Usuario o correo</label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hospital-celeste"
            placeholder="admin"
            {...register('login', { required: 'Este campo es obligatorio' })}
          />
          {errors.login && <p className="text-xs text-hospital-rojo mt-1">{errors.login.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Contraseña</label>
          <input
            type="password"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hospital-celeste"
            placeholder="••••••••"
            {...register('password', { required: 'Este campo es obligatorio' })}
          />
          {errors.password && <p className="text-xs text-hospital-rojo mt-1">{errors.password.message}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={enviando}>
          {enviando ? 'Ingresando...' : 'Iniciar sesión'}
        </Button>
      </form>

      <p className="text-xs text-slate-400 text-center mt-6">
        Acceso exclusivo para personal autorizado del hospital.
      </p>
    </div>
  );
}
