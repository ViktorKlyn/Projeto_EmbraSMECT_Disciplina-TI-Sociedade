import {
  atribuirAssento,
  buscarRelatorios,
  buscarReservas,
  buscarEventosTV,
  criarNovaReserva,
  decidirReserva,
  excluirReserva,
  editarReserva,
  inscreverConvidado,
  buscarEventosDisponiveis,
  buscarEventoPublico,
  inscreverConvidadoPublico,
} from '../services/reserva.service.js';

// Retorna as reservas disponíveis para o frontend.
export function getReservas(req, res) {
  res.json(buscarReservas(req.usuario));
}

export function getRelatorios(req, res) {
  res.json(buscarRelatorios(req.usuario));
}

export function getEventosTV(req, res) {
  res.json(buscarEventosTV(req.usuario));
}

export function getEventoPublico(req, res) {
  const evento = buscarEventoPublico(req.params.codigo);
  if (!evento) return res.status(404).json({ erro: 'Evento não encontrado.' });
  return res.json(evento);
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

export function patchAssento(req, res) {
  const assento = typeof req.body.assento === 'string' ? req.body.assento.trim() : '';
  if (!assento || assento.length > 80) return res.status(400).json({ erro: 'Informe um assento válido de até 80 caracteres.' });

  const resultado = atribuirAssento(req.params.id, req.params.convidadoId, assento, req.usuario);
  if (resultado.erro) return res.status(resultado.status).json({ erro: resultado.erro });
  return res.json(resultado.inscrito);
}
