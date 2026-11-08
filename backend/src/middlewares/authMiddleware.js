const db = require('../config/db');
const { obterSegredoSessao, verificarTokenSessao } = require('../services/authService');

function authMiddleware(req, res, next) {
  if (!obterSegredoSessao()) {
    return res.status(503).json({ erro: 'A autenticação não está configurada no servidor.' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const sessao = verificarTokenSessao(token);
  if (!sessao) {
    return res.status(401).json({ erro: 'Sessão inválida ou expirada.' });
  }

  const user = db.prepare('SELECT id, nome, email, perfil FROM usuarios WHERE id = ?').get(sessao.usuarioId);
  if (!user) {
    return res.status(401).json({ erro: 'Usuário não encontrado para esta sessão.' });
  }

  req.user = user;
  next();
}

module.exports = authMiddleware;
