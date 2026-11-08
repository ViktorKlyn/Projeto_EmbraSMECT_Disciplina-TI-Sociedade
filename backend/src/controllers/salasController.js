const db = require('../config/db');

function listar(req, res) {
  const salas = db.prepare('SELECT id, nome, capacidade FROM salas ORDER BY nome COLLATE NOCASE').all();
  return res.json({ salas });
}

function criar(req, res) {
  if (req.user.perfil !== 'admin') {
    return res.status(403).json({ erro: 'Somente administradores podem cadastrar salas.' });
  }

  const nome = typeof req.body.nome === 'string' ? req.body.nome.trim() : '';
  const capacidade = req.body.capacidade;
  if (!nome || !Number.isSafeInteger(capacidade) || capacidade < 1) {
    return res.status(400).json({ erro: 'Informe o nome da sala e uma capacidade inteira maior que zero.' });
  }

  db.exec('BEGIN IMMEDIATE');
  try {
    const existente = db.prepare('SELECT id FROM salas WHERE nome = ? COLLATE NOCASE').get(nome);
    if (existente) {
      db.exec('ROLLBACK');
      return res.status(409).json({ erro: 'Já existe uma sala cadastrada com esse nome.' });
    }

    const resultado = db.prepare('INSERT INTO salas (nome, capacidade) VALUES (?, ?)').run(nome, capacidade);
    db.exec('COMMIT');
    const sala = db.prepare('SELECT id, nome, capacidade FROM salas WHERE id = ?').get(resultado.lastInsertRowid);
    return res.status(201).json({ sala });
  } catch (erro) {
    db.exec('ROLLBACK');
    throw erro;
  }
}

module.exports = { listar, criar };
