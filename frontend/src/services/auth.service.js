import api from './api';

export async function login(loginValue, password) {
  const { data } = await api.post('/auth/login', { login: loginValue, password });
  return data.data; // { token, usuario }
}

export async function logout() {
  try { await api.post('/auth/logout'); } catch { /* no bloquea el logout local */ }
}

export async function obtenerPerfil() {
  const { data } = await api.get('/auth/me');
  return data.data;
}
