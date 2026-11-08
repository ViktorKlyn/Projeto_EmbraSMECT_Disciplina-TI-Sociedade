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

function hojeEmSaoPaulo() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const valores = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
  return `${valores.year}-${valores.month}-${valores.day}`;
}

function criar(req, res) {
  const { sala, data, recurso } = req.body;
  if (
    typeof sala !== 'string' || !sala.trim() ||
    !dataValida(data) ||
    data < hojeEmSaoPaulo() ||
    (recurso !== undefined && typeof recurso !== 'string')
  ) {
    return res.status(400).json({ erro: 'Informe uma sala e uma data válida para a reserva.' });
  }
  let result;
  db.exec('BEGIN IMMEDIATE');
  try {
    const salaCadastrada = db.prepare('SELECT nome FROM salas WHERE nome = ? COLLATE NOCASE').get(sala.trim());
    if (!salaCadastrada) {
      db.exec('ROLLBACK');
      return res.status(400).json({ erro: 'A sala informada não está cadastrada.' });
    }

    const conflito = db.prepare(`
      SELECT id, status
      FROM reservas
      WHERE sala = ? COLLATE NOCASE
        AND data_reserva = ?
        AND status <> 'Rejeitada'
      LIMIT 1
    `).get(salaCadastrada.nome, data);
    if (conflito) {
      db.exec('ROLLBACK');
      return res.status(409).json({
        erro: `A sala "${salaCadastrada.nome}" já possui uma reserva ${conflito.status.toLowerCase()} nesta data.`,
      });
    }

    result = db.prepare(`
      INSERT INTO reservas (usuario_id, sala, data_reserva, recurso, status, criada_em)
      VALUES (?, ?, ?, ?, 'Pendente', ?)
    `).run(
      req.user.id,
      salaCadastrada.nome,
      data,
      recurso?.trim() || 'Nenhum recurso especial',
      new Date().toISOString()
    );
    db.exec('COMMIT');
  } catch (erro) {
    db.exec('ROLLBACK');
    throw erro;
  }

  const reserva = db.prepare(`
    SELECT id, usuario_id AS usuarioId, sala, data_reserva AS data, recurso, status
    FROM reservas WHERE id = ?
  `).get(result.lastInsertRowid);
  return res.status(201).json({ reserva });
}

async function editar(req, res) {
  const { sala, data, recurso } = req.body;
  if (
    typeof sala !== 'string' || !sala.trim() ||
    !dataValida(data) ||
    data < hojeEmSaoPaulo() ||
    (recurso !== undefined && typeof recurso !== 'string')
  ) {
    return res.status(400).json({ erro: 'Informe uma sala e uma data válida para a reserva.' });
  }

  const reserva = db.prepare('SELECT * FROM reservas WHERE id = ?').get(req.params.id);
  if (!reserva) return res.status(404).json({ erro: 'Reserva não encontrada.' });
  if (reserva.usuario_id !== req.user.id) {
    return res.status(403).json({ erro: 'Somente quem criou a reserva pode editá-la.' });
  }

  db.exec('BEGIN IMMEDIATE');
  try {
    const salaCadastrada = db.prepare('SELECT nome FROM salas WHERE nome = ? COLLATE NOCASE').get(sala.trim());
    if (!salaCadastrada) {
      db.exec('ROLLBACK');
      return res.status(400).json({ erro: 'A sala informada não está cadastrada.' });
    }

    if (reserva.status !== 'Rejeitada') {
      const conflito = db.prepare(`
        SELECT id
        FROM reservas
        WHERE id <> ?
          AND sala = ? COLLATE NOCASE
          AND data_reserva = ?
          AND status <> 'Rejeitada'
        LIMIT 1
      `).get(reserva.id, salaCadastrada.nome, data);
      if (conflito) {
        db.exec('ROLLBACK');
        return res.status(409).json({ erro: 'Já existe uma reserva ativa para esta sala e data.' });
      }
    }

    db.prepare(`
      UPDATE reservas
      SET sala = ?, data_reserva = ?, recurso = ?
      WHERE id = ?
    `).run(
      salaCadastrada.nome,
      data,
      recurso?.trim() || 'Nenhum recurso especial',
      reserva.id
    );
    db.exec('COMMIT');
  } catch (erro) {
    db.exec('ROLLBACK');
    throw erro;
  }

  const atualizadaCompleta = db.prepare('SELECT * FROM reservas WHERE id = ?').get(reserva.id);
  const atualizada = {
    id: atualizadaCompleta.id,
    usuarioId: atualizadaCompleta.usuario_id,
    sala: atualizadaCompleta.sala,
    data: atualizadaCompleta.data_reserva,
    recurso: atualizadaCompleta.recurso,
    status: atualizadaCompleta.status,
  };
  let sincronizacao = { sincronizado: false };
  if (atualizadaCompleta.status === 'Aprovada') {
    try {
      await googleCalendar.sincronizarEvento(
        atualizadaCompleta.usuario_id,
        'reserva',
        atualizadaCompleta.id,
        googleCalendar.eventoDeReserva(atualizadaCompleta)
      );
      sincronizacao = { sincronizado: true };
    } catch (erro) {
      sincronizacao = { sincronizado: false, erro: erro.message };
    }
  }
  return res.json({ reserva: atualizada, sincronizacao });
}

async function atualizarStatus(req, res) {
  if (!['admin', 'gestor'].includes(req.user.perfil)) {
    return res.status(403).json({ erro: 'Somente administradores e gestores podem avaliar reservas.' });
  }
  const { status } = req.body;
  if (!['Pendente', 'Aprovada', 'Rejeitada'].includes(status)) {
    return res.status(400).json({ erro: 'Status inválido.' });
  }
  const reserva = db.prepare('SELECT * FROM reservas WHERE id = ?').get(req.params.id);
  if (!reserva) return res.status(404).json({ erro: 'Reserva não encontrada.' });

  if (status !== 'Rejeitada') {
    const conflito = db.prepare(`
      SELECT id
      FROM reservas
      WHERE id <> ?
        AND sala = ? COLLATE NOCASE
        AND data_reserva = ?
        AND status <> 'Rejeitada'
      LIMIT 1
    `).get(reserva.id, reserva.sala, reserva.data_reserva);
    if (conflito) {
      return res.status(409).json({ erro: 'Não é possível manter a reserva: há outra solicitação ativa para esta sala e data.' });
    }
  }

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

module.exports = { listar, criar, editar, atualizarStatus, cancelar };
