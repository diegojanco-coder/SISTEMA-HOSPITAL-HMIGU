import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import Swal from 'sweetalert2';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Table from '../components/ui/Table.jsx';
import Modal from '../components/ui/Modal.jsx';
import Badge from '../components/ui/Badge.jsx';
import { listarUsuarios, crearUsuario, actualizarUsuario, eliminarUsuario } from '../services/usuarios.service';
import { reglasPassword } from '../lib/validaciones.js';

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const cargar = useCallback(async () => {
    setCargando(true);
    try { setUsuarios(await listarUsuarios()); } finally { setCargando(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  function abrirNuevo() {
    setEditando(null);
    reset({ nombreCompleto: '', email: '', username: '', rol: 'enfermero', password: '' });
    setModalAbierto(true);
  }

  function abrirEditar(usuario) {
    setEditando(usuario);
    reset({ nombreCompleto: usuario.nombre_completo, email: usuario.email, username: usuario.username, rol: usuario.rol, estado: usuario.estado });
    setModalAbierto(true);
  }

  async function onSubmit(datos) {
    try {
      if (editando) {
        await actualizarUsuario(editando.id, { ...datos, estado: datos.estado || 'activo' });
      } else {
        await crearUsuario(datos);
      }
      Swal.fire({ icon: 'success', title: 'Guardado correctamente', confirmButtonColor: '#0b5394', timer: 1500, showConfirmButton: false });
      setModalAbierto(false);
      cargar();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || 'No se pudo guardar el usuario' });
    }
  }

  async function onEliminar(usuario) {
    const confirmacion = await Swal.fire({
      title: `¿Desactivar a ${usuario.nombre_completo}?`, icon: 'warning',
      showCancelButton: true, confirmButtonText: 'Sí, desactivar', confirmButtonColor: '#dc2626'
    });
    if (confirmacion.isConfirmed) { await eliminarUsuario(usuario.id); cargar(); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-hospital-azulOscuro">Usuarios del sistema</h1>
          <p className="text-slate-500">Personal autorizado para operar el sistema (administradores y enfermería).</p>
        </div>
        <Button onClick={abrirNuevo}>+ Nuevo usuario</Button>
      </div>

      <Card>
        <Table
          columnas={[
            { key: 'nombre_completo', header: 'Nombre' },
            { key: 'username', header: 'Usuario' },
            { key: 'email', header: 'Email' },
            { key: 'rol', header: 'Rol', render: (f) => <Badge color={f.rol === 'administrador' ? 'azul' : 'gris'}>{f.rol}</Badge> },
            { key: 'estado', header: 'Estado', render: (f) => <Badge color={f.estado === 'activo' ? 'verde' : 'rojo'}>{f.estado}</Badge> },
            { key: 'acciones', header: 'Acciones', render: (f) => (
              <div className="flex gap-3 text-sm">
                <button className="text-hospital-celeste hover:underline" onClick={() => abrirEditar(f)}>Editar</button>
                <button className="text-hospital-rojo hover:underline" onClick={() => onEliminar(f)}>Desactivar</button>
              </div>
            ) }
          ]}
          filas={cargando ? [] : usuarios}
          vacio={cargando ? 'Cargando...' : 'No hay usuarios registrados.'}
        />
      </Card>

      <Modal abierto={modalAbierto} onClose={() => setModalAbierto(false)} title={editando ? 'Editar usuario' : 'Nuevo usuario'}
        footer={<><Button variante="secundario" onClick={() => setModalAbierto(false)}>Cancelar</Button><Button onClick={handleSubmit(onSubmit)}>Guardar</Button></>}>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div><label className="text-sm text-slate-600">Nombre completo</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1" {...register('nombreCompleto')} /></div>
          <div><label className="text-sm text-slate-600">Email</label>
            <input type="email" className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1" {...register('email')} /></div>
          <div><label className="text-sm text-slate-600">Usuario</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1" {...register('username')} /></div>
          <div><label className="text-sm text-slate-600">Rol</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1" {...register('rol')}>
              <option value="enfermero">Enfermero</option><option value="administrador">Administrador</option>
            </select></div>
          {editando && (
            <div><label className="text-sm text-slate-600">Estado</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1" {...register('estado')}>
                <option value="activo">Activo</option><option value="inactivo">Inactivo</option>
              </select></div>
          )}
          {!editando && (
            <div><label className="text-sm text-slate-600">Contraseña temporal</label>
              <input type="password" className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1" {...register('password')} /></div>
          )}
        </form>
      </Modal>
    </div>
  );
}
