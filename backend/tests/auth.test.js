const assert = require('node:assert/strict');
const { once } = require('node:events');
const { test } = require('node:test');

require('./testDatabase').assertIsolatedTestDatabase();
process.env.AUTH_SECRET = 'test-secret-with-more-than-thirty-two-characters';

const app = require('../src/server');
const db = require('../src/config/db');
const { criarHashSenha, criarTokenSessao } = require('../src/services/authService');

test('login, sessão assinada, proteção de rotas e perfil de aprovação', async () => {
  const senhaAdmin = 'senha-de-teste-administrador';
  const senhaComum = 'senha-de-teste-usuario-comum';
  db.prepare('UPDATE usuarios SET senha_hash = ? WHERE id = 1').run(await criarHashSenha(senhaAdmin));
  db.prepare('UPDATE usuarios SET senha_hash = ? WHERE id = 3').run(await criarHashSenha(senhaComum));

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const semSessao = await fetch(`${baseUrl}/api/reservas`);
    assert.equal(semSessao.status, 401);

    const idComoToken = await fetch(`${baseUrl}/api/reservas`, {
      headers: { Authorization: 'Bearer 1' },
    });
    assert.equal(idComoToken.status, 401);

    const loginInvalido = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'gustavo@embrasmect.edu.br', senha: 'senha-incorreta-com-12' }),
    });
    assert.equal(loginInvalido.status, 401);

    const login = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'gustavo@embrasmect.edu.br', senha: senhaAdmin }),
    });
    assert.equal(login.status, 200);
    const { token, usuario } = await login.json();
    assert.equal(usuario.perfil, 'admin');
    assert.ok(token);

    const sessao = await fetch(`${baseUrl}/api/sessao`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(sessao.status, 200);
    assert.equal((await sessao.json()).usuario.id, 1);

    const usuarios = await fetch(`${baseUrl}/api/usuarios`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(usuarios.status, 200);

    const tokenComum = criarTokenSessao({ id: 3 });
    const aprovacaoComum = await fetch(`${baseUrl}/api/reservas/999/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${tokenComum}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'Aprovada' }),
    });
    assert.equal(aprovacaoComum.status, 403);

    const tokenFalsificado = `${token.split('.')[0]}.assinatura-invalida`;
    const sessaoFalsificada = await fetch(`${baseUrl}/api/sessao`, {
      headers: { Authorization: `Bearer ${tokenFalsificado}` },
    });
    assert.equal(sessaoFalsificada.status, 401);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});
