import axios from 'axios';

const baseApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const normalizedBaseUrl = baseApiUrl.endsWith('/api') ? baseApiUrl : `${baseApiUrl.replace(/\/$/, '')}/api`;

const api = axios.create({
  baseURL: normalizedBaseUrl,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('embrasmect_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
