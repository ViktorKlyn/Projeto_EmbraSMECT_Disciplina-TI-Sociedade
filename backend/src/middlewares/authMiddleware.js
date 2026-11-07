const db = require('../config/db');

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['x-user-id'];
  let userId = null;

  if (authHeader) {
    if (typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.slice(7).trim();
      userId = parseInt(token, 10);
      if (isNaN(userId) && token.startsWith('user-')) {
        userId = parseInt(token.replace('user-', ''), 10);
      }
    } else {
      userId = parseInt(authHeader, 10);
    }
  }

  // Se não fornecido nos headers, verifica se veio no query param para testes facilitados
  if (!userId && req.query.usuario_id) {
    userId = parseInt(req.query.usuario_id, 10);
  }

  if (!userId || isNaN(userId)) {
    return res.status(401).json({
      erro: 'Não autorizado. Autenticação obrigatória (forneça o header Authorization: Bearer <id> ou x-user-id).',
      status: 401,
    });
  }

  const user = db.prepare('SELECT id, nome, email, perfil FROM usuarios WHERE id = ?').get(userId);

  if (!user) {
    return res.status(401).json({
      erro: 'Usuário não encontrado ou credencial inválida.',
      status: 401,
    });
  }

  req.user = user;
  next();
}

module.exports = authMiddleware;
