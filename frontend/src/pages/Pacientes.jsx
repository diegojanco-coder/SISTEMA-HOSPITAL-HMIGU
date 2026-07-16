import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Table from '../components/ui/Table.jsx';
import Modal from '../components/ui/Modal.jsx';
import SearchBar from '../components/ui/SearchBar.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import { useDebounce } from '../hooks/useDebounce';
import { usePagination } from '../hooks/usePagination';
import { listarPacientes, crearPaciente, actualizarPaciente, eliminarPaciente, abrirCarnetPDF } from '../services/pacientes.service';

export default function Pacientes() {
  const [pacientes, setPacientes] = useState([]);
  const [total, setTotal] = useState(0);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [pacienteEditando, setPacienteEditando] = useState(null);

  const { page, setPage, limit, totalPaginas } = usePagination(10);
  const busquedaDebounced = useDebounce(busqueda);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await listarPacientes({ page, limit, q: busquedaDebounced });
      setPacientes(data.rows);
      setTotal(data.total);
    } finally {
      setCargando(false);
    }
  }, [page, limit, busquedaDebounced]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { setPage(1); }, [busquedaDebounced]); // eslint-disable-line react-hooks/exhaustive-deps

  function abrirNuevo() {
    setPacienteEditando(null);
    reset({ nombres: '', apellidos: '', carnetIdentidad: '', fechaNacimiento: '', sexo: 'F', direccion: '', telefonoContacto: '' });
    setModalAbierto(true);
  }

  function abrirEditar(paciente) {
    setPacienteEditando(paciente);
    reset({
      nombres: paciente.nombres,
      apellidos: paciente.apellidos,
      carnetIdentidad: paciente.carnet_identidad || '',
      fechaNacimiento: paciente.fecha_nacimiento,
      sexo: paciente.sexo,
      direccion: paciente.direccion || '',
      telefonoContacto: paciente.telefono_contacto || ''
    });
    setModalAbierto(true);
  }

  async function onSubmit(datos) {
    try {
      if (pacienteEditando) {
        await actualizarPaciente(pacienteEditando.id, datos);
        Swal.fire({ icon: 'success', title: 'Paciente actualizado', confirmButtonColor: '#0b5394', timer: 1500, showConfirmButton: false });
      } else {
        await crearPaciente(datos);
        Swal.fire({ icon: 'success', title: 'Paciente registrado', confirmButtonColor: '#0b5394', timer: 1500, showConfirmButton: false });
      }
      setModalAbierto(false);
      cargar();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || 'No se pudo guardar el paciente' });
    }
  }

  async function onEliminar(paciente) {
    const confirmacion = await Swal.fire({
      title: `¿Desactivar a ${paciente.nombres} ${paciente.apellidos}?`,
      text: 'El registro se conservará en el historial, pero dejará de aparecer en las listas activas.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, desactivar',
      confirmButtonColor: '#dc2626'
    });
    if (confirmacion.isConfirmed) {
      await eliminarPaciente(paciente.id);
      cargar();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-hospital-azulOscuro">Pacientes</h1>
          <p className="text-slate-500">Registro y seguimiento de pacientes del hospital.</p>
        </div>
        <Button onClick={abrirNuevo}>+ Nuevo paciente</Button>
      </div>

      <Card>
        <div className="mb-4">
          <SearchBar value={busqueda} onChange={setBusqueda} placeholder="Buscar por nombre, código o carnet..." />
        </div>
        <Table
          columnas={[
            { key: 'codigo_paciente', header: 'Código' },
            { key: 'nombre', header: 'Nombre', render: (f) => `${f.nombres} ${f.apellidos}` },
            { key: 'edad_formateada', header: 'Edad' },
            { key: 'sexo', header: 'Sexo', render: (f) => (f.sexo === 'M' ? 'Masculino' : 'Femenino') },
            { key: 'telefono_contacto', header: 'Teléfono' },
            {
              key: 'acciones',
              header: 'Acciones',
              render: (f) => (
                <div className="flex gap-3 text-sm">
                  <Link className="text-hospital-azul hover:underline" to={`/pacientes/${f.id}`}>Ver ficha</Link>
                  <button className="text-hospital-celeste hover:underline" onClick={() => abrirEditar(f)}>Editar</button>
                  <button className="text-hospital-rojo hover:underline" onClick={() => onEliminar(f)}>Desactivar</button>
                  <button className="text-slate-500 hover:underline" onClick={() => abrirCarnetPDF(f.id)}>Carnet PDF</button>
                </div>
              )
            }
          ]}
          filas={cargando ? [] : pacientes}
          vacio={cargando ? 'Cargando...' : 'No se encontraron pacientes.'}
        />
        <Pagination page={page} totalPaginas={totalPaginas(total)} onChange={setPage} />
      </Card>

      <Modal
        abierto={modalAbierto}
        onClose={() => setModalAbierto(false)}
        title={pacienteEditando ? 'Editar paciente' : 'Nuevo paciente'}
        footer={
          <>
            <Button variante="secundario" onClick={() => setModalAbierto(false)}>Cancelar</Button>
            <Button onClick={handleSubmit(onSubmit)}>Guardar</Button>
          </>
        }
      >
        <form className="grid grid-cols-1 sm:grid-cols-2 gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="text-sm text-slate-600">Nombres</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1" {...register('nombres', { required: true })} />
            {errors.nombres && <p className="text-xs text-hospital-rojo">Obligatorio</p>}
          </div>
          <div>
            <label className="text-sm text-slate-600">Apellidos</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1" {...register('apellidos', { required: true })} />
            {errors.apellidos && <p className="text-xs text-hospital-rojo">Obligatorio</p>}
          </div>
          <div>
            <label className="text-sm text-slate-600">Carnet de identidad</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1" {...register('carnetIdentidad')} />
          </div>
          <div>
            <label className="text-sm text-slate-600">Fecha de nacimiento</label>
            <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1" {...register('fechaNacimiento', { required: true })} />
            {errors.fechaNacimiento && <p className="text-xs text-hospital-rojo">Obligatorio</p>}
          </div>
          <div>
            <label className="text-sm text-slate-600">Sexo</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1" {...register('sexo')}>
              <option value="F">Femenino</option>
              <option value="M">Masculino</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-600">Teléfono de contacto</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1" {...register('telefonoContacto')} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm text-slate-600">Dirección</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1" {...register('direccion')} />
          </div>
        </form>
      </Modal>
    </div>
  );
}
