import {
  buscarRelatorios,
  buscarReservas,
  buscarEventosDoMes,
  buscarProximoMesComEventos,
  buscarEventoReservado,
  buscarEventoReservadoGestao,
  buscarEventoRelatorioGestao,
  buscarEventosInscritos,
  buscarEventosTV,
  buscarConflitosDeRecursosHorario,
  criarNovaReserva,
  decidirReserva,
  excluirReserva,
  editarReserva,
  inscreverConvidado,
  buscarEventosDisponiveis,
  buscarEventoPublico,
  buscarEventoInscritoPorCodigo,
  inscreverConvidadoPublico,
} from '../services/reserva.service.js';

// Retorna as reservas disponíveis para o frontend.
export function getReservas(req, res) {
  res.json(buscarReservas(req.usuario));
}

export function getEventosInscritos(req, res) {
  res.json(buscarEventosInscritos(req.usuario));
}

export function getEventosDoMes(req, res) {
  try {
    return res.json(buscarEventosDoMes(req.usuario, req.query.mes));
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
}

export function getProximoMesComEventos(req, res) {
  return res.json(buscarProximoMesComEventos(req.usuario));
}

export function getEventoReservado(req, res) {
  try {
    const resultado = buscarEventoReservado(req.params.identificador, req.usuario);
    if (resultado.erro) return res.status(resultado.status).json({ erro: resultado.erro });
    return res.json(resultado.evento);
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
}

export function getEventoReservadoGestao(req, res) {
  const resultado = buscarEventoReservadoGestao(req.params.identificador, req.usuario);
  if (resultado.erro) return res.status(resultado.status).json({ erro: resultado.erro });
  return res.json(resultado.evento);
}

export function getEventoRelatorioGestao(req, res) {
  const resultado = buscarEventoRelatorioGestao(req.params.identificador, req.usuario);
  if (resultado.erro) return res.status(resultado.status).json({ erro: resultado.erro });
  return res.json(resultado.evento);
}

export function getRelatorios(req, res) {
  res.json(buscarRelatorios(req.usuario));
}

export function getEventosTV(req, res) {
  res.json(buscarEventosTV(req.usuario));
}

export function getDisponibilidadeRecursos(req, res) {
  const resultado = buscarConflitosDeRecursosHorario({
    data: req.query.data,
    horaInicio: req.query.horaInicio,
    horaFim: req.query.horaFim,
    ignorarId: req.query.ignorarId,
  }, req.usuario);
  if (resultado.erro) return res.status(resultado.status).json({ erro: resultado.erro });
  return res.json(resultado);
}

export function getEventoPublico(req, res) {
  const evento = buscarEventoPublico(req.params.codigo);
  if (!evento) return res.status(404).json({ erro: 'Evento não encontrado.' });
  return res.json(evento);
}

export function getEventoInscrito(req, res) {
  const resultado = buscarEventoInscritoPorCodigo(req.params.codigo, req.usuario);
  if (resultado.erro) return res.status(resultado.status).json({ erro: resultado.erro });
  return res.json(resultado.evento);
}

export function postInscricaoPublica(req, res) {
  const resultado = inscreverConvidadoPublico(req.params.codigo, req.body);
  if (resultado.erro) return res.status(resultado.status).json({ erro: resultado.erro });
  return res.status(201).json({ mensagem: 'Inscrição realizada com sucesso.', evento: resultado.evento });
}

// Recebe uma nova reserva e transforma erros de validação em resposta HTTP 400.
export function postReserva(req, res) {
  try {
    res.status(201).json(criarNovaReserva({ ...req.body, usuarioId: req.usuario.id, usuarioNome: req.usuario.nome, role: req.usuario.role }));
  } catch (error) {
    res.status(error.status || 400).json({ erro: error.message });
  }
}

export function patchReserva(req, res) {
  try {
    const reserva = decidirReserva(req.params.id, req.body);
    if (!reserva) return res.status(404).json({ erro: 'Reserva não encontrada.' });
    return res.json(reserva);
  } catch (error) {
    return res.status(error.status || 400).json({ erro: error.message });
  }
}

export function patchEvento(req, res) {
  try {
    const resultado = editarReserva(req.params.id, req.body, req.usuario);
    if (resultado.erro) return res.status(resultado.status).json({ erro: resultado.erro });
    return res.json(resultado.reserva);
  } catch (error) {
    return res.status(error.status || 400).json({ erro: error.message });
  }
}

export function deleteEvento(req, res) {
  const resultado = excluirReserva(req.params.id, req.usuario);
  if (resultado.erro) return res.status(resultado.status).json({ erro: resultado.erro });
  return res.json({ mensagem: 'Evento excluído com sucesso.' });
}

export function getEventosDisponiveis(req, res) {
  try {
    const identificador = typeof req.query.identificador === 'string' ? req.query.identificador : '';
    return res.json(buscarEventosDisponiveis(req.usuario.id, identificador));
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
}

export function postInscricao(req, res) {
  const resultado = inscreverConvidado(req.params.id, req.usuario);
  if (resultado.erro) return res.status(resultado.status).json({ erro: resultado.erro });
  return res.status(201).json(resultado.evento);
}
