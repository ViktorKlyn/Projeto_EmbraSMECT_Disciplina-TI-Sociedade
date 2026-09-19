import axios from 'axios';

// Todas as chamadas do frontend passam por esta instância.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('embrasmect_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
