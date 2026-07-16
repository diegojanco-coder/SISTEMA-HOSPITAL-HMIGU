import api from '../lib/api';
import type { Alerta } from '../lib/types';

export async function listarAlertas(params: { estado?: string; page?: number; limit?: number } = {}) {
  const { data } = await api.get<{ data: Alerta[] }>('/alertas', { params });
  return data.data;
}

export async function resumenAlertas() {
  const { data } = await api.get<{ data: { estado_semaforo: string; total: number }[] }>('/alertas/resumen');
  return data.data;
}

export async function recalcularAlertas() {
  const { data } = await api.post<{ data: { procesados: number } }>('/alertas/recalcular');
  return data.data;
}
