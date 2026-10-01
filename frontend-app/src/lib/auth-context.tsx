import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import api from './api';
import type { SesionUsuario } from './types';

interface AuthContextValue {
  usuario: SesionUsuario | null;
  cargando: boolean;
  autenticado: boolean;
  esAdmin: boolean;
  login: (loginValue: string, password: string) => Promise<SesionUsuario>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<SesionUsuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const convertir = (usuarioApi: any): SesionUsuario => ({
      id: usuarioApi.id, nombre: usuarioApi.nombre_completo,
      email: usuarioApi.email, rol: usuarioApi.rol,
    });
    const expirada = () => setUsuario(null);
    window.addEventListener('hmgu:unauthorized', expirada);
    api.get('/auth/me')
      .then(({ data }) => setUsuario(convertir(data.data)))
      .catch(() => setUsuario(null))
      .finally(() => setCargando(false));
    return () => window.removeEventListener('hmgu:unauthorized', expirada);
  }, []);

  async function login(loginValue: string, password: string) {
    const { data } = await api.post('/auth/login', { login: loginValue, password });
    const { usuario: usuarioApi } = data.data;
    const sesion: SesionUsuario = {
      id: usuarioApi.id,
      nombre: usuarioApi.nombre_completo,
      email: usuarioApi.email,
      rol: usuarioApi.rol,
    };
    setUsuario(sesion);
    return sesion;
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      // el logout local debe funcionar aunque la llamada a la API falle
    }
    setUsuario(null);
  }

  const value: AuthContextValue = {
    usuario,
    cargando,
    autenticado: Boolean(usuario),
    esAdmin: usuario?.rol === 'administrador',
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
