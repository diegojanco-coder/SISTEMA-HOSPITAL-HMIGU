import api from '../lib/api';
import type { Dosis, Vacuna } from '../lib/types';

export async function listarVacunas() {
  const { data } = await api.get<{ data: Vacuna[] }>('/vacunas');
  return data.data;
}

export interface DatosVacuna {
  nombre: string;
  nombreCorto: string;
  descripcion?: string;
  enfermedadPrevine?: string;
  viaAdministracion?: string;
}

export async function crearVacuna(payload: DatosVacuna) {
  const { data } = await api.post<{ data: Vacuna }>('/vacunas', payload);
  return data.data;
}

export async function actualizarVacuna(id: number | string, payload: DatosVacuna) {
  const { data } = await api.put<{ data: Vacuna }>(`/vacunas/${id}`, payload);
  return data.data;
}

export async function eliminarVacuna(id: number | string) {
  await api.delete(`/vacunas/${id}`);
}

export interface DatosDosis {
  numeroDosis: number;
  nombreDosis: string;
  edadRecomendadaDias: number;
  toleranciaDias?: number;
  intervaloMinimoDias?: number;
}

export async function agregarDosis(vacunaId: number | string, payload: DatosDosis) {
  const { data } = await api.post<{ data: Dosis }>(`/vacunas/${vacunaId}/dosis`, payload);
  return data.data;
}

export async function eliminarDosis(dosisId: number | string) {
  await api.delete(`/vacunas/dosis/${dosisId}`);
}
