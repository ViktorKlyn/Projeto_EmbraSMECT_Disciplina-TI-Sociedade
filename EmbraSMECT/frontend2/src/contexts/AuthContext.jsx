import React, { createContext, useContext, useState } from 'react';
import api from '../services/api';

// Contexto que compartilha o usuário e as ações de autenticação entre as telas.
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // Envia as credenciais para o backend e guarda a sessão localmente.
  async function login(email, senha) {
    const { data } = await api.post('/login', { email, senha });
    setUser(data.usuario);
    sessionStorage.setItem('embrasmect_token', data.token);
  }

  // Encerra a sessão removendo o usuário e o token JWT.
  function logout() {
    setUser(null);
    sessionStorage.removeItem('embrasmect_token');
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

// Atalho para os componentes acessarem o contexto de autenticação.
export function useAuth() {
  return useContext(AuthContext);
}
