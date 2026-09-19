import React, { createContext, useContext, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  async function login(email, senha) {
    const { data } = await api.post('/login', { email, senha });
    setUser(data.usuario);
    sessionStorage.setItem('embrasmect_token', data.token);
  }

  function logout() {
    setUser(null);
    sessionStorage.removeItem('embrasmect_token');
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
