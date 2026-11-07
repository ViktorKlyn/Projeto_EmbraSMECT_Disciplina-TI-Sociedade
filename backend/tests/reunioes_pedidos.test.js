// Teste Automatizado de QA para o Item 7: Pedidos de Participação em Reunião
const assert = require('node:assert');

const BASE_URL = 'http://localhost:3000/api';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let data = null;
  const text = await response.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return { status: response.status, data };
}

async function runTests() {
  console.log('====================================================');
  console.log(' INICIANDO AUDITORIA E TESTES DO ITEM 7: REUNIÕES ');
  console.log('====================================================\n');

  // Limpeza de estado de testes anteriores para garantir idempotência
  const db = require('../src/config/db');
  db.prepare('DELETE FROM participantes_reuniao WHERE reuniao_id = 1 AND usuario_id = 1').run();
  db.prepare('DELETE FROM pedidos_participacao WHERE reuniao_id = 1 AND usuario_id = 1').run();
  db.prepare('DELETE FROM participantes_reuniao WHERE reuniao_id = 2 AND usuario_id = 4').run();
  db.prepare('DELETE FROM pedidos_participacao WHERE reuniao_id = 2 AND usuario_id = 4').run();
  db.prepare('DELETE FROM pedidos_participacao WHERE reuniao_id = 4 AND usuario_id = 1').run();

  let passedCount = 0;
  let totalCount = 0;

  async function test(name, fn) {
    totalCount++;
    try {
      await fn();
      console.log(`[PASSOU] ${name}`);
      passedCount++;
    } catch (err) {
      console.error(`[FALHOU] ${name}`);
      console.error('   Motivo:', err.message);
    }
  }

  // 1. Sem login (401)
  await test('1. Chamada sem autenticação deve retornar 401 Unauthorized', async () => {
    const res = await request('/reunioes/1/pedidos', { method: 'POST' });
    assert.strictEqual(res.status, 401, `Esperava status 401, recebeu ${res.status}`);
  });

  // 2. Reunião inexistente (404)
  await test('2. Pedido para reunião inexistente deve retornar 404 Not Found', async () => {
    const res = await request('/reunioes/99999/pedidos', {
      method: 'POST',
      headers: { Authorization: 'Bearer 3' }, // Ana
    });
    assert.strictEqual(res.status, 404, `Esperava status 404, recebeu ${res.status}`);
  });

  // 3. Reunião encerrada ou cancelada (400)
  await test('3. Pedido para reunião encerrada deve retornar 400 Bad Request', async () => {
    const res = await request('/reunioes/3/pedidos', {
      method: 'POST',
      headers: { Authorization: 'Bearer 3' }, // Reunião 3 está 'encerrada'
    });
    assert.strictEqual(res.status, 400, `Esperava status 400, recebeu ${res.status}`);
    assert.ok(res.data.erro.includes('encerrada'), 'Mensagem deve indicar reunião encerrada');
  });

  // 4. Criador pedindo para participar da própria reunião (400)
  await test('4. Criador não pode pedir para participar da própria reunião (retorna 400)', async () => {
    const res = await request('/reunioes/1/pedidos', {
      method: 'POST',
      headers: { Authorization: 'Bearer 2' }, // Reunião 1 foi criada pelo Prof. Ricardo (id: 2)
    });
    assert.strictEqual(res.status, 400, `Esperava status 400, recebeu ${res.status}`);
    assert.ok(res.data.erro.includes('criador da reunião'), 'Mensagem deve explicar que é o criador');
  });

  // 5. Pessoa que já participa tentando solicitar (400)
  await test('5. Pessoa que já participa da reunião não pode pedir novamente (retorna 400)', async () => {
    const res = await request('/reunioes/1/pedidos', {
      method: 'POST',
      headers: { Authorization: 'Bearer 3' }, // Ana já é participante da Reunião 1
    });
    assert.strictEqual(res.status, 400, `Esperava status 400, recebeu ${res.status}`);
    assert.ok(res.data.erro.includes('já é um participante'), 'Mensagem deve indicar participante confirmado');
  });

  // 6. Pedido com sucesso (201)
  let pedidoCriadoId = null;
  await test('6. Usuário elegível consegue enviar pedido de participação (retorna 201 com status pendente)', async () => {
    // Gustavo (id: 1) pede na Reunião 1 (criada por Ricardo, onde Gustavo não participa)
    // Primeiro removemos caso já exista de teste anterior
    const db = require('../src/config/db');
    db.prepare('DELETE FROM pedidos_participacao WHERE reuniao_id = 1 AND usuario_id = 1').run();

    const res = await request('/reunioes/1/pedidos', {
      method: 'POST',
      headers: { Authorization: 'Bearer 1' },
    });
    assert.strictEqual(res.status, 201, `Esperava status 201, recebeu ${res.status}`);
    assert.strictEqual(res.data.pedido.status, 'pendente');
    pedidoCriadoId = res.data.pedido.id;
  });

  // 7. Pedido duplicado (409)
  await test('7. Pedido duplicado do mesmo usuário para a mesma reunião retorna 409 Conflict', async () => {
    const res = await request('/reunioes/1/pedidos', {
      method: 'POST',
      headers: { Authorization: 'Bearer 1' },
    });
    assert.strictEqual(res.status, 409, `Esperava status 409, recebeu ${res.status}`);
  });

  // 8. Segurança: Usuário não-criador tentando aceitar pedido (403)
  await test('8. Usuário não-criador (ou outro participante) tentando aceitar recebe 403 Forbidden', async () => {
    assert.ok(pedidoCriadoId, 'ID do pedido deve existir');
    // Ana (id: 3) tenta aceitar o pedido na reunião do Prof. Ricardo (id: 2)
    const res = await request(`/pedidos/${pedidoCriadoId}`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer 3' },
      body: { acao: 'aceitar' },
    });
    assert.strictEqual(res.status, 403, `Esperava status 403, recebeu ${res.status}`);
    assert.ok(res.data.erro.includes('Somente o criador'), 'Deve conter mensagem de criador obrigatório');
  });

  // 9. Segurança: Admin não-criador tentando aceitar (403)
  await test('9. Usuário comum ou outro não-criador tentando aceitar recebe 403', async () => {
    const res = await request(`/pedidos/${pedidoCriadoId}`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer 4' }, // Bruno
      body: { acao: 'aceitar' },
    });
    assert.strictEqual(res.status, 403, `Esperava status 403, recebeu ${res.status}`);
  });

  // 10. Aceite quando a sala já está na capacidade máxima (400)
  await test('10. Aceitar quando a sala já está cheia (capacidade máxima) deve bloquear com 400', async () => {
    // Reunião 4 tem capacidade 3 e 3 participantes (Ricardo, Ana, Bruno).
    // Inserimos um pedido de Gustavo para testar capacidade cheia
    const db = require('../src/config/db');
    db.prepare('DELETE FROM pedidos_participacao WHERE reuniao_id = 4 AND usuario_id = 1').run();
    const info = db.prepare("INSERT INTO pedidos_participacao (reuniao_id, usuario_id, status, criado_em) VALUES (4, 1, 'pendente', ?)").run(new Date().toISOString());
    const pedidoLotadoId = info.lastInsertRowid;

    // Ricardo (criador da Reunião 4) tenta aceitar na sala lotada
    const res = await request(`/pedidos/${pedidoLotadoId}`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer 2' },
      body: { acao: 'aceitar' },
    });

    assert.strictEqual(res.status, 400, `Esperava status 400, recebeu ${res.status}`);
    assert.ok(res.data.erro.includes('Capacidade máxima atingida'), 'Deve alertar sobre capacidade');
  });

  // 11. Criador aceita pedido com sucesso (200)
  await test('11. Criador da reunião aceita pedido com sucesso (200, status aceito, entra na sala)', async () => {
    // Reunião 1 tem capacidade 3 e 2 participantes (Ricardo e Ana). Há 1 vaga livre.
    // Ricardo (id: 2) aceita o pedido de Gustavo (pedidoCriadoId)
    const res = await request(`/pedidos/${pedidoCriadoId}`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer 2' },
      body: { acao: 'aceitar' },
    });

    assert.strictEqual(res.status, 200, `Esperava status 200, recebeu ${res.status}`);
    assert.strictEqual(res.data.status, 'aceito');

    // Confirmar que Gustavo agora está na tabela participantes_reuniao
    const db = require('../src/config/db');
    const estaPresente = db.prepare('SELECT 1 FROM participantes_reuniao WHERE reuniao_id = 1 AND usuario_id = 1').get();
    assert.ok(estaPresente, 'Usuário deve estar na lista de participantes confirmados');
  });

  // 12. Tentar aceitar ou recusar um pedido já respondido (400)
  await test('12. Tentar aceitar ou recusar pedido já respondido deve retornar 400', async () => {
    const res = await request(`/pedidos/${pedidoCriadoId}`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer 2' },
      body: { acao: 'recusar' },
    });
    assert.strictEqual(res.status, 400, `Esperava status 400, recebeu ${res.status}`);
    assert.ok(res.data.erro.includes('já foi respondido anteriormente'), 'Deve informar que já foi respondido');
  });

  // 13. Recusar pedido de participação (200)
  await test('13. Criador recusa pedido: status muda para recusado e usuário não entra na sala', async () => {
    // Criamos um novo pedido de teste para a Reunião 2 (criada por Gustavo, id: 1) feito por Bruno (id: 4)
    const db = require('../src/config/db');
    db.prepare('DELETE FROM pedidos_participacao WHERE reuniao_id = 2 AND usuario_id = 4').run();
    db.prepare('DELETE FROM participantes_reuniao WHERE reuniao_id = 2 AND usuario_id = 4').run();

    const info = db.prepare("INSERT INTO pedidos_participacao (reuniao_id, usuario_id, status, criado_em) VALUES (2, 4, 'pendente', ?)").run(new Date().toISOString());
    const pedidoRecusarId = info.lastInsertRowid;

    // Gustavo (criador da Reunião 2) recusa
    const res = await request(`/pedidos/${pedidoRecusarId}`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer 1' },
      body: { acao: 'recusar' },
    });

    assert.strictEqual(res.status, 200, `Esperava status 200, recebeu ${res.status}`);
    assert.strictEqual(res.data.status, 'recusado');

    // Verifica que Bruno NÃO foi adicionado aos participantes
    const naoPresente = db.prepare('SELECT 1 FROM participantes_reuniao WHERE reuniao_id = 2 AND usuario_id = 4').get();
    assert.strictEqual(naoPresente, undefined, 'Usuário recusado NÃO deve ser participante');
  });

  // 14. Integridade e Exclusão em Cascata (ON DELETE CASCADE)
  await test('14. Exclusão de reunião remove em cascata pedidos e participantes associados', async () => {
    const db = require('../src/config/db');
    // Criar reunião temporária para testar cascade
    const info = db.prepare("INSERT INTO reunioes (titulo, sala_id, criador_id, data_reuniao, status) VALUES ('Reunião Temp Cascata', 1, 1, '2026-11-01', 'ativa')").run();
    const tempId = info.lastInsertRowid;
    db.prepare('INSERT INTO pedidos_participacao (reuniao_id, usuario_id, status, criado_em) VALUES (?, 3, \'pendente\', ?)').run(tempId, new Date().toISOString());
    db.prepare('INSERT INTO participantes_reuniao (reuniao_id, usuario_id) VALUES (?, 1)').run(tempId);

    // Deletar a reunião
    db.prepare('DELETE FROM reunioes WHERE id = ?').run(tempId);

    const pedidosRestantes = db.prepare('SELECT COUNT(*) as count FROM pedidos_participacao WHERE reuniao_id = ?').get(tempId).count;
    const participantesRestantes = db.prepare('SELECT COUNT(*) as count FROM participantes_reuniao WHERE reuniao_id = ?').get(tempId).count;

    assert.strictEqual(pedidosRestantes, 0, 'Pedidos devem ser limpos em cascata');
    assert.strictEqual(participantesRestantes, 0, 'Participantes devem ser limpos em cascata');
  });

  console.log('\n====================================================');
  console.log(` RESULTADO FINAL: ${passedCount} / ${totalCount} TESTES PASSARAM COM SUCESSO! `);
  console.log('====================================================');
}

runTests().catch(console.error);
