import {
  adicionarReserva,
  atribuirAssento as atribuirAssentoRepo,
  atualizarReserva as atualizarReservaRepo,
  buscarReservaPorId,
  buscarEventoPorCodigo as buscarEventoPorCodigoRepo,
  decidirReserva as decidirReservaRepo,
  inscreverConvidado as inscreverConvidadoRepo,
  inscreverConvidadoPublico as inscreverConvidadoPublicoRepo,
  buscarEventosDisponiveis as buscarEventosDisponiveisRepo,
  listarReservas,
  listarReservasRelatorio,
  listarEventosTV,
  removerReserva as removerReservaRepo,
  temConflitoDeHorario,
} from '../repositories/reserva.repository.js';
import { buscarSalaPorNome, buscarUsuarioPorEmail } from '../repositories/usuario.repository.js';

// A camada de serviço concentra as regras antes do acesso aos dados.
export function buscarReservas(usuario) {
  return listarReservas(usuario);
}

export function buscarRelatorios(usuario) {
  return listarReservasRelatorio(usuario);
}

export function buscarEventosTV(usuario) {
  return listarEventosTV(usuario);
}

export function buscarEventoPublico(codigo) {
  const evento = buscarEventoPorCodigoRepo(codigo);
  if (!evento) return null;
  const {
    codigo: codigoEvento,
    nome,
    data,
    horaInicio,
    horaFim,
    sala,
    recurso,
    status,
    gerenciarAssentos,
    palestrante,
    duracaoMinutos,
    brinde,
    capacidadeSala,
    participantes,
  } = evento;
  return {
    codigo: codigoEvento,
    nome,
    data,
    horaInicio,
    horaFim,
    sala,
    recurso,
    status,
    gerenciarAssentos,
    palestrante,
    duracaoMinutos,
    brinde,
    capacidadeSala,
    participantes,
  };
}

export function inscreverConvidadoPublico(codigo, dados) {
  const evento = buscarEventoPorCodigoRepo(codigo);
  if (!evento) return { erro: 'Evento não encontrado.', status: 404 };
  if (evento.status !== 'aprovada') return { erro: 'Este evento ainda não está aberto para inscrição.', status: 409 };
  if (evento.data < dataAtualISO()) return { erro: 'As inscrições para este evento foram encerradas.', status: 409 };

  const email = typeof dados.email === 'string' ? dados.email.trim().toLocaleLowerCase('pt-BR') : '';
  const nome = typeof dados.nome === 'string' ? dados.nome.trim() : '';
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) {
    return { erro: 'Informe um e-mail válido.', status: 400 };
  }

  const conta = buscarUsuarioPorEmail(email);
  if (conta && conta.role !== 'guest') {
    return { erro: 'Este e-mail pertence a uma conta de gestão e não pode ser usado como convidado.', status: 409 };
  }
  if (!conta && (nome.length < 2 || nome.length > 100)) {
    return { erro: 'Informe seu nome completo.', status: 400 };
  }

  return inscreverConvidadoPublicoRepo(evento.id, {
    convidadoId: conta?.id,
    nome: conta?.nome || nome,
    email,
  });
}

export function criarNovaReserva(dados) {
  const status = dados.role === 'admin' ? 'aprovada' : 'pendente';
  return adicionarReserva({ ...dados, ...validarEDadosReserva(dados), status });
}

export function editarReserva(id, dados, usuario) {
  const reserva = buscarReservaPorId(id);
  if (!reserva) return { erro: 'Reserva não encontrada.', status: 404 };
  if (reserva.usuarioId !== Number(usuario.id)) return { erro: 'Somente quem cadastrou o evento pode alterá-lo.', status: 403 };

  const atualizados = validarEDadosReserva({ ...reserva, ...dados });
  return { reserva: atualizarReservaRepo(id, atualizados) };
}

export function excluirReserva(id, usuario) {
  const reserva = buscarReservaPorId(id);
  if (!reserva) return { erro: 'Reserva não encontrada.', status: 404 };
  if (reserva.usuarioId !== Number(usuario.id)) return { erro: 'Somente quem cadastrou o evento pode excluí-lo.', status: 403 };

  const removida = removerReservaRepo(id);
  if (!removida) return { erro: 'Não foi possível excluir o evento.', status: 404 };
  return { reserva: removida };
}

function validarEDadosReserva(dados) {
  const recursos = normalizarRecursos(dados.recurso);
  const nomesSalas = [...new Set((Array.isArray(dados.salas) ? dados.salas : [dados.sala])
    .filter((nomeSala) => typeof nomeSala === 'string')
    .map((nomeSala) => nomeSala.trim())
    .filter(Boolean))];
  if (!dataIsoValida(dados.data) || nomesSalas.length === 0 || recursos.length === 0 || typeof dados.nome !== 'string' || dados.nome.trim().length < 2 || dados.nome.trim().length > 160) {
    throw new Error('Informe nome do evento, data válida, sala e pelo menos um recurso técnico.');
  }
  if (nomesSalas.length > 2) throw new Error('Um evento pode ocupar no máximo duas salas conjugadas.');
  if (dados.data < dataAtualISO()) {
    throw new Error('Não é possível criar ou alterar eventos em datas passadas.');
  }
  if (recursos.length > 10 || recursos.some((recurso) => recurso.length > 80)) {
    throw new Error('Adicione até 10 recursos técnicos, com no máximo 80 caracteres cada.');
  }

  const salasSelecionadas = nomesSalas.map(buscarSalaPorNome);
  if (salasSelecionadas.some((sala) => !sala)) throw new Error('Selecione uma sala válida.');
  if (nomesSalas.length === 2 && (
    salasSelecionadas[0].conjugadaId !== salasSelecionadas[1].id
    || salasSelecionadas[1].conjugadaId !== salasSelecionadas[0].id
  )) {
    throw new Error('As salas selecionadas não estão configuradas como conjugadas.');
  }
  if (!horarioValido(dados.horaInicio) || !horarioValido(dados.horaFim) || dados.horaFim <= dados.horaInicio) {
    throw new Error('Informe horários válidos e um horário de término posterior ao início.');
  }
  if (typeof dados.palestrante !== 'string' || !dados.palestrante.trim() || dados.palestrante.trim().length > 160) {
    throw new Error('Informe o nome do palestrante.');
  }

  const [inicioHora, inicioMinuto] = dados.horaInicio.split(':').map(Number);
  const [fimHora, fimMinuto] = dados.horaFim.split(':').map(Number);
  const duracaoMinutos = (fimHora * 60 + fimMinuto) - (inicioHora * 60 + inicioMinuto);
  if (temConflitoDeHorario({
    salas: nomesSalas,
    data: dados.data,
    horaInicio: dados.horaInicio,
    horaFim: dados.horaFim,
    ignorarId: dados.id,
  })) {
    const error = new Error('Uma das salas selecionadas já está reservada nesse horário.');
    error.status = 409;
    throw error;
  }
  return {
    nome: dados.nome.trim(),
    data: dados.data,
    horaInicio: dados.horaInicio,
    horaFim: dados.horaFim,
    sala: nomesSalas.join(' + '),
    salas: nomesSalas,
    recurso: recursos.join(', '),
    gerenciarAssentos: dados.gerenciarAssentos === true,
    palestrante: dados.palestrante.trim(),
    duracaoMinutos,
    brinde: typeof dados.brinde === 'string' && dados.brinde.trim() ? dados.brinde.trim() : 'Não haverá brinde',
  };
}

function normalizarRecursos(valor) {
  const valores = Array.isArray(valor) ? valor : typeof valor === 'string' ? [valor] : [];
  return [...new Set(valores
    .filter((recurso) => typeof recurso === 'string')
    .map((recurso) => recurso.trim())
    .filter(Boolean))];
}

function horarioValido(horario) {
  if (typeof horario !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(horario)) return false;
  return true;
}

function dataIsoValida(data) {
  if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  const dataNormalizada = new Date(`${data}T00:00:00.000Z`);
  return Number.isFinite(dataNormalizada.getTime()) && dataNormalizada.toISOString().slice(0, 10) === data;
}

function dataAtualISO() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const valores = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
  return `${valores.year}-${valores.month}-${valores.day}`;
}

export function buscarEventosDisponiveis(usuarioId, identificador) {
  if (typeof identificador !== 'string' || identificador.trim().length < 2) {
    throw new Error('Informe o código ou o nome do evento.');
  }
  return buscarEventosDisponiveisRepo(usuarioId, identificador);
}

export function inscreverConvidado(reservaId, usuario) {
  return inscreverConvidadoRepo(reservaId, usuario.id);
}

export function atribuirAssento(reservaId, convidadoId, assento, usuario) {
  const reserva = buscarReservaPorId(reservaId);
  if (!reserva) return { erro: 'Evento não encontrado.', status: 404 };
  if (usuario.role === 'organizer' && reserva.usuarioId !== Number(usuario.id)) {
    return { erro: 'Você só pode alterar assentos dos seus eventos.', status: 403 };
  }

  return atribuirAssentoRepo(reservaId, convidadoId, assento);
}

export function decidirReserva(id, dados) {
  if (!['aprovada', 'rejeitada'].includes(dados.status)) {
    throw new Error('A decisão deve ser aprovada ou rejeitada.');
  }
  if (dados.status === 'rejeitada' && !dados.motivoRejeicao?.trim()) {
    throw new Error('Informe o motivo da rejeição.');
  }

  return decidirReservaRepo(id, dados);
}
