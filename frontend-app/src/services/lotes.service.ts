import api from '../lib/api';

export interface LoteDisponible {
  id: number;
  vacuna_id: number;
  numero_lote: string;
  fecha_vencimiento: string;
  cantidad_disponible: number;
}

export async function listarLotesDisponibles(vacunaId: number | string) {
  const { data } = await api.get<{ data: LoteDisponible[] }>(`/lotes/vacuna/${vacunaId}/disponibles`);
  return data.data;
}