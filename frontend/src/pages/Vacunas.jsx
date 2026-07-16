import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import Swal from 'sweetalert2';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Modal from '../components/ui/Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { listarVacunas, crearVacuna, agregarDosis } from '../services/vacunas.service';

export default function Vacunas() {
  const { esAdmin } = useAuth();
  const [vacunas, setVacunas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalVacuna, setModalVacuna] = useState(false);
  const [modalDosis, setModalDosis] = useState(null); // vacuna seleccionada

  const formVacuna = useForm();
  const formDosis = useForm();

  const cargar = useCallback(async () => {
    setCargando(true);
    try { setVacunas(await listarVacunas()); } finally { setCargando(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function onSubmitVacuna(datos) {
    try {
      await crearVacuna(datos);
      Swal.fire({ icon: 'success', title: 'Vacuna creada', confirmButtonColor: '#0b5394', timer: 1500, showConfirmButton: false });
      setModalVacuna(false);
      formVacuna.reset();
      cargar();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || 'No se pudo crear la vacuna' });
    }
  }

  async function onSubmitDosis(datos) {
    try {
      await agregarDosis(modalDosis.id, {
        ...datos,
        numeroDosis: Number(datos.numeroDosis),
        edadRecomendadaDias: Number(datos.edadRecomendadaDias),
        toleranciaDias: Number(datos.toleranciaDias || 30),
        intervaloMinimoDias: Number(datos.intervaloMinimoDias || 0)
      });
      Swal.fire({ icon: 'success', title: 'Dosis agregada', confirmButtonColor: '#0b5394', timer: 1500, showConfirmButton: false });
      setModalDosis(null);
      formDosis.reset();
      cargar();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || 'No se pudo agregar la dosis' });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-hospital-azulOscuro">Catálogo de vacunas</h1>
          <p className="text-slate-500">Esquema según el Calendario Nacional de Inmunización de Bolivia (PAI).</p>
        </div>
        {esAdmin && <Button onClick={() => setModalVacuna(true)}>+ Nueva vacuna</Button>}
      </div>

      {cargando ? <p className="text-slate-500">Cargando...</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vacunas.map((v) => (
            <Card key={v.id} title={v.nombre} subtitle={v.enfermedad_previene}
              actions={esAdmin && <Button variante="fantasma" onClick={() => setModalDosis(v)}>+ Dosis</Button>}>
              <table className="w-full text-sm">
                <thead><tr className="text-left text-slate-500"><th>Dosis</th><th>Edad recomendada</th><th>Tolerancia</th></tr></thead>
                <tbody>
                  {v.dosis.map((d) => (
                    <tr key={d.id} className="border-t border-slate-100">
                      <td className="py-1.5">{d.nombre_dosis}</td>
                      <td>{d.edad_recomendada_dias} días</td>
                      <td>{d.tolerancia_dias} días</td>
                    </tr>
                  ))}
                  {v.dosis.length === 0 && <tr><td colSpan={3} className="text-slate-400 py-2">Sin dosis configuradas</td></tr>}
                </tbody>
              </table>
            </Card>
          ))}
        </div>
      )}

      <Modal abierto={modalVacuna} onClose={() => setModalVacuna(false)} title="Nueva vacuna"
        footer={<><Button variante="secundario" onClick={() => setModalVacuna(false)}>Cancelar</Button><Button onClick={formVacuna.handleSubmit(onSubmitVacuna)}>Guardar</Button></>}>
        <form className="space-y-4" onSubmit={formVacuna.handleSubmit(onSubmitVacuna)}>
          <div><label className="text-sm text-slate-600">Nombre</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1" {...formVacuna.register('nombre', { required: true })} /></div>
          <div><label className="text-sm text-slate-600">Nombre corto</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1" {...formVacuna.register('nombreCorto', { required: true })} /></div>
          <div><label className="text-sm text-slate-600">Enfermedad que previene</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1" {...formVacuna.register('enfermedadPrevine')} /></div>
          <div><label className="text-sm text-slate-600">Descripción</label>
            <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1" {...formVacuna.register('descripcion')} /></div>
        </form>
      </Modal>

      <Modal abierto={Boolean(modalDosis)} onClose={() => setModalDosis(null)} title={`Nueva dosis - ${modalDosis?.nombre || ''}`}
        footer={<><Button variante="secundario" onClick={() => setModalDosis(null)}>Cancelar</Button><Button onClick={formDosis.handleSubmit(onSubmitDosis)}>Guardar</Button></>}>
        <form className="grid grid-cols-2 gap-4" onSubmit={formDosis.handleSubmit(onSubmitDosis)}>
          <div><label className="text-sm text-slate-600">N° de dosis</label>
            <input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1" {...formDosis.register('numeroDosis', { required: true })} /></div>
          <div><label className="text-sm text-slate-600">Nombre de la dosis</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1" {...formDosis.register('nombreDosis', { required: true })} /></div>
          <div><label className="text-sm text-slate-600">Edad recomendada (días)</label>
            <input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1" {...formDosis.register('edadRecomendadaDias', { required: true })} /></div>
          <div><label className="text-sm text-slate-600">Tolerancia (días)</label>
            <input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1" {...formDosis.register('toleranciaDias')} /></div>
          <div className="col-span-2"><label className="text-sm text-slate-600">Intervalo mínimo respecto a la dosis anterior (días)</label>
            <input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 mt-1" {...formDosis.register('intervaloMinimoDias')} /></div>
        </form>
      </Modal>
    </div>
  );
}
