import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  if (mode === 'production' && !env.VITE_API_URL?.trim()) {
    throw new Error('Configure VITE_API_URL com a URL pública do backend Railway antes de gerar o build de produção.');
  }

  return {
    plugins: [react()],
  };
});
