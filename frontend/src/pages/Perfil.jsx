import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Swal from 'sweetalert2';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { cambiarPassword } from '../services/usuarios.service';
import { ejecutarBackup, listarBackups } from '../services/backup.service';

export default function Perfil() {
  const { usuario, esAdmin } = useAuth();
  const { register, handleSubmit, reset } = useForm();
  const [backups, setBackups] = useState([]);
  const [generando, setGenerando] = useState(false);

  async function onSubmit(datos) {
    if (datos.password !== datos.confirmar) {
      Swal.fire({ icon: 'error', title: 'Las contraseñas no coinciden' });
      return;
    }
    try {
      await cambiarPassword(usuario.id, datos.password);
      Swal.fire({ icon: 'success', title: 'Contraseña actualizada', confirmButtonColor: '#0b5394' });
      reset();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || 'No se pudo actualizar la contraseña' });
    }
  }

  async function onGenerarBackup() {
    setGenerando(true);
    try {
      await ejecutarBackup();
      Swal.fire({ icon: 'success', title: 'Respaldo generado correctamente', confirmButtonColor: '#0b5394' });
      setBackups(await listarBackups());
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'No se pudo generar el respaldo', text: error.response?.data?.message || '' });
    } finally { setGenerando(false); }
  }

  async function onVerBackups() {
    setBackups(await listarBackups());
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-hospital-azulOscuro">Mi perfil</h1>
        <p className="text-slate-500">Datos de la cuenta y preferencias de seguridad.</p>
      </div>

      <Card title="Datos de la cuenta">
        <dl className="text-sm space-y-2">
          <div><dt className="text-slate-500">Nombre</dt><dd>{usuario?.nombre_completo || usuario?.nombre}</dd></div>
          <div><dt className="text-slate-500">Email</dt><dd>{usuario?.email}</dd></div>
          <div><dt className="text-slate-500">Rol</dt><dd className="capitalize">{usuario?.rol}</dd></div>
        </dl>
      </Card>

      <Card title="Cambiar contraseña">
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div><label className="text-sm text-slate-600">Nueva contraseña</label>
            <input type="password" className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1" {...register('password')} /></div>
          <div><label className="text-sm text-slate-600">Confirmar contraseña</label>
            <input type="password" className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1" {...register('confirmar')} /></div>
          <Button type="submit">Actualizar contraseña</Button>
        </form>
      </Card>

      {esAdmin && (
        <Card title="Respaldo de base de datos" subtitle="Módulo administrativo de respaldo automático">
          <div className="flex gap-3 mb-3">
            <Button onClick={onGenerarBackup} disabled={generando}>{generando ? 'Generando...' : 'Generar respaldo ahora'}</Button>
            <Button variante="secundario" onClick={onVerBackups}>Ver historial</Button>
          </div>
          <ul className="text-sm text-slate-600 space-y-1">
            {backups.map((b) => (
              <li key={b.archivo}>{b.archivo} — {(b.tamanioBytes / 1024).toFixed(1)} KB — {new Date(b.fecha).toLocaleString('es-BO')}</li>
            ))}
            {backups.length === 0 && <li className="text-slate-400">Sin respaldos listados aún.</li>}
          </ul>
        </Card>
      )}
    </div>
  );
}
