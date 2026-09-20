// Cria o formato padrão de uma reserva antes de guardá-la no repositório.
export function criarReserva(dados, id) {
  return { id, data: dados.data, sala: dados.sala, recurso: dados.recurso, status: 'pendente' };
}
