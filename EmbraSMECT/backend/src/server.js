import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import reservaRoutes from './routes/reserva.routes.js';
import authRoutes from './routes/auth.routes.js';
import { logger } from './middlewares/logger.js';
import { exigirAutenticacao } from './middlewares/auth.js';

dotenv.config();

const app = express();
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5175',
  'https://projeto-embra-smect-disciplina-ti-sociedade.vercel.app',
  process.env.FRONTEND_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
].filter(Boolean);

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (/^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin) || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(new Error(`Origem não permitida: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(logger);

app.get('/', (req, res) => {
  res.json({ mensagem: 'API EmbraSMECT online', frontend: process.env.FRONTEND_URL || 'http://localhost:5173' });
});

app.get('/api/status', (req, res) => {
  res.send('API funcionando');
});

app.use('/api/login', authRoutes);
app.use('/api/reservas', exigirAutenticacao, reservaRoutes);

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));
