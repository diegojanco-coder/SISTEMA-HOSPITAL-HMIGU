import api from '../lib/api';
import type { HistorialItem } from '../lib/types';

export async function listarHistorialPorPaciente(pacienteId: number | string) {
  const { data } = await api.get<{ data: HistorialItem[] }>(`/historial/paciente/${pacienteId}`);
  return data.data;
}

export interface DatosAplicacion {
  pacienteId: number;
  dosisId: number;
  fechaAplicacion: string;
  lote?: string;
  establecimiento?: string;
  observaciones?: string;
}

export async function registrarAplicacion(payload: DatosAplicacion) {
  const { data } = await api.post<{ data: HistorialItem }>('/historial', payload);
  return data.data;
}
