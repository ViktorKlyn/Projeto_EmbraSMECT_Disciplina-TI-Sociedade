// Cria o formato padrão de uma reserva antes de guardá-la no repositório.
export function criarReserva(dados, id) {
  return {
    id,
    codigo: `EVT-${String(id).padStart(6, '0')}`,
    nome: dados.nome.trim(),
    usuarioId: Number(dados.usuarioId),
    usuarioNome: dados.usuarioNome,
    criadorRole: dados.role,
    data: dados.data,
    horaInicio: dados.horaInicio,
    horaFim: dados.horaFim,
    sala: dados.sala,
    salas: dados.salas || [dados.sala],
    recurso: dados.recurso,
    status: dados.status || 'pendente',
    motivoRejeicao: null,
    gerenciarAssentos: Boolean(dados.gerenciarAssentos),
    palestrante: dados.palestrante || 'A definir',
    duracaoMinutos: Number(dados.duracaoMinutos) || 60,
    brinde: dados.brinde?.trim() || 'Não haverá brinde',
  };
}
