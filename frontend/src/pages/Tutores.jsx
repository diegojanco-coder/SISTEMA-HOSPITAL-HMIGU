import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import Swal from 'sweetalert2';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Table from '../components/ui/Table.jsx';
import Modal from '../components/ui/Modal.jsx';
import SearchBar from '../components/ui/SearchBar.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import { useDebounce } from '../hooks/useDebounce';
import { usePagination } from '../hooks/usePagination';
import { listarTutores, crearTutor, actualizarTutor, eliminarTutor } from '../services/tutores.service';
import { MENSAJES, reglasEmail, reglasNombre, reglasTelefono } from '../lib/validaciones.js';

export default function Tutores() {
  const [tutores, setTutores] = useState([]);
  const [total, setTotal] = useState(0);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);

  const { page, setPage, limit, totalPaginas } = usePagination(10);
  const busquedaDebounced = useDebounce(busqueda);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await listarTutores({ page, limit, q: busquedaDebounced });
      setTutores(data.rows);
      setTotal(data.total);
    } finally { setCargando(false); }
  }, [page, limit, busquedaDebounced]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { setPage(1); }, [busquedaDebounced]); // eslint-disable-line react-hooks/exhaustive-deps

  function abrirNuevo() {
    setEditando(null);
    reset({ nombres: '', apellidos: '', carnetIdentidad: '', parentesco: 'madre', telefono: '', email: '', direccion: '' });
    setModalAbierto(true);
  }

  function abrirEditar(tutor) {
    setEditando(tutor);
    reset(tutor);
    setModalAbierto(true);
  }

  async function onSubmit(datos) {
    try {
      if (editando) {
        await actualizarTutor(editando.id, datos);
      } else {
        await crearTutor(datos);
      }
      Swal.fire({ icon: 'success', title: 'Guardado correctamente', confirmButtonColor: '#0b5394', timer: 1500, showConfirmButton: false });
      setModalAbierto(false);
      cargar();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || 'No se pudo guardar el tutor' });
    }
  }

  async function onEliminar(tutor) {
    const confirmacion = await Swal.fire({
      title: `¿Desactivar a ${tutor.nombres} ${tutor.apellidos}?`,
      icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, desactivar', confirmButtonColor: '#dc2626'
    });
    if (confirmacion.isConfirmed) {
      await eliminarTutor(tutor.id);
      cargar();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-hospital-azulOscuro">Tutores</h1>
          <p className="text-slate-500">Padres, madres o responsables legales de los pacientes.</p>
        </div>
        <Button onClick={abrirNuevo}>+ Nuevo tutor</Button>
      </div>

      <Card>
        <div className="mb-4"><SearchBar value={busqueda} onChange={setBusqueda} placeholder="Buscar por nombre o carnet..." /></div>
        <Table
          columnas={[
            { key: 'nombre', header: 'Nombre', render: (f) => `${f.nombres} ${f.apellidos}` },
            { key: 'carnet_identidad', header: 'Carnet' },
            { key: 'parentesco', header: 'Parentesco', render: (f) => f.parentesco.replace('_', ' ') },
            { key: 'telefono', header: 'Teléfono' },
            { key: 'acciones', header: 'Acciones', render: (f) => (
              <div className="flex gap-3 text-sm">
                <button className="text-hospital-celeste hover:underline" onClick={() => abrirEditar(f)}>Editar</button>
                <button className="text-hospital-rojo hover:underline" onClick={() => onEliminar(f)}>Desactivar</button>
              </div>
            ) }
          ]}
          filas={cargando ? [] : tutores}
          vacio={cargando ? 'Cargando...' : 'No se encontraron tutores.'}
        />
        <Pagination page={page} totalPaginas={totalPaginas(total)} onChange={setPage} />
      </Card>

      <Modal
        abierto={modalAbierto}
        onClose={() => setModalAbierto(false)}
        title={editando ? 'Editar tutor' : 'Nuevo tutor'}
        footer={<><Button variante="secundario" onClick={() => setModalAbierto(false)}>Cancelar</Button><Button onClick={handleSubmit(onSubmit)}>Guardar</Button></>}
      >
        <form className="grid grid-cols-1 sm:grid-cols-2 gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div><label className="text-sm text-slate-600">Nombres</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1" {...register('nombres', reglasNombre(MENSAJES.nombre))} />
            {errors.nombres && <p className="text-xs text-hospital-rojo">{errors.nombres.message}</p>}</div>
          <div><label className="text-sm text-slate-600">Apellidos</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1" {...register('apellidos', reglasNombre(MENSAJES.apellido))} />
            {errors.apellidos && <p className="text-xs text-hospital-rojo">{errors.apellidos.message}</p>}</div>
          <div><label className="text-sm text-slate-600">Carnet de identidad</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1" {...register('carnetIdentidad', { required: true })} />
            {errors.carnetIdentidad && <p className="text-xs text-hospital-rojo">Obligatorio</p>}</div>
          <div><label className="text-sm text-slate-600">Parentesco</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1" {...register('parentesco')}>
              <option value="madre">Madre</option><option value="padre">Padre</option>
              <option value="tutor_legal">Tutor legal</option><option value="otro">Otro</option>
            </select></div>
          <div><label className="text-sm text-slate-600">Teléfono</label>
            <input inputMode="numeric" className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1" {...register('telefono', reglasTelefono)} />
            {errors.telefono && <p className="text-xs text-hospital-rojo">{errors.telefono.message}</p>}</div>
          <div><label className="text-sm text-slate-600">Email</label>
            <input type="email" className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1" {...register('email', reglasEmail)} />
            {errors.email && <p className="text-xs text-hospital-rojo">{errors.email.message}</p>}</div>
          <div className="sm:col-span-2"><label className="text-sm text-slate-600">Dirección</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1" {...register('direccion')} /></div>
        </form>
      </Modal>
    </div>
  );
}
