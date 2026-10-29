// Suíte Completa de Testes Automatizados de QA: Regras de Negócio e Casos de Borda de Reuniões
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
  console.log('======================================================================');
  console.log(' AUDITORIA COMPLETA DE QA: REGRAS DE REUNIÕES PÚBLICAS / PRIVADAS ');
  console.log('======================================================================\n');

  const db = require('../src/config/db');
  const { obterDataLocalISO } = require('../src/controllers/reuniaoController');

  // Limpeza de estado para garantir idempotência antes de iniciar os testes
  db.prepare('DELETE FROM pedidos_participacao').run();
  db.prepare('DELETE FROM convites_reuniao').run();
  db.prepare('DELETE FROM participantes_reuniao WHERE reuniao_id = 1 AND usuario_id NOT IN (2, 3)').run();
  db.prepare('DELETE FROM participantes_reuniao WHERE reuniao_id = 2 AND usuario_id != 1').run();
  db.prepare("UPDATE reunioes SET tipo = 'publica' WHERE id = 1").run();
  db.prepare("UPDATE reunioes SET tipo = 'privada' WHERE id = 2").run();
  db.prepare("INSERT OR IGNORE INTO lideres_reuniao (reuniao_id, usuario_id) VALUES (1, 3)").run();
  db.prepare("INSERT OR IGNORE INTO lideres_reuniao (reuniao_id, usuario_id) VALUES (2, 2)").run();

  let passed = 0;
  let total = 0;

  async function testCase(num, title, fn) {
    total++;
    try {
      await fn();
      console.log(`[PASSOU] Caso ${num}: ${title}`);
      passed++;
    } catch (err) {
      console.error(`[FALHOU] Caso ${num}: ${title}`);
      console.error('   -> Motivo:', err.message);
    }
  }

  // 1. Usuário comum pede para entrar em reunião pública futura
  await testCase(1, 'Usuário comum pede para entrar em reunião pública futura -> Deve funcionar (201)', async () => {
    // Bruno (id: 4) pede na Reunião 1 (Pública, 2026-10-25)
    const res = await request('/reunioes/1/pedidos', {
      method: 'POST',
      headers: { Authorization: 'Bearer 4' },
    });
    assert.strictEqual(res.status, 201, `Esperava 201, recebeu ${res.status}`);
    assert.strictEqual(res.data.pedido.status, 'pendente');
  });

  // 2. Usuário comum pede para entrar em reunião privada futura
  await testCase(2, 'Usuário comum pede para entrar em reunião privada futura -> Bloqueado com 403', async () => {
    // Bruno (id: 4) tenta pedir na Reunião 2 (Privada, criada por Gustavo)
    const res = await request('/reunioes/2/pedidos', {
      method: 'POST',
      headers: { Authorization: 'Bearer 4' },
    });
    assert.strictEqual(res.status, 403, `Esperava 403, recebeu ${res.status}`);
    assert.ok(res.data.erro.includes('privada'), 'Mensagem deve indicar que reunião privada não aceita pedidos');
  });

  // 3. Criador envia convite em reunião privada futura
  await testCase(3, 'Criador envia convite em reunião privada futura -> Deve funcionar (201)', async () => {
    // Gustavo (id: 1, criador da Reunião 2) convida Bruno (id: 4)
    const res = await request('/reunioes/2/convites', {
      method: 'POST',
      headers: { Authorization: 'Bearer 1' },
      body: { usuario_id: 4 },
    });
    assert.strictEqual(res.status, 201, `Esperava 201, recebeu ${res.status}`);
    assert.ok(res.data.convite_id, 'Deve retornar ID do convite criado');
  });

  // 4. Líder envia convite em reunião privada futura
  await testCase(4, 'Líder envia convite em reunião privada futura -> Deve funcionar (201)', async () => {
    // Ricardo (id: 2 é líder na Reunião 2) convida Ana (id: 3)
    const res = await request('/reunioes/2/convites', {
      method: 'POST',
      headers: { Authorization: 'Bearer 2' },
      body: { usuario_id: 3 },
    });
    assert.strictEqual(res.status, 201, `Esperava 201, recebeu ${res.status}`);
  });

  // 5. Participante comum (não líder) tenta convidar em reunião privada
  await testCase(5, 'Participante comum (não líder) tenta convidar em reunião privada -> Bloqueado com 403', async () => {
    // Bruno (id: 4, usuário comum não-líder) tenta convidar alguém na Reunião 2
    const res = await request('/reunioes/2/convites', {
      method: 'POST',
      headers: { Authorization: 'Bearer 4' },
      body: { usuario_id: 3 },
    });
    assert.strictEqual(res.status, 403, `Esperava 403, recebeu ${res.status}`);
    assert.ok(res.data.erro.includes('Somente o criador ou líderes'), 'Mensagem deve exigir criador ou líder');
  });

  // 6. Pedido ou convite em reunião pública ou privada já realizada
  await testCase(6, 'Pedido ou convite em reunião já realizada -> Bloqueado com 400', async () => {
    // Reunião 3 é uma reunião pública passada (data 2026-10-10)
    const resPedido = await request('/reunioes/3/pedidos', {
      method: 'POST',
      headers: { Authorization: 'Bearer 4' },
    });
    assert.strictEqual(resPedido.status, 400, `Esperava 400 para pedido, recebeu ${resPedido.status}`);

    const resConvite = await request('/reunioes/3/convites', {
      method: 'POST',
      headers: { Authorization: 'Bearer 2' }, // Ricardo é criador
      body: { usuario_id: 4 },
    });
    assert.strictEqual(resConvite.status, 400, `Esperava 400 para convite, recebeu ${resConvite.status}`);
  });

  // 7. Chamada direta à API para reunião privada sem permissão
  await testCase(7, 'Acesso direto à API de reunião privada por usuário não participante/não convidado -> Bloqueado com 403', async () => {
    // Reunião temporária estritamente secreta
    const rTemp = db.prepare("INSERT INTO reunioes (titulo, sala_id, criador_id, data_reuniao, hora_inicio, hora_fim, tipo, status) VALUES ('Diretoria Sigilosa', 1, 1, '2026-10-30', '14:00', '15:00', 'privada', 'ativa')").run();
    const tempId = rTemp.lastInsertRowid;

    // Bruno (id: 4, sem convite e não participante) tenta acessar GET /api/reunioes/:id
    const res = await request(`/reunioes/${tempId}`, {
      headers: { Authorization: 'Bearer 4' },
    });
    assert.strictEqual(res.status, 403, `Esperava 403, recebeu ${res.status}`);

    // Limpeza
    db.prepare('DELETE FROM reunioes WHERE id = ?').run(tempId);
  });

  // 8. Reunião que está acontecendo agora (iniciou, mas não terminou)
  await testCase(8, 'Reunião em andamento (iniciada, mas não concluída) -> Bloqueado com 400', async () => {
    // Cria reunião com data local de hoje e horários cobrindo o minuto atual
    const dataHoje = obterDataLocalISO(new Date());
    const hIni = '00:00';
    const hFim = '23:59';

    const rAndamento = db.prepare(`
      INSERT INTO reunioes (titulo, sala_id, criador_id, data_reuniao, hora_inicio, hora_fim, tipo, status)
      VALUES ('Reunião ao Vivo em Andamento', 1, 1, ?, ?, ?, 'publica', 'ativa')
    `).run(dataHoje, hIni, hFim);
    const andamentoId = rAndamento.lastInsertRowid;

    const res = await request(`/reunioes/${andamentoId}/pedidos`, {
      method: 'POST',
      headers: { Authorization: 'Bearer 4' },
    });
    assert.strictEqual(res.status, 400, `Esperava 400, recebeu ${res.status}`);
    assert.ok(res.data.erro.includes('iniciada'), 'Mensagem deve indicar reunião já iniciada');

    // Limpeza
    db.prepare('DELETE FROM reunioes WHERE id = ?').run(andamentoId);
  });

  // 9. Reunião muda de pública para privada com pedidos pendentes
  await testCase(9, 'Reunião muda de pública para privada -> Pedidos pendentes são cancelados/recusados por segurança', async () => {
    const rPublica = db.prepare("INSERT INTO reunioes (titulo, sala_id, criador_id, data_reuniao, hora_inicio, hora_fim, tipo, status) VALUES ('Mesa Redonda Aberta', 1, 1, '2026-11-15', '14:00', '15:00', 'publica', 'ativa')").run();
    const pubId = rPublica.lastInsertRowid;

    // Bruno envia pedido pendente
    db.prepare("INSERT INTO pedidos_participacao (reuniao_id, usuario_id, status, criado_em) VALUES (?, 4, 'pendente', ?)").run(pubId, new Date().toISOString());

    // Criador altera privacidade para privada
    const res = await request(`/reunioes/${pubId}/privacidade`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer 1' },
      body: { tipo: 'privada' },
    });
    assert.strictEqual(res.status, 200);

    // Confirma que pedido de Bruno agora está recusado/cancelado
    const pedAtual = db.prepare('SELECT status FROM pedidos_participacao WHERE reuniao_id = ? AND usuario_id = 4').get(pubId);
    assert.strictEqual(pedAtual.status, 'recusado', 'Pedido pendente deve ser cancelado/recusado na transição');

    // Limpeza
    db.prepare('DELETE FROM reunioes WHERE id = ?').run(pubId);
  });

  // 10. Fuso horário: checagem "já aconteceu"
  await testCase(10, 'Fuso horário: Verificação temporal consistente baseada no relógio do servidor', async () => {
    const { verificarEstadoTemporal } = require('../src/controllers/reuniaoController');
    const estadoOntem = verificarEstadoTemporal('2020-01-01', '10:00', '11:00');
    assert.strictEqual(estadoOntem, 'passada');

    const estadoAnoQueVem = verificarEstadoTemporal('2099-01-01', '10:00', '11:00');
    assert.strictEqual(estadoAnoQueVem, 'futura');
  });

  // 11. Convite duplicado ou convite para quem já participa
  await testCase(11, 'Convite duplicado ou para quem já participa -> Bloqueado com 400 ou 409', async () => {
    // Reunião 1: Ana (id: 3) já é participante confirmada
    const resJaParticipa = await request('/reunioes/1/convites', {
      method: 'POST',
      headers: { Authorization: 'Bearer 2' }, // Ricardo
      body: { usuario_id: 3 },
    });
    assert.strictEqual(resJaParticipa.status, 400, `Esperava 400, recebeu ${resJaParticipa.status}`);

    // Reunião 2: Bruno já recebeu convite pendente no Caso 3
    const resDuplicado = await request('/reunioes/2/convites', {
      method: 'POST',
      headers: { Authorization: 'Bearer 1' },
      body: { usuario_id: 4 },
    });
    assert.strictEqual(resDuplicado.status, 409, `Esperava 409, recebeu ${resDuplicado.status}`);
  });

  // 12. Lotação: convite ou aceite quando a sala já está na capacidade máxima
  await testCase(12, 'Lotação: Tentar aceitar convite/pedido quando a sala está cheia -> Bloqueado com 400', async () => {
    // Reunião 4 tem capacidade 3 e 3 participantes (Ricardo, Ana, Bruno)
    // Tentar convidar para reunião cheia
    const resLotada = await request('/reunioes/4/convites', {
      method: 'POST',
      headers: { Authorization: 'Bearer 2' },
      body: { usuario_id: 1 },
    });
    assert.strictEqual(resLotada.status, 400, `Esperava 400, recebeu ${resLotada.status}`);
    assert.ok(resLotada.data.erro.includes('Capacidade máxima'), 'Mensagem deve indicar capacidade máxima');
  });

  // 13. Pessoa sem login tentando qualquer ação
  await testCase(13, 'Chamada sem autenticação (sem login) para qualquer endpoint protegido -> 401 Unauthorized', async () => {
    const r1 = await request('/reunioes', { method: 'GET' });
    assert.strictEqual(r1.status, 401, 'GET /reunioes sem token deve retornar 401');

    const r2 = await request('/reunioes/1/pedidos', { method: 'POST', body: {} });
    assert.strictEqual(r2.status, 401, 'POST pedidos sem token deve retornar 401');

    const r3 = await request('/reunioes/1/convites', { method: 'POST', body: {} });
    assert.strictEqual(r3.status, 401, 'POST convites sem token deve retornar 401');

    const r4 = await request('/convites/1', { method: 'PATCH', body: { acao: 'aceitar' } });
    assert.strictEqual(r4.status, 401, 'PATCH convites sem token deve retornar 401');
  });

  console.log('\n======================================================================');
  console.log(` RESULTADO FINAL: ${passed} / ${total} CASOS DE TESTE PASSARAM COM SUCESSO! `);
  console.log('======================================================================');
}

runTests().catch(console.error);
