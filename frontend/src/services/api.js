import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000',
});

// Interceptor para adicionar o token de autorização
api.interceptors.request.use((config) => {
  const usuarioLogado = localStorage.getItem('embrasmect_user_id');
  if (usuarioLogado) {
    config.headers.Authorization = `Bearer ${usuarioLogado}`;
  }
  return config;
});

export default api;