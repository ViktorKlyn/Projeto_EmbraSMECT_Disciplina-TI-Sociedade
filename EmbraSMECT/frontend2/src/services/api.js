import axios from 'axios';

// Todas as chamadas do frontend passam por esta instância.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
});

export default api;
