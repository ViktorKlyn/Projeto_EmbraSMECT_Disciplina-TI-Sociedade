import { adicionarReserva, listarReservas } from '../repositories/reserva.repository.js';

// A camada de serviço concentra as regras antes do acesso aos dados.
export function buscarReservas() {
  return listarReservas();
}

export function criarNovaReserva(dados) {
  // Toda reserva precisa destes três campos básicos.
  if (!dados.data || !dados.sala || !dados.recurso) {
    throw new Error('Data, sala e recurso são obrigatórios.');
  }

  return adicionarReserva(dados);
}
