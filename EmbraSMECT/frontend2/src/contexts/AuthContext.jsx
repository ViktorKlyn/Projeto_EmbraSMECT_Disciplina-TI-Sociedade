import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../services/api';

// Contexto que compartilha o usuário e as ações de autenticação entre as telas.
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  // Valida no backend o token salvo antes de liberar as rotas protegidas.
  const restoreSession = useCallback(async () => {
    const token = sessionStorage.getItem('embrasmect_token');
    if (!token) {
      setUser(null);
      setAuthError('');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await api.get('/login/sessao');
      setUser(data.usuario);
      setAuthError('');
    } catch (error) {
      if (error.response?.status === 401) {
        sessionStorage.removeItem('embrasmect_token');
        setUser(null);
        setAuthError('');
      } else {
        setAuthError('Não foi possível verificar sua sessão. Verifique a conexão com a API e tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // Envia as credenciais ao fluxo correspondente e guarda a sessão localmente.
  async function autenticar(email, senha, endpoint) {
    const { data } = await api.post(endpoint, { email, senha });
    // Guarda também o papel e a marcação de administrador principal para controlar a interface.
    setUser({ id: data.usuario.id, nome: data.usuario.nome, email: data.usuario.email, role: data.usuario.role, principal: Boolean(data.usuario.principal) });
    sessionStorage.setItem('embrasmect_token', data.token);
    setAuthError('');
    setIsLoading(false);
  }

  function login(email, senha) {
    return autenticar(email, senha, '/login');
  }

  function loginGuest(email, senha) {
    return autenticar(email, senha, '/login/convidado');
  }

  // Encerra a sessão removendo o usuário e o token JWT.
  function logout() {
    setUser(null);
    sessionStorage.removeItem('embrasmect_token');
  }

  return <AuthContext.Provider value={{ user, login, loginGuest, logout, isLoading, authError, restoreSession }}>{children}</AuthContext.Provider>;
}

// Atalho para os componentes acessarem o contexto de autenticação.
export function useAuth() {
  return useContext(AuthContext);
}
