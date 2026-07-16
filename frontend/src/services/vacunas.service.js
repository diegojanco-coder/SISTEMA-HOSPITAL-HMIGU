import api from './api';

export async function listarVacunas() {
  const { data } = await api.get('/vacunas');
  return data.data;
}

export async function obtenerVacuna(id) {
  const { data } = await api.get(`/vacunas/${id}`);
  return data.data;
}

export async function crearVacuna(payload) {
  const { data } = await api.post('/vacunas', payload);
  return data.data;
}

export async function actualizarVacuna(id, payload) {
  const { data } = await api.put(`/vacunas/${id}`, payload);
  return data.data;
}

export async function eliminarVacuna(id) {
  const { data } = await api.delete(`/vacunas/${id}`);
  return data.data;
}

export async function agregarDosis(vacunaId, payload) {
  const { data } = await api.post(`/vacunas/${vacunaId}/dosis`, payload);
  return data.data;
}

export async function actualizarDosis(dosisId, payload) {
  const { data } = await api.put(`/vacunas/dosis/${dosisId}`, payload);
  return data.data;
}

export async function eliminarDosis(dosisId) {
  const { data } = await api.delete(`/vacunas/dosis/${dosisId}`);
  return data.data;
}
