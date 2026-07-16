import api from '../lib/api';
import type { Paginado, Tutor } from '../lib/types';

export interface DatosTutor {
  nombres: string;
  apellidos: string;
  carnetIdentidad: string;
  parentesco: 'padre' | 'madre' | 'tutor_legal' | 'otro';
  telefono?: string;
  email?: string;
  direccion?: string;
  pacienteId?: number;
}

export async function listarTutores(params: { page?: number; limit?: number; q?: string } = {}) {
  const { data } = await api.get<{ data: Paginado<Tutor> }>('/tutores', { params });
  return data.data;
}

export async function obtenerTutor(id: number | string) {
  const { data } = await api.get<{ data: Tutor & { pacientes: any[] } }>(`/tutores/${id}`);
  return data.data;
}

export async function crearTutor(payload: DatosTutor) {
  const { data } = await api.post<{ data: Tutor }>('/tutores', payload);
  return data.data;
}

export async function actualizarTutor(id: number | string, payload: DatosTutor) {
  const { data } = await api.put<{ data: Tutor }>(`/tutores/${id}`, payload);
  return data.data;
}

export async function eliminarTutor(id: number | string) {
  await api.delete(`/tutores/${id}`);
}

export async function vincularPaciente(tutorId: number | string, pacienteId: number | string, esPrincipal = false) {
  await api.post(`/tutores/${tutorId}/pacientes/${pacienteId}`, { esPrincipal });
}
