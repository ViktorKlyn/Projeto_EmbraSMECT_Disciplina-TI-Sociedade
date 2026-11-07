import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api, { TOKEN_KEY } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  const restoreSession = useCallback(async () => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      setUser(null);
      setAuthError('');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await api.get('/login/sessao');
      if (data.usuario.role !== 'guest') {
        sessionStorage.removeItem(TOKEN_KEY);
        setUser(null);
      } else {
        setUser(data.usuario);
      }
      setAuthError('');
    } catch (error) {
      if (error.response?.status === 401) {
        sessionStorage.removeItem(TOKEN_KEY);
        setUser(null);
        setAuthError('');
      } else {
        setAuthError('Não foi possível verificar sua sessão. Verifique a conexão e tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  async function loginGuest(email, senha) {
    const { data } = await api.post('/login/convidado', { email, senha });
    setUser(data.usuario);
    sessionStorage.setItem(TOKEN_KEY, data.token);
    setAuthError('');
    setIsLoading(false);
  }

  function logout() {
    sessionStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setAuthError('');
  }

  return <AuthContext.Provider value={{ user, loginGuest, logout, isLoading, authError, restoreSession }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
