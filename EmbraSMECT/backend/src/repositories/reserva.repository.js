import { criarReserva } from '../models/reserva.model.js';

const reservas = [
  { id: 1, data: '2026-09-20', sala: 'Sala 101', recurso: 'Projetor', status: 'pendente' },
  { id: 2, data: '2026-09-21', sala: 'Sala 202', recurso: 'Quadro digital', status: 'aprovada' },
];

export function listarReservas() { return reservas; }
export function adicionarReserva(dados) {
  const reserva = criarReserva(dados, reservas.length + 1);
  reservas.push(reserva);
  return reserva;
}
