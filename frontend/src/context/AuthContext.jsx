import { createContext, useContext, useEffect, useState } from 'react';
import * as authService from '../services/auth.service';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('hmgu_token');
    const usuarioGuardado = localStorage.getItem('hmgu_usuario');
    if (token && usuarioGuardado) {
      setUsuario(JSON.parse(usuarioGuardado));
    }
    setCargando(false);
  }, []);

  async function iniciarSesion(loginValue, password) {
    const { token, usuario: usuarioLogueado } = await authService.login(loginValue, password);
    localStorage.setItem('hmgu_token', token);
    localStorage.setItem('hmgu_usuario', JSON.stringify(usuarioLogueado));
    setUsuario(usuarioLogueado);
    return usuarioLogueado;
  }

  async function cerrarSesion() {
    await authService.logout();
    localStorage.removeItem('hmgu_token');
    localStorage.removeItem('hmgu_usuario');
    setUsuario(null);
  }

  const value = {
    usuario,
    cargando,
    autenticado: Boolean(usuario),
    esAdmin: usuario?.rol === 'administrador',
    iniciarSesion,
    cerrarSesion,
    setUsuario
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
