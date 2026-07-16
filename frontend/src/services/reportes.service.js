import api from './api';

export async function obtenerReporte(tipo, params = {}) {
  const { data } = await api.get(`/reportes/${tipo}`, { params: { ...params, formato: 'json' } });
  return data.data;
}

export async function descargarReporte(tipo, params = {}, formato = 'pdf') {
  const response = await api.get(`/reportes/${tipo}`, {
    params: { ...params, formato },
    responseType: 'blob'
  });
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
