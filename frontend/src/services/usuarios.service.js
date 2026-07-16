import api from './api';

export async function listarUsuarios() {
  const { data } = await api.get('/usuarios');
  return data.data;
}

export async function obtenerUsuario(id) {
  const { data } = await api.get(`/usuarios/${id}`);
  return data.data;
}

export async function crearUsuario(payload) {
  const { data } = await api.post('/usuarios', payload);
  return data.data;
}

export async function actualizarUsuario(id, payload) {
  const { data } = await api.put(`/usuarios/${id}`, payload);
  return data.data;
}

export async function cambiarPassword(id, password) {
  const { data } = await api.patch(`/usuarios/${id}/password`, { password });
  return data.data;
}

export async function eliminarUsuario(id) {
  const { data } = await api.delete(`/usuarios/${id}`);
  return data.data;
}
