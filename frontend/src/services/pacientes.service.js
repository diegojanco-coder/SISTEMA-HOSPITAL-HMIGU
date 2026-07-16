import api from './api';

export async function listarPacientes({ page = 1, limit = 10, q = '' } = {}) {
  const { data } = await api.get('/pacientes', { params: { page, limit, q } });
  return data.data;
}

export async function buscarPacientes(q) {
  const { data } = await api.get('/pacientes/buscar', { params: { q } });
  return data.data;
}

export async function obtenerPaciente(id) {
  const { data } = await api.get(`/pacientes/${id}`);
  return data.data;
}

export async function obtenerEsquemaPaciente(id) {
  const { data } = await api.get(`/pacientes/${id}/esquema`);
  return data.data;
}

export async function crearPaciente(payload) {
  const { data } = await api.post('/pacientes', payload);
  return data.data;
}

export async function actualizarPaciente(id, payload) {
  const { data } = await api.put(`/pacientes/${id}`, payload);
  return data.data;
}

export async function eliminarPaciente(id) {
  const { data } = await api.delete(`/pacientes/${id}`);
  return data.data;
}

/**
 * Descarga el carnet digital (PDF) como blob autenticado (usa el
 * interceptor de Axios para enviar el JWT) y lo abre en una pestaña nueva.
 */
export async function abrirCarnetPDF(id) {
  const { data } = await api.get(`/pacientes/${id}/carnet`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
  window.open(url, '_blank');
}
