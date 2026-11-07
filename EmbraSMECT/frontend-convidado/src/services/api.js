import axios from 'axios';

const baseApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const normalizedBaseUrl = baseApiUrl.endsWith('/api') ? baseApiUrl : `${baseApiUrl.replace(/\/$/, '')}/api`;
const TOKEN_KEY = 'embrasmect_guest_token';

const api = axios.create({
  baseURL: normalizedBaseUrl,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export { TOKEN_KEY };
export default api;
