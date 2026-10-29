const db = require('../config/db');
const googleCalendar = require('../services/googleCalendarService');

function listar(req, res) {
  const reservas = db.prepare(`
    SELECT id, usuario_id AS usuarioId, sala, data_reserva AS data, recurso, status
    FROM reservas
    ORDER BY id DESC
  `).all();
  return res.json({ reservas });
}

function dataValida(data) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data || '')) return false;
  const dataUtc = new Date(`${data}T00:00:00Z`);
  return !Number.isNaN(dataUtc.getTime()) && dataUtc.toISOString().slice(0, 10) === data;
}

function criar(req, res) {
  const { sala, data, recurso } = req.body;
  if (
    typeof sala !== 'string' || !sala.trim() ||
    !dataValida(data) ||
    data < new Date().toISOString().slice(0, 10) ||
    (recurso !== undefined && typeof recurso !== 'string')
  ) {
    return res.status(400).json({ erro: 'Informe uma sala e uma data válida para a reserva.' });
  }
  const result = db.prepare(`
    INSERT INTO reservas (usuario_id, sala, data_reserva, recurso, status, criada_em)
    VALUES (?, ?, ?, ?, 'Pendente', ?)
  `).run(req.user.id, sala.trim(), data, (recurso || 'Nenhum recurso especial').trim(), new Date().toISOString());
  const reserva = db.prepare(`
    SELECT id, usuario_id AS usuarioId, sala, data_reserva AS data, recurso, status
    FROM reservas WHERE id = ?
  `).get(result.lastInsertRowid);
  return res.status(201).json({ reserva });
}

async function atualizarStatus(req, res) {
  const { status } = req.body;
  if (!['Pendente', 'Aprovada', 'Rejeitada'].includes(status)) {
    return res.status(400).json({ erro: 'Status inválido.' });
  }
  const reserva = db.prepare('SELECT * FROM reservas WHERE id = ?').get(req.params.id);
  if (!reserva) return res.status(404).json({ erro: 'Reserva não encontrada.' });

  db.prepare('UPDATE reservas SET status = ? WHERE id = ?').run(status, reserva.id);
  let sincronizacao = { sincronizado: false };
  if (status === 'Aprovada') {
    try {
      await googleCalendar.sincronizarEvento(
        reserva.usuario_id,
        'reserva',
        reserva.id,
        googleCalendar.eventoDeReserva(reserva)
      );
      sincronizacao = { sincronizado: true };
    } catch (erro) {
      sincronizacao = { sincronizado: false, erro: erro.message };
    }
  } else {
    try {
      await googleCalendar.removerEvento(reserva.usuario_id, 'reserva', reserva.id);
    } catch (erro) {
      sincronizacao = { sincronizado: false, erro: erro.message };
    }
  }
  const atualizada = db.prepare(`
    SELECT id, usuario_id AS usuarioId, sala, data_reserva AS data, recurso, status
    FROM reservas WHERE id = ?
  `).get(reserva.id);
  return res.json({ reserva: atualizada, sincronizacao });
}

async function cancelar(req, res) {
  const reserva = db.prepare('SELECT id, usuario_id FROM reservas WHERE id = ?').get(req.params.id);
  if (!reserva) return res.status(404).json({ erro: 'Reserva não encontrada.' });
  if (reserva.usuario_id !== req.user.id) {
    return res.status(403).json({ erro: 'Somente quem criou a reserva pode cancelá-la.' });
  }
  try {
    await googleCalendar.removerEvento(reserva.usuario_id, 'reserva', reserva.id);
    db.prepare('DELETE FROM reservas WHERE id = ?').run(reserva.id);
    return res.json({ mensagem: 'Reserva cancelada.', sincronizacao: { sincronizado: true } });
  } catch (erro) {
    return res.status(502).json({
      erro: `Não foi possível cancelar a reserva no Google Agenda: ${erro.message}`,
    });
  }
}

module.exports = { listar, criar, atualizarStatus, cancelar };
