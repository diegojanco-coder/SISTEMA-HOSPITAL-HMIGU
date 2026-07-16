import api from '../lib/api';
import type { Paginado, RegistroAuditoria } from '../lib/types';

export async function listarAuditoria(params: { page?: number; limit?: number; entidad?: string } = {}) {
  const { data } = await api.get<{ data: Paginado<RegistroAuditoria> }>('/auditoria', { params });
  return data.data;
}
