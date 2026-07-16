import api from './api';

export async function listarAuditoria({ page = 1, limit = 20, entidad } = {}) {
  const { data } = await api.get('/auditoria', { params: { page, limit, entidad } });
  return data.data;
}
