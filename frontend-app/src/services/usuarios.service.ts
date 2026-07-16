import api from '../lib/api';
import type { Usuario } from '../lib/types';

export async function listarUsuarios() {
  const { data } = await api.get<{ data: Usuario[] }>('/usuarios');
  return data.data;
}

export interface DatosUsuario {
  nombreCompleto: string;
  email: string;
  username: string;
  rol: 'administrador' | 'enfermero';
  password?: string;
  estado?: 'activo' | 'inactivo';
}

export async function crearUsuario(payload: DatosUsuario) {
  const { data } = await api.post<{ data: Usuario }>('/usuarios', payload);
  return data.data;
}

export async function actualizarUsuario(id: number | string, payload: DatosUsuario) {
  const { data } = await api.put<{ data: Usuario }>(`/usuarios/${id}`, payload);
  return data.data;
}

export async function eliminarUsuario(id: number | string) {
  await api.delete(`/usuarios/${id}`);
}
