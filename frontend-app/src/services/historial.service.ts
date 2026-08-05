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
  pesoKg?: number;
  tallaCm?: number;
  establecimiento?: string;
  observaciones?: string;
}

export async function registrarAplicacion(payload: DatosAplicacion) {
  const { data } = await api.post<{ data: HistorialItem }>('/historial', payload);
  return data.data;
}
export interface DatosCita {
  pacienteId: number;
  dosisId: number;
  fechaProgramada: string;
}

export async function programarCita(payload: DatosCita) {
  const { data } = await api.post('/citas', payload);
  return data;
}