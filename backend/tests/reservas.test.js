const assert = require('node:assert/strict');
const path = require('node:path');
const { once } = require('node:events');
const { test } = require('node:test');

require('./testDatabase').assertIsolatedTestDatabase();
process.env.AUTH_SECRET = 'test-secret-with-more-than-thirty-two-characters';

const app = require('../src/server');
const db = require('../src/config/db');
const { criarTokenSessao } = require('../src/services/authService');

async function fecharServidor(server) {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}

test('criação serializada, aprovação sem conflito e persistência após reinício', async () => {
  let server = app.listen(0, '127.0.0.1');
  let dbAtivo = db;
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const token = criarTokenSessao({ id: 1 });
  const tokenUsuarioComum = criarTokenSessao({ id: 3 });
  const data = new Date().toISOString().slice(0, 10);
  const cabecalhosAdmin = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  async function solicitarReserva(sala) {
    return fetch(`${baseUrl}/api/reservas`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sala, data, recurso: 'Projetor' }),
    });
  }

  try {
    const salasIniciais = await fetch(`${baseUrl}/api/salas`, {
      headers: cabecalhosAdmin,
    });
    assert.equal(salasIniciais.status, 200);
    assert.ok((await salasIniciais.json()).salas.some((sala) => sala.nome === 'Auditório Principal'));

    const cadastroSala = await fetch(`${baseUrl}/api/salas`, {
      method: 'POST',
      headers: cabecalhosAdmin,
      body: JSON.stringify({ nome: 'Sala de teste', capacidade: 12 }),
    });
    assert.equal(cadastroSala.status, 201);

    const cadastroDuplicado = await fetch(`${baseUrl}/api/salas`, {
      method: 'POST',
      headers: cabecalhosAdmin,
      body: JSON.stringify({ nome: 'sala de TESTE', capacidade: 12 }),
    });
    assert.equal(cadastroDuplicado.status, 409);

    const cadastroSemPermissao = await fetch(`${baseUrl}/api/salas`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenUsuarioComum}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: 'Sala não autorizada', capacidade: 4 }),
    });
    assert.equal(cadastroSemPermissao.status, 403);

    const cadastroInvalido = await fetch(`${baseUrl}/api/salas`, {
      method: 'POST',
      headers: cabecalhosAdmin,
      body: JSON.stringify({ nome: 'Sala sem capacidade válida', capacidade: 0 }),
    });
    assert.equal(cadastroInvalido.status, 400);

    const simultaneas = await Promise.all([
      solicitarReserva('1 (Tropical)'),
      solicitarReserva('1 (Tropical)'),
    ]);
    assert.deepEqual(simultaneas.map((response) => response.status).sort(), [201, 409]);

    const reservaCriada = await simultaneas.find((response) => response.status === 201).json();
    const outraSala = await solicitarReserva('2 (Doko)');
    assert.equal(outraSala.status, 201);

    const edicaoConflitante = await fetch(
      `${baseUrl}/api/reservas/${reservaCriada.reserva.id}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sala: '2 (Doko)', data, recurso: 'Projetor' }),
      }
    );
    assert.equal(edicaoConflitante.status, 409);

    const tokenOutroUsuario = criarTokenSessao({ id: 2 });
    const edicaoAlheia = await fetch(
      `${baseUrl}/api/reservas/${reservaCriada.reserva.id}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${tokenOutroUsuario}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sala: '1 (Tropical)', data, recurso: 'Projetor' }),
      }
    );
    assert.equal(edicaoAlheia.status, 403);

    const edicaoValida = await fetch(
      `${baseUrl}/api/reservas/${reservaCriada.reserva.id}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sala: '1 (Tropical)', data, recurso: 'Microfone atualizado' }),
      }
    );
    assert.equal(edicaoValida.status, 200);
    assert.equal((await edicaoValida.json()).reserva.recurso, 'Microfone atualizado');

    const reservaConflitante = db.prepare(`
      INSERT INTO reservas (usuario_id, sala, data_reserva, recurso, status, criada_em)
      VALUES (?, ?, ?, ?, 'Pendente', ?)
    `).run(2, '1 (Tropical)', data, 'Microfone', new Date().toISOString());

    const aprovacaoComConflito = await fetch(
      `${baseUrl}/api/reservas/${reservaCriada.reserva.id}/status`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'Aprovada' }),
      }
    );
    assert.equal(aprovacaoComConflito.status, 409);

    db.prepare('DELETE FROM reservas WHERE id = ?').run(reservaConflitante.lastInsertRowid);
    const aprovacaoSemConflito = await fetch(
      `${baseUrl}/api/reservas/${reservaCriada.reserva.id}/status`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'Aprovada' }),
      }
    );
    assert.equal(aprovacaoSemConflito.status, 200);
    assert.equal((await aprovacaoSemConflito.json()).reserva.status, 'Aprovada');

    const salaDesconhecida = await solicitarReserva('Sala inexistente');
    assert.equal(salaDesconhecida.status, 400);

    const agendaAtualizada = await fetch(`${baseUrl}/api/reservas`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(agendaAtualizada.status, 200);
    const reservasAntesDoReinicio = (await agendaAtualizada.json()).reservas;
    assert.ok(reservasAntesDoReinicio.some((reserva) => (
      reserva.id === reservaCriada.reserva.id && reserva.status === 'Aprovada'
    )));

    await fecharServidor(server);
    server = null;
    dbAtivo.close();
    dbAtivo = null;

    const diretorioFonte = `${path.resolve(__dirname, '../src')}${path.sep}`;
    for (const modulo of Object.keys(require.cache)) {
      if (modulo.startsWith(diretorioFonte)) delete require.cache[modulo];
    }

    const appReiniciado = require('../src/server');
    dbAtivo = require('../src/config/db');
    server = appReiniciado.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const respostaReiniciada = await fetch(
      `http://127.0.0.1:${server.address().port}/api/reservas`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    assert.equal(respostaReiniciada.status, 200);
    const reservasDepoisDoReinicio = (await respostaReiniciada.json()).reservas;
    assert.ok(reservasDepoisDoReinicio.some((reserva) => (
      reserva.id === reservaCriada.reserva.id && reserva.status === 'Aprovada'
    )));
  } finally {
    if (server) await fecharServidor(server);
    if (dbAtivo) dbAtivo.close();
  }
});
