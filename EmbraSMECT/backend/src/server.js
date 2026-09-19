import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import reservaRoutes from './routes/reserva.routes.js';
import authRoutes from './routes/auth.routes.js';
import { logger } from './middlewares/logger.js';
import { exigirAutenticacao } from './middlewares/auth.js';

const app = express();
const origensPermitidas = new Set([
	process.env.FRONTEND_URL || 'http://localhost:5173',
	'http://127.0.0.1:5173',
]);
app.use(helmet());
app.use(cors({ origin: (origin, callback) => {
	if (!origin || origensPermitidas.has(origin)) return callback(null, true);
	return callback(new Error('Origem não permitida.'));
} }));
app.use(express.json());
app.use(logger);
app.get('/', (req, res) => res.json({ mensagem: 'API EmbraSMECT online', frontend: 'http://localhost:5173' }));
app.get('/api/status', (req, res) => res.send('API funcionando'));
app.use('/api/login', authRoutes);
app.use('/api/reservas', exigirAutenticacao, reservaRoutes);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API EmbraSMECT rodando em http://localhost:${port}`));
