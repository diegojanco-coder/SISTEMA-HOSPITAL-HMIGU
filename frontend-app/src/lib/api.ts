import axios from 'axios';

// URL base de la API del backend Node.js/Express. En desarrollo, Vite
// expone las variables que empiezan con VITE_ vía import.meta.env.
const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      window.dispatchEvent(new Event('hmgu:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;
