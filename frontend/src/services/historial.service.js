import api from './api';

export async function listarHistorialPorPaciente(pacienteId) {
  const { data } = await api.get(`/historial/paciente/${pacienteId}`);
  return data.data;
}

export async function registrarAplicacion(payload) {
  const { data } = await api.post('/historial', payload);
  return data.data;
}

export async function actualizarRegistro(id, payload) {
  const { data } = await api.put(`/historial/${id}`, payload);
  return data.data;
}
