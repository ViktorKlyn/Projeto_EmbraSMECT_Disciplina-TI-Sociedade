import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { getEventoPublico, postInscricaoPublica } from '../controllers/reserva.controller.js';

const router = Router();
const limiteInscricaoPublica = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas de inscrição. Aguarde alguns minutos e tente novamente.' },
});

router.get('/:codigo', getEventoPublico);
router.post('/:codigo/inscricoes', limiteInscricaoPublica, postInscricaoPublica);

export default router;
