import api from '../lib/api';

export interface BackupInfo {
  archivo: string;
  tamanioBytes: number;
  fecha: string;
}

export async function ejecutarBackup() {
  const { data } = await api.post<{ data: { archivo: string; fecha: string } }>('/backup');
  return data.data;
}

export async function listarBackups() {
  const { data } = await api.get<{ data: BackupInfo[] }>('/backup');
  return data.data;
}
