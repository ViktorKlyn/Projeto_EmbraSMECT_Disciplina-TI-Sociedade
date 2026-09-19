import { buscarReservas, criarNovaReserva } from '../services/reserva.service.js';

export function getReservas(req, res) { res.json(buscarReservas()); }
export function postReserva(req, res) {
  try { res.status(201).json(criarNovaReserva(req.body)); }
  catch (error) { res.status(400).json({ erro: error.message }); }
}
