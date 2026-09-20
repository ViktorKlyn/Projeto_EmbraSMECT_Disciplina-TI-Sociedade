import { buscarReservas, criarNovaReserva } from '../services/reserva.service.js';

// Retorna as reservas disponíveis para o frontend.
export function getReservas(req, res) {
  res.json(buscarReservas());
}

// Recebe uma nova reserva e transforma erros de validação em resposta HTTP 400.
export function postReserva(req, res) {
  try {
    res.status(201).json(criarNovaReserva(req.body));
  } catch (error) {
    res.status(400).json({ erro: error.message });
  }
}
