import { adicionarReserva, listarReservas } from '../repositories/reserva.repository.js';

export function buscarReservas() { return listarReservas(); }
export function criarNovaReserva(dados) {
  if (!dados.data || !dados.sala || !dados.recurso) throw new Error('Data, sala e recurso são obrigatórios.');
  return adicionarReserva(dados);
}
