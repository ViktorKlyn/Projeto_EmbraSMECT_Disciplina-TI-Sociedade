import { Router } from 'express';
import { getReservas, postReserva } from '../controllers/reserva.controller.js';

const router = Router();

// Cada rota delega o processamento para o controlador de reservas.
router.get('/', getReservas);
router.post('/', postReserva);
export default router;
