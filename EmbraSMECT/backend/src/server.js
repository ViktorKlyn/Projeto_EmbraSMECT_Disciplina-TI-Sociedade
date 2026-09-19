import express from 'express';
import cors from 'cors';
import reservaRoutes from './routes/reserva.routes.js';
import authRoutes from './routes/auth.routes.js';
import { logger } from './middlewares/logger.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(logger);
app.get('/api/status', (req, res) => res.send('API funcionando'));
app.use('/api/login', authRoutes);
app.use('/api/reservas', reservaRoutes);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API EmbraSMECT rodando em http://localhost:${port}`));
