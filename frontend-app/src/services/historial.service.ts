import toast from 'react-hot-toast';
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
  loteVacunaId: number;
  establecimiento?: string;
  observaciones?: string;
}

export interface DatosVisita {
  pacienteId: number;
  observaciones?: string;
  dosisAplicadas: Omit<DatosAplicacion, 'pacienteId'>[];
}
export async function registrarVisita(payload: DatosVisita) {
  const { data } = await api.post<{ data: {
    id: number; pacienteId: number;
    dosisAplicadas: { id: number; dosisId: number; loteVacunaId: number }[];
    advertencias?: string[];
  } }>('/citas', payload);
  data.data.advertencias?.forEach(mensaje => toast(mensaje, { icon: '⚠️', duration: 8000 }));
  return data.data;
}
export async function registrarAplicacion(payload: DatosAplicacion) {
  const { pacienteId, ...dosis } = payload;
  return registrarVisita({ pacienteId, dosisAplicadas: [dosis] });
}

export interface DatosAntecedente {
  pacienteId: number;
  dosisId: number;
  fechaAplicacion: string;
  establecimiento: string;
  documentoReferencia: string;
  observaciones?: string;
}

export async function registrarAntecedente(payload: DatosAntecedente) {
  const { data } = await api.post<{ data: HistorialItem & { advertencias?: string[] } }>('/historial/antecedentes', payload);
  data.data.advertencias?.forEach(mensaje => toast(mensaje, { icon: '⚠️', duration: 8000 }));
  return data.data;
}

export async function corregirAplicacion(id: number, payload: { fechaAplicacion: string; establecimiento: string; observaciones: string; documentoReferencia?: string }) {
  const { data } = await api.put<{ data: HistorialItem & { advertencias?: string[] } }>(`/historial/${id}`, payload);
  data.data.advertencias?.forEach(mensaje => toast(mensaje, { icon: '⚠️', duration: 8000 }));
  return data.data;
}
