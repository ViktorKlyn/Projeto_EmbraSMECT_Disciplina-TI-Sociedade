import { criarReserva } from '../models/reserva.model.js';
import { buscarSalaPorNome, buscarUsuarioPorId, listarSalas } from './usuario.repository.js';
import { carregarColecao, salvarColecoes } from './data-store.js';

const reservas = carregarColecao('reservas', []);
const inscricoes = carregarColecao('inscricoes', []);

function inscricoesDaReserva(reservaId) {
  return inscricoes.filter((inscricao) => inscricao.reservaId === Number(reservaId));
}

export function inscreverConvidadoPublico(reservaId, convidado) {
  const reserva = buscarReservaPorId(reservaId);
  if (!reserva || reserva.status !== 'aprovada') return { erro: 'Este evento ainda não está aberto para inscrição.', status: 409 };

  const emailNormalizado = convidado.email.trim().toLocaleLowerCase('pt-BR');
  const jaInscrito = inscricoes.some((inscricao) => {
    const emailInscrito = inscricao.email
      || (inscricao.convidadoId ? buscarUsuarioPorId(inscricao.convidadoId)?.email : '');
    return inscricao.reservaId === reserva.id
      && emailInscrito?.toLocaleLowerCase('pt-BR') === emailNormalizado;
  });
  if (jaInscrito) return { erro: 'Este e-mail já está inscrito neste evento.', status: 409 };

  const capacidade = salasDaReserva(reserva)
    .reduce((total, nomeSala) => total + (buscarSalaPorNome(nomeSala)?.capacidade || 0), 0) || 1;
  if (inscricoesDaReserva(reserva.id).length >= capacidade) return { erro: 'As vagas deste evento já foram preenchidas.', status: 409 };

  inscricoes.push({
    id: inscricoes.reduce((maiorId, item) => Math.max(maiorId, item.id || item.convidadoId || 0), 0) + 1,
    reservaId: reserva.id,
    convidadoId: convidado.convidadoId || null,
    nome: convidado.nome.trim(),
    email: emailNormalizado,
    assento: null,
  });
  salvarColecoes({ inscricoes });
  return { evento: incluirOcupacao(reserva) };
}

function eAdmPrincipal(usuario) {
  if (usuario.role !== 'admin') return false;
  return buscarUsuarioPorId(usuario.id)?.principal === true;
}

function salasDaReserva(reserva) {
  return Array.isArray(reserva.salas) && reserva.salas.length ? reserva.salas : [reserva.sala];
}

function incluirOcupacao(reserva, incluirConvidados = false, incluirEmailConvidados = false) {
  const capacidadeSala = salasDaReserva(reserva)
    .reduce((total, nomeSala) => total + (buscarSalaPorNome(nomeSala)?.capacidade || 0), 0) || 1;
  const inscritos = inscricoesDaReserva(reserva.id);
  return {
    ...reserva,
    capacidadeSala,
    participantes: inscritos.length,
    ocupacaoPercentual: Math.min(100, Math.round((inscritos.length / capacidadeSala) * 100)),
    ...(incluirConvidados ? { inscritos: inscritos.map((inscricao) => {
      const convidado = buscarUsuarioPorId(inscricao.convidadoId);
      return {
        id: inscricao.id ?? inscricao.convidadoId,
        nome: inscricao.nome || convidado?.nome || 'Convidado',
        ...(incluirEmailConvidados ? { email: inscricao.email || convidado?.email || '' } : {}),
        assento: inscricao.assento,
      };
    }) } : {}),
  };
}

export function listarReservas(usuario) {
  const visiveis = reservas.filter((reserva) => {
    if (usuario.role === 'admin') return true;
    if (usuario.role === 'organizer') return reserva.usuarioId === Number(usuario.id);
    if (usuario.role === 'guest') return reserva.status === 'aprovada' && inscricoes.some((inscricao) => inscricao.reservaId === reserva.id && inscricao.convidadoId === Number(usuario.id));
    return false;
  });

  return visiveis.map((reserva) => {
    if (usuario.role === 'guest') {
      const inscricao = inscricoes.find((item) => item.reservaId === reserva.id && item.convidadoId === Number(usuario.id));
      const assento = inscricao.assento || (reserva.gerenciarAssentos ? 'Aguardando atribuição' : 'Sem assento marcado');
      return { ...incluirOcupacao(reserva), assento };
    }
    return incluirOcupacao(reserva, true, eAdmPrincipal(usuario));
  });
}

export function listarEventosInscritos(usuario) {
  return reservas
    .filter((reserva) => reserva.status === 'aprovada'
      && inscricoes.some((inscricao) => inscricao.reservaId === reserva.id
        && inscricao.convidadoId === Number(usuario.id)))
    .map((reserva) => ({
      id: reserva.id,
      codigo: reserva.codigo,
      nome: reserva.nome,
      descricao: reserva.descricao || '',
      data: reserva.data,
      horaInicio: reserva.horaInicio,
      horaFim: reserva.horaFim,
      sala: reserva.sala,
      palestrante: reserva.palestrante,
      duracaoMinutos: reserva.duracaoMinutos,
    }));
}

export function listarReservasRelatorio(usuario) {
  const visiveis = reservas.filter(() => usuario.role === 'admin' || usuario.role === 'organizer');

  return visiveis.map((reserva) => {
    const criadoPorAdmin = reserva.criadorRole === 'admin'
      || (!reserva.criadorRole && buscarUsuarioPorId(reserva.usuarioId)?.role === 'admin');
    const podeVerInscritos = usuario.role === 'admin'
      || reserva.usuarioId === Number(usuario.id)
      || criadoPorAdmin;
    return incluirOcupacao(reserva, podeVerInscritos, eAdmPrincipal(usuario));
  });
}

export function listarEventosTV(usuario) {
  if (usuario.role !== 'admin' && usuario.role !== 'organizer') return [];
  return reservas
    .filter((reserva) => reserva.status === 'aprovada')
    .map((reserva) => incluirOcupacao(reserva));
}

export function buscarReservaPorId(id) {
  return reservas.find((reserva) => reserva.id === Number(id)) || null;
}

export function buscarEventoPorCodigo(codigo) {
  const codigoNormalizado = codigo.trim().toLocaleLowerCase('pt-BR');
  const reserva = reservas.find((item) => item.codigo.toLocaleLowerCase('pt-BR') === codigoNormalizado);
  return reserva ? incluirOcupacao(reserva) : null;
}

export function buscarEventoInscritoPorCodigo(codigo, usuario) {
  const codigoNormalizado = codigo.trim().toLocaleLowerCase('pt-BR');
  const reserva = reservas.find((item) => item.codigo.toLocaleLowerCase('pt-BR') === codigoNormalizado);
  if (!reserva || reserva.status !== 'aprovada' || usuario.role !== 'guest') return null;

  const inscricao = inscricoes.find((item) => item.reservaId === reserva.id && (
    item.convidadoId
      ? item.convidadoId === Number(usuario.id)
      : item.email?.toLocaleLowerCase('pt-BR') === usuario.email?.toLocaleLowerCase('pt-BR')
  ));
  if (!inscricao) return null;

  const evento = incluirOcupacao(reserva);
  const assento = inscricao.assento || (reserva.gerenciarAssentos ? 'Aguardando atribuição' : 'Sem assento marcado');
  return {
    codigo: evento.codigo,
    nome: evento.nome,
    descricao: evento.descricao || '',
    data: evento.data,
    horaInicio: evento.horaInicio,
    horaFim: evento.horaFim,
    sala: evento.sala,
    recurso: evento.recurso,
    palestrante: evento.palestrante,
    duracaoMinutos: evento.duracaoMinutos,
    brinde: evento.brinde,
    assento,
  };
}

export function renomearEspaco(id, nome) {
  const espaco = listarSalas().find((item) => item.id === Number(id));
  if (!espaco) return { erro: 'Espaço não encontrado.', status: 404 };

  const nomeNormalizado = typeof nome === 'string' ? nome.trim() : '';
  if (nomeNormalizado.length < 2 || nomeNormalizado.length > 80) {
    return { erro: 'Informe um nome de espaço entre 2 e 80 caracteres.', status: 400 };
  }

  const duplicado = listarSalas().some((item) => item.id !== espaco.id
    && item.nome.toLocaleLowerCase('pt-BR') === nomeNormalizado.toLocaleLowerCase('pt-BR'));
  if (duplicado) return { erro: 'Já existe um espaço com esse nome.', status: 409 };

  const nomeAnterior = espaco.nome;
  const espacoParaAtualizar = buscarSalaPorNome(nomeAnterior);
  espacoParaAtualizar.nome = nomeNormalizado;

  reservas.forEach((reserva) => {
    if (typeof reserva.sala === 'string') {
      reserva.sala = reserva.sala.split(' + ')
        .map((nomeSala) => nomeSala === nomeAnterior ? nomeNormalizado : nomeSala)
        .join(' + ');
    }
    if (Array.isArray(reserva.salas)) {
      reserva.salas = reserva.salas.map((nomeSala) => nomeSala === nomeAnterior ? nomeNormalizado : nomeSala);
    }
  });

  salvarColecoes({ salas: listarSalas(), reservas });
  return { espaco: { ...espacoParaAtualizar } };
}

export function reservaUsaSala(nomeSala) {
  return reservas.some((reserva) => salasDaReserva(reserva).includes(nomeSala));
}

export function temConflitoDeHorario({ salas: salasSolicitadas, data, horaInicio, horaFim, ignorarId }) {
  return reservas.some((reserva) => {
    if (reserva.id === Number(ignorarId) || reserva.status === 'rejeitada' || reserva.data !== data) return false;
    const compartilhaSala = salasSolicitadas.some((nomeSala) => salasDaReserva(reserva).includes(nomeSala));
    return compartilhaSala && horaInicio < reserva.horaFim && horaFim > reserva.horaInicio;
  });
}

export function salaEmUso(nomeSala) {
  return reservaUsaSala(nomeSala);
}

export function buscarEventosDisponiveis(usuarioId, identificador) {
  const hoje = new Date().toISOString().slice(0, 10);
  const termo = identificador.trim().toLocaleLowerCase('pt-BR');
  return reservas
    .filter((reserva) => reserva.status === 'aprovada'
      && reserva.data >= hoje
      && !inscricoes.some((item) => item.reservaId === reserva.id && item.convidadoId === Number(usuarioId))
      && (reserva.codigo.toLocaleLowerCase('pt-BR') === termo || reserva.nome.toLocaleLowerCase('pt-BR').includes(termo)))
    .map((reserva) => incluirOcupacao(reserva));
}

export function adicionarReserva(dados) {
  const reserva = criarReserva(dados, reservas.reduce((maiorId, item) => Math.max(maiorId, item.id), 0) + 1);
  reservas.push(reserva);
  salvarColecoes({ reservas });
  return incluirOcupacao(reserva);
}

export function atualizarReserva(id, dados) {
  const reserva = buscarReservaPorId(id);
  if (!reserva) return null;

  Object.assign(reserva, {
    nome: dados.nome,
    descricao: dados.descricao,
    data: dados.data,
    horaInicio: dados.horaInicio,
    horaFim: dados.horaFim,
    sala: dados.sala,
    salas: dados.salas,
    recurso: dados.recurso,
    gerenciarAssentos: dados.gerenciarAssentos,
    palestrante: dados.palestrante,
    duracaoMinutos: dados.duracaoMinutos,
    brinde: dados.brinde,
  });
  salvarColecoes({ reservas });
  return incluirOcupacao(reserva, true);
}

export function removerReserva(id) {
  const indice = reservas.findIndex((reserva) => reserva.id === Number(id));
  if (indice === -1) return null;

  const [reservaRemovida] = reservas.splice(indice, 1);
  for (let inscricaoIndice = inscricoes.length - 1; inscricaoIndice >= 0; inscricaoIndice -= 1) {
    if (inscricoes[inscricaoIndice].reservaId === reservaRemovida.id) inscricoes.splice(inscricaoIndice, 1);
  }
  salvarColecoes({ reservas, inscricoes });
  return reservaRemovida;
}

export function inscreverConvidado(reservaId, convidadoId) {
  const reserva = reservas.find((item) => item.id === Number(reservaId));
  if (!reserva || reserva.status !== 'aprovada') return { erro: 'Este evento não está aberto para inscrição.', status: 404 };
  if (reserva.data < new Date().toISOString().slice(0, 10)) return { erro: 'As inscrições para este evento foram encerradas.', status: 409 };
  if (inscricoes.some((item) => item.reservaId === reserva.id && item.convidadoId === Number(convidadoId))) return { erro: 'Você já está inscrito neste evento.', status: 409 };

  const capacidade = salasDaReserva(reserva)
    .reduce((total, nomeSala) => total + (buscarSalaPorNome(nomeSala)?.capacidade || 0), 0) || 1;
  if (inscricoesDaReserva(reserva.id).length >= capacidade) return { erro: 'As vagas deste evento já foram preenchidas.', status: 409 };

  const id = inscricoes.reduce((maiorId, item) => Math.max(maiorId, item.id || item.convidadoId || 0), 0) + 1;
  inscricoes.push({ id, reservaId: reserva.id, convidadoId: Number(convidadoId), assento: null });
  salvarColecoes({ inscricoes });
  return { evento: incluirOcupacao(reserva) };
}

export function atribuirAssento(reservaId, convidadoId, assento) {
  const reserva = reservas.find((item) => item.id === Number(reservaId));
  if (!reserva) return { erro: 'Evento não encontrado.', status: 404 };
  if (!reserva.gerenciarAssentos) return { erro: 'A gestão de assentos está desativada neste evento.', status: 409 };

  const inscricao = inscricoes.find((item) => item.reservaId === reserva.id
    && (item.id ?? item.convidadoId) === Number(convidadoId));
  if (!inscricao) return { erro: 'Convidado não inscrito neste evento.', status: 404 };
  if (inscricoes.some((item) => item.reservaId === reserva.id
    && (item.id ?? item.convidadoId) !== Number(convidadoId)
    && item.assento?.toLowerCase() === assento.toLowerCase())) {
    return { erro: 'Este assento já foi atribuído a outro convidado.', status: 409 };
  }

  inscricao.assento = assento;
  salvarColecoes({ inscricoes });
  return { inscrito: { id: inscricao.id ?? inscricao.convidadoId, assento: inscricao.assento } };
}

export function decidirReserva(id, decisao) {
  const reserva = reservas.find((item) => item.id === Number(id));
  if (!reserva) return null;

  reserva.status = decisao.status;
  reserva.motivoRejeicao = decisao.status === 'rejeitada' ? decisao.motivoRejeicao.trim() : null;
  salvarColecoes({ reservas });
  return incluirOcupacao(reserva);
}
