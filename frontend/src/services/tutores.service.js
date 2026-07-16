import api from './api';

export async function listarTutores({ page = 1, limit = 10, q = '' } = {}) {
  const { data } = await api.get('/tutores', { params: { page, limit, q } });
  return data.data;
}

export async function obtenerTutor(id) {
  const { data } = await api.get(`/tutores/${id}`);
  return data.data;
}

export async function crearTutor(payload) {
  const { data } = await api.post('/tutores', payload);
  return data.data;
}

export async function actualizarTutor(id, payload) {
  const { data } = await api.put(`/tutores/${id}`, payload);
  return data.data;
}

export async function eliminarTutor(id) {
  const { data } = await api.delete(`/tutores/${id}`);
  return data.data;
}

export async function vincularPaciente(tutorId, pacienteId, esPrincipal = false) {
  const { data } = await api.post(`/tutores/${tutorId}/pacientes/${pacienteId}`, { esPrincipal });
  return data.data;
}

export async function desvincularPaciente(tutorId, pacienteId) {
  const { data } = await api.delete(`/tutores/${tutorId}/pacientes/${pacienteId}`);
  return data.data;
}
