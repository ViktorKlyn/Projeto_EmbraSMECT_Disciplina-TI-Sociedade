import {
  adicionarReserva,
  atualizarReserva as atualizarReservaRepo,
  buscarConflitoDeRecursoHorario,
  buscarReservaPorId,
  buscarEventoPorCodigo as buscarEventoPorCodigoRepo,
  buscarEventoInscritoPorCodigo as buscarEventoInscritoPorCodigoRepo,
  decidirReserva as decidirReservaRepo,
  inscreverConvidado as inscreverConvidadoRepo,
  inscreverConvidadoPublico as inscreverConvidadoPublicoRepo,
  buscarEventosDisponiveis as buscarEventosDisponiveisRepo,
  listarReservas,
  listarConflitosDeRecursosHorario,
  listarEventosDoMes,
  buscarProximoMesComEventos as buscarProximoMesComEventosRepo,
  buscarEventoReservado as buscarEventoReservadoRepo,
  listarEventosInscritos,
  listarReservasRelatorio,
  listarEventosTV,
  removerReserva as removerReservaRepo,
  temConflitoDeHorario,
} from '../repositories/reserva.repository.js';
import { buscarSalaPorNome, buscarUsuarioPorEmail, buscarUsuarioPorId } from '../repositories/usuario.repository.js';
import { listarRecursosTecnicos } from '../repositories/recurso-tecnico.repository.js';

// A camada de serviço concentra as regras antes do acesso aos dados.
export function buscarReservas(usuario) {
  return listarReservas(usuario);
}

export function buscarEventosInscritos(usuario) {
  return listarEventosInscritos(usuario);
}

function eAdmPrincipal(usuario) {
  return usuario.role === 'admin' && buscarUsuarioPorId(usuario.id)?.principal === true;
}

export function buscarEventosDoMes(usuario, mes) {
  if (usuario.role !== 'guest') {
    throw new Error('Somente convidados podem consultar os eventos do mês.');
  }
  if (typeof mes !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) {
    throw new Error('Informe o mês no formato AAAA-MM.');
  }
  return listarEventosDoMes(usuario, mes);
}

export function buscarProximoMesComEventos(usuario) {
  if (usuario.role !== 'guest') {
    throw new Error('Somente convidados podem consultar os eventos públicos.');
  }
  return buscarProximoMesComEventosRepo(usuario);
}

export function buscarEventoReservado(identificador, usuario) {
  if (usuario.role !== 'guest') {
    throw new Error('Somente convidados podem consultar eventos reservados.');
  }
  if (typeof identificador !== 'string' || !identificador.trim() || identificador.trim().length > 40) {
    throw new Error('Informe o ID ou código do evento reservado.');
  }
  const evento = buscarEventoReservadoRepo(identificador, usuario);
  if (!evento || evento.data < dataAtualISO()) {
    return { erro: 'Evento reservado não encontrado. Confira o ID ou código informado.', status: 404 };
  }
  if (buscarReservaPorId(evento.id)?.status !== 'aprovada') {
    return { erro: 'Evento reservado não encontrado. Confira o ID ou código informado.', status: 404 };
  }
  return { evento };
}

export function buscarEventoReservadoGestao(identificador, usuario) {
  if (!['admin', 'organizer'].includes(usuario.role)) {
    return { erro: 'Papel de usuário sem permissão para consultar eventos reservados.', status: 403 };
  }
  if (typeof identificador !== 'string' || !identificador.trim() || identificador.trim().length > 40) {
    return { erro: 'Informe o ID ou código do evento reservado.', status: 400 };
  }

  const termo = identificador.trim();
  const evento = listarReservas(usuario).find((reserva) => (
    reserva.reservado === true
    && (reserva.codigo.toLocaleLowerCase('pt-BR') === termo.toLocaleLowerCase('pt-BR')
      || (String(reserva.id) === termo && /^\d+$/.test(termo)))
  ));
  if (!evento || evento.status !== 'aprovada' || evento.data < dataAtualISO()) {
    return { erro: 'Evento reservado não encontrado. Confira o ID ou código informado.', status: 404 };
  }
  return { evento };
}

export function buscarEventoRelatorioGestao(identificador, usuario) {
  if (!['admin', 'organizer'].includes(usuario.role)) {
    return { erro: 'Papel de usuário sem permissão para consultar eventos de gestão.', status: 403 };
  }
  if (typeof identificador !== 'string' || !identificador.trim() || identificador.trim().length > 40) {
    return { erro: 'Informe o ID ou código do evento.', status: 400 };
  }

  const termo = identificador.trim();
  const evento = listarReservasRelatorio(usuario).find((reserva) => (
    reserva.codigo.toLocaleLowerCase('pt-BR') === termo.toLocaleLowerCase('pt-BR')
      || (String(reserva.id) === termo && /^\d+$/.test(termo))
  ));
  if (!evento) return { erro: 'Evento não encontrado.', status: 404 };
  return { evento };
}

export function buscarRelatorios(usuario) {
  return listarReservasRelatorio(usuario);
}

export function buscarEventosTV(usuario) {
  return listarEventosTV(usuario);
}

export function buscarConflitosDeRecursosHorario({ data, horaInicio, horaFim, ignorarId }, usuario) {
  if (!['admin', 'organizer'].includes(usuario.role)) {
    return { erro: 'Papel de usuário sem permissão para consultar a disponibilidade dos recursos.', status: 403 };
  }
  if (!dataIsoValida(data) || !horarioValido(horaInicio) || !horarioValido(horaFim) || horaFim <= horaInicio) {
    return { erro: 'Informe uma data e um intervalo de horários válidos para consultar a disponibilidade.', status: 400 };
  }
  if (ignorarId !== undefined && (!/^\d+$/.test(String(ignorarId)) || Number(ignorarId) < 1)) {
    return { erro: 'O identificador do evento a ignorar é inválido.', status: 400 };
  }

  return { conflitos: listarConflitosDeRecursosHorario({ data, horaInicio, horaFim, ignorarId }) };
}

export function buscarEventoPublico(codigo) {
  const evento = buscarEventoPorCodigoRepo(codigo);
  if (!evento || evento.reservado) return null;
  const {
    id,
    codigo: codigoEvento,
    nome,
    data,
    horaInicio,
    horaFim,
    sala,
    status,
    palestrante,
    duracaoMinutos,
    brinde,
    capacidadeSala,
    participantes,
  } = evento;
  return {
    id,
    codigo: codigoEvento,
    nome,
    descricao: evento.descricao || '',
    data,
    horaInicio,
    horaFim,
    sala,
    status,
    palestrante,
    duracaoMinutos,
    brinde,
    capacidadeSala,
    participantes,
  };
}

export function buscarEventoInscritoPorCodigo(codigo, usuario) {
  const evento = buscarEventoPorCodigoRepo(codigo);
  if (!evento) return { erro: 'Evento não encontrado.', status: 404 };

  const inscricao = buscarEventoInscritoPorCodigoRepo(codigo, usuario);
  if (!inscricao) return { erro: 'Esta conta não está inscrita neste evento.', status: 403 };
  return { evento: inscricao };
}

export function inscreverConvidadoPublico(codigo, dados) {
  const evento = buscarEventoPorCodigoRepo(codigo);
  if (!evento || evento.reservado) return { erro: 'Evento não encontrado.', status: 404 };
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
  if (!eAdmPrincipal(usuario) && reserva.usuarioId !== Number(usuario.id)) {
    return { erro: 'Somente quem cadastrou o evento ou o ADM pode alterá-lo.', status: 403 };
  }

  const atualizados = validarEDadosReserva({ ...reserva, ...dados });
  return { reserva: atualizarReservaRepo(id, atualizados) };
}

export function excluirReserva(id, usuario) {
  const reserva = buscarReservaPorId(id);
  if (!reserva) return { erro: 'Reserva não encontrada.', status: 404 };
  if (!eAdmPrincipal(usuario) && reserva.usuarioId !== Number(usuario.id)) {
    return { erro: 'Somente quem cadastrou o evento ou o ADM pode excluí-lo.', status: 403 };
  }

  const removida = removerReservaRepo(id);
  if (!removida) return { erro: 'Não foi possível excluir o evento.', status: 404 };
  return { reserva: removida };
}

function validarEDadosReserva(dados) {
  const nomesSalas = [...new Set((Array.isArray(dados.salas) ? dados.salas : [dados.sala])
    .filter((nomeSala) => typeof nomeSala === 'string')
    .map((nomeSala) => nomeSala.trim())
    .filter(Boolean))];
  const recursosInformados = normalizarRecursos(dados.recurso);
  const recursosCadastrados = listarRecursosTecnicos();
  const idsSalasSelecionadas = new Set(nomesSalas
    .map((nomeSala) => buscarSalaPorNome(nomeSala)?.id)
    .filter((id) => id !== undefined));
  const recursosDesconhecidos = recursosInformados.filter((nome) => !recursosCadastrados.some((recurso) => (
    recurso.nome.toLocaleLowerCase('pt-BR') === nome.toLocaleLowerCase('pt-BR')
  )));
  if (recursosDesconhecidos.length > 0) {
    const reservaExistente = dados.id ? buscarReservaPorId(dados.id) : null;
    const recursosOriginais = reservaExistente
      ? normalizarRecursos(reservaExistente.recurso).map((nome) => nome.toLocaleLowerCase('pt-BR'))
      : [];
    if (recursosDesconhecidos.some((nome) => !recursosOriginais.includes(nome.toLocaleLowerCase('pt-BR')))) {
      throw new Error('Selecione apenas recursos técnicos cadastrados.');
    }
  }
  const recursosFixosDeOutroEspaco = recursosInformados.filter((nome) => recursosCadastrados.some((recurso) => (
    recurso.nome.toLocaleLowerCase('pt-BR') === nome.toLocaleLowerCase('pt-BR')
    && recurso.salaId
    && !idsSalasSelecionadas.has(recurso.salaId)
  )));
  if (recursosFixosDeOutroEspaco.length > 0) {
    throw new Error('Um recurso fixado a outro espaço não pode ser selecionado para este evento.');
  }
  const recursosFixosSelecionados = recursosCadastrados
    .filter((recurso) => recurso.salaId && idsSalasSelecionadas.has(recurso.salaId))
    .map((recurso) => recurso.nome);
  const recursos = [...new Set([...recursosInformados, ...recursosFixosSelecionados].map((nome) => (
    recursosCadastrados.find((recurso) => recurso.nome.toLocaleLowerCase('pt-BR') === nome.toLocaleLowerCase('pt-BR'))?.nome || nome
  )))];
  if (!dataIsoValida(dados.data) || nomesSalas.length === 0 || recursos.length === 0 || typeof dados.nome !== 'string' || dados.nome.trim().length < 2 || dados.nome.trim().length > 160) {
    throw new Error('Informe nome do evento, data válida, espaço e pelo menos um recurso técnico.');
  }
  if (nomesSalas.length > 2) throw new Error('Um evento pode ocupar no máximo dois espaços unidos.');
  if (dados.data < dataAtualISO()) {
    throw new Error('Não é possível criar ou alterar eventos em datas passadas.');
  }
  if (recursos.some((recurso) => recurso.length > 80)) {
    throw new Error('Cada recurso técnico pode ter no máximo 80 caracteres.');
  }

  const salasSelecionadas = nomesSalas.map(buscarSalaPorNome);
  if (salasSelecionadas.some((sala) => !sala)) throw new Error('Selecione um espaço válido.');
  if (nomesSalas.length === 2 && (
    salasSelecionadas[0].conjugadaId !== salasSelecionadas[1].id
    || salasSelecionadas[1].conjugadaId !== salasSelecionadas[0].id
  )) {
    throw new Error('Os espaços selecionados não estão configurados para uso conjunto.');
  }
  if (!horarioValido(dados.horaInicio) || !horarioValido(dados.horaFim) || dados.horaFim <= dados.horaInicio) {
    throw new Error('Informe horários válidos e um horário de término posterior ao início.');
  }
  if (typeof dados.palestrante !== 'string' || !dados.palestrante.trim() || dados.palestrante.trim().length > 160) {
    throw new Error('Informe o nome do palestrante.');
  }
  const descricao = typeof dados.descricao === 'string' ? dados.descricao.trim() : '';
  if (descricao.length > 2000) {
    throw new Error('A descrição do evento deve ter no máximo 2000 caracteres.');
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
    const error = new Error('Um dos espaços selecionados já está reservado nesse horário.');
    error.status = 409;
    throw error;
  }
  const recursoEmConflito = buscarConflitoDeRecursoHorario({
    recursos,
    data: dados.data,
    horaInicio: dados.horaInicio,
    horaFim: dados.horaFim,
    ignorarId: dados.id,
  });
  if (recursoEmConflito) {
    const error = new Error(`O recurso técnico "${recursoEmConflito}" já está reservado nesse horário.`);
    error.status = 409;
    throw error;
  }
  return {
    nome: dados.nome.trim(),
    descricao,
    data: dados.data,
    horaInicio: dados.horaInicio,
    horaFim: dados.horaFim,
    sala: nomesSalas.join(' + '),
    salas: nomesSalas,
    recurso: recursos.join(', '),
    reservado: dados.reservado === true,
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

export function decidirReserva(id, dados) {
  if (!['aprovada', 'rejeitada'].includes(dados.status)) {
    throw new Error('A decisão deve ser aprovada ou rejeitada.');
  }
  if (dados.status === 'rejeitada' && !dados.motivoRejeicao?.trim()) {
    throw new Error('Informe o motivo da rejeição.');
  }

  return decidirReservaRepo(id, dados);
}
