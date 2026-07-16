import axios from 'axios';

// URL base de la API del backend Node.js/Express. En desarrollo, Vite
// expone las variables que empiezan con VITE_ vía import.meta.env.
const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

const TOKEN_KEY = 'hmgu_token';
const USER_KEY = 'hmgu_usuario';

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      // Fuerza el regreso a la pantalla de login si la sesión expiró.
      if (!window.location.pathname.includes('login')) {
        window.location.reload();
      }
    }
    return Promise.reject(error);
  }
);

export function guardarSesion(token: string, usuario: unknown) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(usuario));
}

export function limpiarSesion() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function obtenerSesionGuardada<T>(): T | null {
  const raw = localStorage.getItem(USER_KEY);
  const token = localStorage.getItem(TOKEN_KEY);
  if (!raw || !token) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function obtenerToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export default api;
