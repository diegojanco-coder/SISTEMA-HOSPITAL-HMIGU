import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import Swal from 'sweetalert2';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Table from '../components/ui/Table.jsx';
import Modal from '../components/ui/Modal.jsx';
import AlertaBadge from '../components/vacunacion/AlertaBadge.jsx';
import EsquemaTimeline from '../components/vacunacion/EsquemaTimeline.jsx';
import { obtenerPaciente, obtenerEsquemaPaciente, abrirCarnetPDF } from '../services/pacientes.service';
import { listarHistorialPorPaciente, registrarAplicacion } from '../services/historial.service';

export default function PacienteDetalle() {
  const { id } = useParams();
  const [paciente, setPaciente] = useState(null);
  const [esquema, setEsquema] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [pac, esq, hist] = await Promise.all([
        obtenerPaciente(id),
        obtenerEsquemaPaciente(id),
        listarHistorialPorPaciente(id)
      ]);
      setPaciente(pac);
      setEsquema(esq);
      setHistorial(hist);
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  function abrirModalRegistro() {
    reset({ dosisId: '', fechaAplicacion: new Date().toISOString().slice(0, 10), lote: '', observaciones: '' });
    setModalAbierto(true);
  }

  async function onSubmit(datos) {
    try {
      await registrarAplicacion({ ...datos, pacienteId: Number(id), dosisId: Number(datos.dosisId) });
      Swal.fire({ icon: 'success', title: 'Vacuna registrada', confirmButtonColor: '#0b5394', timer: 1500, showConfirmButton: false });
      setModalAbierto(false);
      cargar();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'No se pudo registrar', text: error.response?.data?.message || 'Intente nuevamente' });
    }
  }

  if (cargando || !paciente) return <p className="text-slate-500">Cargando ficha del paciente...</p>;

  const dosisPendientes = esquema.detalle.filter((d) => ['proxima', 'pendiente', 'atrasada'].includes(d.estado));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/pacientes" className="text-sm text-hospital-azul hover:underline">&larr; Volver a pacientes</Link>
          <h1 className="text-2xl font-bold text-hospital-azulOscuro">{paciente.nombres} {paciente.apellidos}</h1>
          <p className="text-slate-500">Código: {paciente.codigo_paciente} · Edad: {paciente.edad_formateada}</p>
        </div>
        <div className="flex gap-2">
          <AlertaBadge estado={esquema.estadoGeneral} />
          <Button variante="secundario" onClick={() => abrirCarnetPDF(id)}>Carnet digital (PDF)</Button>
          <Button onClick={abrirModalRegistro}>+ Registrar vacuna</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Datos del paciente" className="lg:col-span-1">
          <dl className="text-sm space-y-2">
            <div><dt className="text-slate-500">Fecha de nacimiento</dt><dd>{paciente.fecha_nacimiento}</dd></div>
            <div><dt className="text-slate-500">Sexo</dt><dd>{paciente.sexo === 'M' ? 'Masculino' : 'Femenino'}</dd></div>
            <div><dt className="text-slate-500">Carnet de identidad</dt><dd>{paciente.carnet_identidad || 'N/A'}</dd></div>
            <div><dt className="text-slate-500">Teléfono</dt><dd>{paciente.telefono_contacto || 'N/A'}</dd></div>
            <div><dt className="text-slate-500">Dirección</dt><dd>{paciente.direccion || 'N/A'}</dd></div>
            <div>
              <dt className="text-slate-500">Tutores</dt>
              <dd>{paciente.tutores.length ? paciente.tutores.map((t) => `${t.nombres} ${t.apellidos} (${t.parentesco})`).join(', ') : 'Sin tutores registrados'}</dd>
            </div>
          </dl>
        </Card>

        <Card title="Resumen del esquema PAI Bolivia" className="lg:col-span-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div><p className="text-2xl font-bold text-hospital-azul">{esquema.resumen.aplicadas}</p><p className="text-xs text-slate-500">Aplicadas</p></div>
            <div><p className="text-2xl font-bold text-amber-500">{esquema.resumen.proximas + esquema.resumen.pendientes}</p><p className="text-xs text-slate-500">Próximas / pendientes</p></div>
            <div><p className="text-2xl font-bold text-red-600">{esquema.resumen.atrasadas}</p><p className="text-xs text-slate-500">Atrasadas</p></div>
            <div><p className="text-2xl font-bold text-slate-400">{esquema.resumen.futuras}</p><p className="text-xs text-slate-500">Futuras</p></div>
          </div>
        </Card>
      </div>

      <Card title="Esquema de vacunación inteligente (calendario PAI Bolivia)">
        <EsquemaTimeline detalle={esquema.detalle} />
      </Card>

      <Card title="Historial de aplicaciones registradas">
        <Table
          columnas={[
            { key: 'vacuna_nombre', header: 'Vacuna' },
            { key: 'nombre_dosis', header: 'Dosis' },
            { key: 'fecha_aplicacion', header: 'Fecha' },
            { key: 'lote', header: 'Lote', render: (f) => f.lote || '-' },
            { key: 'aplicado_por', header: 'Aplicado por', render: (f) => f.aplicado_por || '-' }
          ]}
          filas={historial}
          vacio="Aún no hay vacunas aplicadas registradas."
        />
      </Card>

      <Modal
        abierto={modalAbierto}
        onClose={() => setModalAbierto(false)}
        title="Registrar aplicación de vacuna"
        footer={<>
          <Button variante="secundario" onClick={() => setModalAbierto(false)}>Cancelar</Button>
          <Button onClick={handleSubmit(onSubmit)}>Registrar</Button>
        </>}
      >
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="text-sm text-slate-600">Dosis pendiente</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1" {...register('dosisId', { required: true })}>
              <option value="">Seleccione una dosis...</option>
              {dosisPendientes.map((d) => (
                <option key={d.dosisId} value={d.dosisId}>{d.vacunaNombre} - {d.nombreDosis} ({d.estado})</option>
              ))}
            </select>
            {errors.dosisId && <p className="text-xs text-hospital-rojo">Seleccione una dosis</p>}
            {dosisPendientes.length === 0 && <p className="text-xs text-slate-400 mt-1">El paciente no tiene dosis pendientes en este momento.</p>}
          </div>
          <div>
            <label className="text-sm text-slate-600">Fecha de aplicación</label>
            <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1" {...register('fechaAplicacion', { required: true })} />
          </div>
          <div>
            <label className="text-sm text-slate-600">Lote</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1" {...register('lote')} />
          </div>
          <div>
            <label className="text-sm text-slate-600">Observaciones</label>
            <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1" rows={2} {...register('observaciones')} />
          </div>
        </form>
      </Modal>
    </div>
  );
}
