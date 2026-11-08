const db = require('../config/db');
const {
  criarTokenSessao,
  obterSegredoSessao,
  verificarSenha,
} = require('../services/authService');

async function login(req, res) {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const senha = typeof req.body?.senha === 'string' ? req.body.senha : '';

  if (!/^\S+@\S+\.\S+$/.test(email) || senha.length < 12) {
    return res.status(400).json({ erro: 'Informe um e-mail e uma senha válida.' });
  }
  if (!obterSegredoSessao()) {
    return res.status(503).json({ erro: 'A autenticação não está configurada no servidor.' });
  }

  const usuario = db.prepare(`
    SELECT id, nome, email, perfil, senha_hash AS senhaHash
    FROM usuarios
    WHERE lower(email) = ?
  `).get(email);
  const senhaValida = await verificarSenha(senha, usuario?.senhaHash);
  if (!usuario || !senhaValida) {
    return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
  }

  const { senhaHash, ...dadosPublicos } = usuario;
  return res.json({
    token: criarTokenSessao(usuario),
    usuario: dadosPublicos,
  });
}

function sessao(req, res) {
  const { id, nome, email, perfil } = req.user;
  return res.json({ usuario: { id, nome, email, perfil } });
}

module.exports = { login, sessao };
