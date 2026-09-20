import axios from 'axios';

// VITE_API_URL aponta para a raiz do backend, por exemplo http://localhost:3000.
// O Vite disponibiliza no navegador apenas variáveis com o prefixo VITE_.
const baseApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Todas as rotas da aplicação ficam abaixo de /api.
const normalizedBaseUrl = baseApiUrl.endsWith('/api') ? baseApiUrl : `${baseApiUrl.replace(/\/$/, '')}/api`;

// Cliente HTTP único usado pelas páginas para conversar com o backend.
const api = axios.create({
  baseURL: normalizedBaseUrl,
  headers: { 'Content-Type': 'application/json' },
});

// Inclui automaticamente o JWT salvo no navegador nas chamadas protegidas.
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('embrasmect_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
