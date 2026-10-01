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

export type MotivoMerma = 'frasco_abierto_vencido' | 'rotura_accidental' | 'falla_cadena_frio' | 'otro';
export async function registrarMerma(datos: { loteId: number; cantidadDosisPerdidas: number; motivo: MotivoMerma; observaciones?: string }) {
  const { data } = await api.post('/lotes/mermas', datos);
  return data.data;
}
