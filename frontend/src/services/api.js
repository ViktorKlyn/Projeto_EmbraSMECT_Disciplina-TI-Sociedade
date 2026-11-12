import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://projeto-embrasmect-disciplina-ti.onrender.com',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('embrasmect_token')
    || sessionStorage.getItem('embrasmect_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
