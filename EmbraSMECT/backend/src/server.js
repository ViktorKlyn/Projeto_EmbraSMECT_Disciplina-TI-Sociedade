// Carrega o .env antes dos módulos que leem JWT_SECRET durante a inicialização.
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import reservaRoutes from './routes/reserva.routes.js';
import authRoutes from './routes/auth.routes.js';
import usuariosRoutes from './routes/usuarios.routes.js';
import recursosTecnicosRoutes from './routes/recursos-tecnicos.routes.js';
import publicEventRoutes from './routes/public-event.routes.js';
import { logger } from './middlewares/logger.js';
import { exigirAutenticacao } from './middlewares/auth.js';

// Cria a aplicação Express que receberá as requisições da API.
const app = express();

// Origens permitidas a acessar a API pelo navegador.
// FRONTEND_URL e VERCEL_URL permitem configurar o endereço sem alterar o código.
const normalizeOrigin = (origin) => origin?.replace(/\/$/, '');
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5175',
  'https://projeto-embra-smect-disciplina-ti-sociedade.vercel.app',
  normalizeOrigin(process.env.FRONTEND_URL),
  normalizeOrigin(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null),
].filter(Boolean);

// Helmet adiciona cabeçalhos básicos de segurança às respostas.
app.use(helmet());

// CORS controla quais frontends podem fazer requisições para esta API.
// Requisições sem origem, como chamadas diretas ou ferramentas de teste, são aceitas.
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const requestOrigin = normalizeOrigin(origin);
    if (allowedOrigins.includes(requestOrigin)) return callback(null, true);
    if (/^http:\/\/localhost:\d+$/.test(requestOrigin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(requestOrigin) || requestOrigin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(new Error(`Origem não permitida: ${origin}`));
  },
  credentials: true,
}));

// Permite que o Express leia corpos de requisições no formato JSON.
app.use(express.json());

// Registra no terminal o método, a URL e o horário de cada requisição.
app.use(logger);

// Rota simples para confirmar que a API está online.
app.get('/', (req, res) => {
  res.json({ mensagem: 'API EmbraSMECT online', frontend: process.env.FRONTEND_URL || 'http://localhost:5173' });
});

// Rota usada para verificar rapidamente a disponibilidade do backend.
app.get('/api/status', (req, res) => {
  res.send('API funcionando');
});

// Login é público; as rotas de reservas passam antes pelo middleware JWT.
app.use('/api/login', authRoutes);
app.use('/api/eventos', publicEventRoutes);
app.use('/api/reservas', exigirAutenticacao, reservaRoutes);
app.use('/api/recursos-tecnicos', exigirAutenticacao, recursosTecnicosRoutes);
app.use('/api/usuarios', usuariosRoutes);

// PORT vem do ambiente, como o valor fornecido pelo Railway.
// No desenvolvimento, 5000 evita disputar a porta 3000 com outro processo.
const PORT = Number(process.env.PORT) || 5000;

// Inicia o servidor HTTP na porta escolhida.
app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));
