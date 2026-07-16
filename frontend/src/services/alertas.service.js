import api from './api';

export async function listarAlertas({ estado, page = 1, limit = 20 } = {}) {
  const { data } = await api.get('/alertas', { params: { estado, page, limit } });
  return data.data;
}

export async function listarAlertasPorPaciente(pacienteId) {
  const { data } = await api.get(`/alertas/paciente/${pacienteId}`);
  return data.data;
}

export async function resumenAlertas() {
  const { data } = await api.get('/alertas/resumen');
  return data.data;
}

export async function marcarAlertaLeida(id) {
  const { data } = await api.patch(`/alertas/${id}/leida`);
  return data.data;
}

export async function recalcularAlertas() {
  const { data } = await api.post('/alertas/recalcular');
  return data.data;
}
