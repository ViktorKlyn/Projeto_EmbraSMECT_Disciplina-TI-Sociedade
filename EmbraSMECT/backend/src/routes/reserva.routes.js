import { Router } from 'express';
import { getReservas, postReserva } from '../controllers/reserva.controller.js';

const router = Router();
router.get('/', getReservas);
router.post('/', postReserva);
export default router;
