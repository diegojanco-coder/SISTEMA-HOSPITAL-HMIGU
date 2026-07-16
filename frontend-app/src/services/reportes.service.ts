import api from '../lib/api';

export interface ReporteResultado {
  titulo: string;
  columnas: { key: string; header: string }[];
  filas: Record<string, unknown>[];
}

export async function obtenerReporte(tipo: string, params: Record<string, unknown> = {}) {
  const { data } = await api.get<{ data: ReporteResultado }>(`/reportes/${tipo}`, {
    params: { ...params, formato: 'json' },
  });
  return data.data;
}

export async function descargarReporte(tipo: string, params: Record<string, unknown> = {}, formato: 'pdf' | 'excel' = 'pdf') {
  const response = await api.get(`/reportes/${tipo}`, { params: { ...params, formato }, responseType: 'blob' });
  const mime = formato === 'excel'
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'application/pdf';
  const extension = formato === 'excel' ? 'xlsx' : 'pdf';
  const url = window.URL.createObjectURL(new Blob([response.data], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${tipo}.${extension}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
