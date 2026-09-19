// Modelo simples usado pelos dados mockados da aplicação.
export function criarReserva(dados, id) {
  return { id, data: dados.data, sala: dados.sala, recurso: dados.recurso, status: 'pendente' };
}
