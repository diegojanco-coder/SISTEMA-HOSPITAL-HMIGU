import api from '../lib/api';
import type { EsquemaPaciente, Paciente, Paginado } from '../lib/types';

export async function listarPacientes(params: { page?: number; limit?: number; q?: string } = {}) {
  const { data } = await api.get<{ data: Paginado<Paciente> }>('/pacientes', { params });
  return data.data;
}

export async function obtenerPaciente(id: number | string) {
  const { data } = await api.get<{ data: Paciente }>(`/pacientes/${id}`);
  return data.data;
}

export async function obtenerEsquemaPaciente(id: number | string) {
  const { data } = await api.get<{ data: EsquemaPaciente }>(`/pacientes/${id}/esquema`);
  return data.data;
}

export interface DatosPaciente {
  nombres: string;
  apellidos: string;
  carnetIdentidad?: string;
  fechaNacimiento: string;
  sexo: 'M' | 'F';
  direccion?: string;
  telefonoContacto?: string;
}

export async function crearPaciente(payload: DatosPaciente) {
  const { data } = await api.post<{ data: Paciente }>('/pacientes', payload);
  return data.data;
}

export async function actualizarPaciente(id: number | string, payload: DatosPaciente) {
  const { data } = await api.put<{ data: Paciente }>(`/pacientes/${id}`, payload);
  return data.data;
}

export async function eliminarPaciente(id: number | string) {
  await api.delete(`/pacientes/${id}`);
}

export async function descargarCarnetPDF(id: number | string) {
  const { data } = await api.get(`/pacientes/${id}/carnet`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
  window.open(url, '_blank');
}
