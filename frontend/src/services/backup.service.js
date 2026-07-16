import api from './api';

export async function ejecutarBackup() {
  const { data } = await api.post('/backup');
  return data.data;
}

export async function listarBackups() {
  const { data } = await api.get('/backup');
  return data.data;
}
