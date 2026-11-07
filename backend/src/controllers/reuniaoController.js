const db = require('../config/db');
const googleCalendar = require('../services/googleCalendarService');

function obterDataLocalISO(d = new Date()) {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function dataISOValida(data) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data || '')) return false;
  const dataUtc = new Date(`${data}T00:00:00Z`);
  return !Number.isNaN(dataUtc.getTime()) && dataUtc.toISOString().slice(0, 10) === data;
}

// Helper para verificar o estado temporal da reunião (servidor / timezone local seguro)
function verificarEstadoTemporal(dataReuniao, horaInicio = '14:00', horaFim = '15:00') {
  const agora = new Date();

  // Divide com segurança data ISO e horários
  const [ano, mes, dia] = dataReuniao.split('-').map(Number);
  const [hIni, mIni] = (horaInicio || '14:00').split(':').map(Number);
  const [hFim, mFim] = (horaFim || '15:00').split(':').map(Number);

  const inicio = new Date(ano, mes - 1, dia, hIni, mIni, 0);
  const fim = new Date(ano, mes - 1, dia, hFim, mFim, 0);

  if (agora > fim) {
    return 'passada'; // Já realizada
  }
  if (agora >= inicio && agora <= fim) {
    return 'em_andamento'; // Iniciou e ainda não encerrou
  }
  return 'futura'; // Ainda vai acontecer
}

// Helper para checar se usuário é criador ou líder
function isCriadorOuLider(reuniaoId, userId) {
  const reuniao = db.prepare('SELECT criador_id FROM reunioes WHERE id = ?').get(reuniaoId);
  if (!reuniao) return false;
  if (reuniao.criador_id === userId) return true;

  const ehLider = db.prepare('SELECT 1 FROM lideres_reuniao WHERE reuniao_id = ? AND usuario_id = ?').get(reuniaoId, userId);
  return !!ehLider;
}

// 1. Listar reuniões (com filtro estrito de privacidade)
function listarReunioes(req, res) {
  const userId = req.user ? req.user.id : null;

  const todasReunioes = db.prepare(`
    SELECT 
      r.id,
      r.titulo,
      r.data_reuniao,
      r.hora_inicio,
      r.hora_fim,
      r.tipo,
      r.status,
      r.criador_id,
      u.nome as criador_nome,
      u.email as criador_email,
      s.id as sala_id,
      s.nome as sala_nome,
      s.capacidade as sala_capacidade
    FROM reunioes r
    JOIN usuarios u ON r.criador_id = u.id
    JOIN salas s ON r.sala_id = s.id
    ORDER BY r.data_reuniao ASC
  `).all();

  const resultado = [];

  for (const reuniao of todasReunioes) {
    // Buscar participantes
    const participantes = db.prepare(`
      SELECT u.id, u.nome, u.email
      FROM participantes_reuniao pr
      JOIN usuarios u ON pr.usuario_id = u.id
      WHERE pr.reuniao_id = ?
    `).all(reuniao.id);

    // Buscar líderes
    const lideres = db.prepare(`
      SELECT u.id, u.nome, u.email
      FROM lideres_reuniao lr
      JOIN usuarios u ON lr.usuario_id = u.id
      WHERE lr.reuniao_id = ?
    `).all(reuniao.id);

    const souCriador = userId ? (userId === reuniao.criador_id) : false;
    const souLider = userId ? lideres.some((l) => l.id === userId) : false;
    const souParticipante = userId ? participantes.some((p) => p.id === userId) : false;

    // Buscar convite para o usuário conectado (se houver)
    let meuConvite = null;
    if (userId) {
      meuConvite = db.prepare(`
        SELECT c.*, u.nome as convidado_por_nome
        FROM convites_reuniao c
        JOIN usuarios u ON c.convidado_por = u.id
        WHERE c.reuniao_id = ? AND c.usuario_id = ?
      `).get(reuniao.id, userId);
    }

    // REGRA DE PRIVACIDADE:
    // Reunião privada NÃO deve aparecer em listagens para quem não é criador, líder, participante ou convidado
    if (reuniao.tipo === 'privada') {
      const temPermissaoVisibilidade = souCriador || souLider || souParticipante || !!meuConvite;
      if (!temPermissaoVisibilidade) {
        continue; // Oculta da listagem
      }
    }

    // Buscar pedidos pendentes caso o usuário seja criador ou líder
    let pedidosPendentes = [];
    let convitesEnviados = [];
    if (souCriador || souLider) {
      pedidosPendentes = db.prepare(`
        SELECT p.id, p.usuario_id, u.nome as usuario_nome, u.email as usuario_email, p.status, p.criado_em
        FROM pedidos_participacao p
        JOIN usuarios u ON p.usuario_id = u.id
        WHERE p.reuniao_id = ? AND p.status = 'pendente'
      `).all(reuniao.id);

      convitesEnviados = db.prepare(`
        SELECT c.id, c.usuario_id, u.nome as usuario_nome, u.email as usuario_email, c.status, c.criado_em, c.convidado_por
        FROM convites_reuniao c
        JOIN usuarios u ON c.usuario_id = u.id
        WHERE c.reuniao_id = ?
      `).all(reuniao.id);
    }

    // Buscar pedido do usuário
    let meuPedido = null;
    if (userId) {
      meuPedido = db.prepare(`
        SELECT id, status, criado_em, respondido_em
        FROM pedidos_participacao
        WHERE reuniao_id = ? AND usuario_id = ?
      `).get(reuniao.id, userId);
    }

    const estadoTemporal = verificarEstadoTemporal(reuniao.data_reuniao, reuniao.hora_inicio, reuniao.hora_fim);

    resultado.push({
      ...reuniao,
      vagasOcupadas: participantes.length,
      vagasTotais: reuniao.sala_capacidade,
      lotada: participantes.length >= reuniao.sala_capacidade,
      estadoTemporal,
      participantes,
      lideres,
      pedidosPendentes,
      convitesEnviados,
      meuPedido: meuPedido || null,
      meuConvite: meuConvite || null,
      souParticipante,
      souCriador,
      souLider,
    });
  }

  res.json({ reunioes: resultado });
}

// 2. Obter detalhes de reunião direta por ID (com bloqueio 403/404 se privada e sem permissão)
function obterReuniaoPorId(req, res) {
  const reuniaoId = parseInt(req.params.id, 10);
  const userId = req.user.id;

  const reuniao = db.prepare(`
    SELECT r.*, s.nome as sala_nome, s.capacidade as sala_capacidade, u.nome as criador_nome
    FROM reunioes r
    JOIN salas s ON r.sala_id = s.id
    JOIN usuarios u ON r.criador_id = u.id
    WHERE r.id = ?
  `).get(reuniaoId);

  if (!reuniao) {
    return res.status(404).json({ erro: 'Reunião não encontrada.', status: 404 });
  }

  if (reuniao.tipo === 'privada') {
    const souCriador = (reuniao.criador_id === userId);
    const ehLider = db.prepare('SELECT 1 FROM lideres_reuniao WHERE reuniao_id = ? AND usuario_id = ?').get(reuniaoId, userId);
    const ehParticipante = db.prepare('SELECT 1 FROM participantes_reuniao WHERE reuniao_id = ? AND usuario_id = ?').get(reuniaoId, userId);
    const temConvite = db.prepare('SELECT 1 FROM convites_reuniao WHERE reuniao_id = ? AND usuario_id = ?').get(reuniaoId, userId);

    if (!souCriador && !ehLider && !ehParticipante && !temConvite) {
      return res.status(403).json({
        erro: 'Acesso negado (403). Esta reunião é privada e você não possui permissão para acessá-la.',
        status: 403,
      });
    }
  }

  res.json({ reuniao });
}

// 3. Solicitar participação em reunião
function solicitarParticipacao(req, res) {
  const reuniaoId = parseInt(req.params.id, 10);
  const userId = req.user.id;

  if (isNaN(reuniaoId)) {
    return res.status(400).json({ erro: 'ID de reunião inválido.' });
  }

  const reuniao = db.prepare(`
    SELECT r.*, s.capacidade as sala_capacidade, s.nome as sala_nome
    FROM reunioes r
    JOIN salas s ON r.sala_id = s.id
    WHERE r.id = ?
  `).get(reuniaoId);

  if (!reuniao) {
    return res.status(404).json({ erro: 'Reunião não encontrada.', status: 404 });
  }

  // REGRA B: Reuniões Privadas não permitem pedido de usuários comuns
  if (reuniao.tipo === 'privada') {
    return res.status(403).json({
      erro: 'Acesso negado (403). Esta reunião é privada e não aceita pedidos de participação. O acesso é exclusivo mediante convite.',
      status: 403,
    });
  }

  // REGRA C: Checagem Temporal (Reuniões já realizadas ou em andamento)
  const estadoTemporal = verificarEstadoTemporal(reuniao.data_reuniao, reuniao.hora_inicio, reuniao.hora_fim);
  if (estadoTemporal === 'passada' || reuniao.status === 'encerrada') {
    return res.status(400).json({
      erro: 'Não é possível solicitar participação em uma reunião que já aconteceu ou foi encerrada.',
      status: 400,
    });
  }
  if (estadoTemporal === 'em_andamento') {
    return res.status(400).json({
      erro: 'A reunião já foi iniciada e não aceita novos pedidos de participação.',
      status: 400,
    });
  }
  if (reuniao.status === 'cancelada') {
    return res.status(400).json({
      erro: 'Não é possível solicitar participação em uma reunião cancelada.',
      status: 400,
    });
  }

  // Criador pedindo própria reunião?
  if (reuniao.criador_id === userId) {
    return res.status(400).json({
      erro: 'O criador da reunião já é o responsável e anfitrião, não podendo solicitar participação.',
      status: 400,
    });
  }

  // Já participa?
  const jaParticipa = db.prepare('SELECT 1 FROM participantes_reuniao WHERE reuniao_id = ? AND usuario_id = ?').get(reuniaoId, userId);
  if (jaParticipa) {
    return res.status(400).json({
      erro: 'Você já é um participante confirmado desta reunião.',
      status: 400,
    });
  }

  // Pedido duplicado?
  const pedidoExistente = db.prepare('SELECT * FROM pedidos_participacao WHERE reuniao_id = ? AND usuario_id = ?').get(reuniaoId, userId);
  if (pedidoExistente) {
    if (pedidoExistente.status === 'pendente') {
      return res.status(409).json({
        erro: 'Você já possui uma solicitação pendente para esta reunião. Aguarde a resposta do criador.',
        status: 409,
      });
    }
    if (pedidoExistente.status === 'aceito') {
      return res.status(409).json({
        erro: 'Seu pedido para esta reunião já foi aceito.',
        status: 409,
      });
    }
  }

  // Checagem de lotação preventiva
  const participantesCount = db.prepare('SELECT COUNT(*) as count FROM participantes_reuniao WHERE reuniao_id = ?').get(reuniaoId).count;
  if (participantesCount >= reuniao.sala_capacidade) {
    return res.status(400).json({
      erro: `A sala "${reuniao.sala_nome}" já atingiu a capacidade máxima de ${reuniao.sala_capacidade} participantes.`,
      status: 400,
    });
  }

  const criadoEm = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO pedidos_participacao (reuniao_id, usuario_id, status, criado_em)
    VALUES (?, ?, 'pendente', ?)
  `);
  const info = insert.run(reuniaoId, userId, criadoEm);

  const novoPedido = db.prepare('SELECT * FROM pedidos_participacao WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({
    mensagem: 'Pedido de participação enviado com sucesso! Aguardando aprovação.',
    pedido: novoPedido,
  });
}

// 4. Enviar convite de participação (Criador ou Líderes)
function enviarConvite(req, res) {
  const reuniaoId = parseInt(req.params.id, 10);
  const { usuario_id: convidadoId } = req.body;
  const remetenteId = req.user.id;

  if (isNaN(reuniaoId) || !convidadoId) {
    return res.status(400).json({ erro: 'ID de reunião e ID do usuário convidado são obrigatórios.' });
  }

  const reuniao = db.prepare(`
    SELECT r.*, s.capacidade as sala_capacidade, s.nome as sala_nome
    FROM reunioes r
    JOIN salas s ON r.sala_id = s.id
    WHERE r.id = ?
  `).get(reuniaoId);

  if (!reuniao) {
    return res.status(404).json({ erro: 'Reunião não encontrada.', status: 404 });
  }

  // AUTORIZAÇÃO: Somente criador ou líder pode convidar
  if (!isCriadorOuLider(reuniaoId, remetenteId)) {
    return res.status(403).json({
      erro: 'Acesso negado (403). Somente o criador ou líderes da reunião têm permissão para enviar convites.',
      status: 403,
    });
  }

  // REGRA C: Reunião já realizada ou em andamento
  const estadoTemporal = verificarEstadoTemporal(reuniao.data_reuniao, reuniao.hora_inicio, reuniao.hora_fim);
  if (estadoTemporal === 'passada' || reuniao.status === 'encerrada') {
    return res.status(400).json({
      erro: 'Não é possível enviar convites para uma reunião que já aconteceu ou foi encerrada.',
      status: 400,
    });
  }
  if (estadoTemporal === 'em_andamento') {
    return res.status(400).json({
      erro: 'A reunião já foi iniciada e não aceita novos convites.',
      status: 400,
    });
  }

  // Usuário convidado existe?
  const convidado = db.prepare('SELECT id, nome, email FROM usuarios WHERE id = ?').get(convidadoId);
  if (!convidado) {
    return res.status(404).json({ erro: 'Usuário convidado não foi encontrado no sistema.', status: 404 });
  }

  // Já participa da reunião?
  const jaParticipa = db.prepare('SELECT 1 FROM participantes_reuniao WHERE reuniao_id = ? AND usuario_id = ?').get(reuniaoId, convidadoId);
  if (jaParticipa) {
    return res.status(400).json({
      erro: 'Este usuário já é um participante confirmado desta reunião.',
      status: 400,
    });
  }

  // Convite duplicado?
  const conviteExistente = db.prepare('SELECT * FROM convites_reuniao WHERE reuniao_id = ? AND usuario_id = ?').get(reuniaoId, convidadoId);
  if (conviteExistente) {
    if (conviteExistente.status === 'pendente') {
      return res.status(409).json({
        erro: 'Já existe um convite pendente para este usuário nesta reunião.',
        status: 409,
      });
    }
  }

  // Checagem de capacidade da sala
  const participantesCount = db.prepare('SELECT COUNT(*) as count FROM participantes_reuniao WHERE reuniao_id = ?').get(reuniaoId).count;
  if (participantesCount >= reuniao.sala_capacidade) {
    return res.status(400).json({
      erro: `Capacidade máxima atingida: A sala "${reuniao.sala_nome}" já atingiu o limite de ${reuniao.sala_capacidade} pessoas. Não é possível convidar novos participantes.`,
      status: 400,
    });
  }

  const criadoEm = new Date().toISOString();
  // Se já existia recusado, sobrescreve para pendente
  if (conviteExistente) {
    db.prepare('UPDATE convites_reuniao SET status = \'pendente\', convidado_por = ?, criado_em = ?, respondido_em = NULL WHERE id = ?')
      .run(remetenteId, criadoEm, conviteExistente.id);
    return res.status(200).json({
      mensagem: `Convite reenviado com sucesso para ${convidado.nome}!`,
      convite_id: conviteExistente.id,
    });
  }

  const insert = db.prepare(`
    INSERT INTO convites_reuniao (reuniao_id, usuario_id, convidado_por, status, criado_em)
    VALUES (?, ?, ?, 'pendente', ?)
  `);
  const info = insert.run(reuniaoId, convidadoId, remetenteId, criadoEm);

  res.status(201).json({
    mensagem: `Convite enviado com sucesso para ${convidado.nome}!`,
    convite_id: info.lastInsertRowid,
  });
}

// 5. Responder convite (Aceitar ou Recusar pelo convidado)
function responderConvite(req, res) {
  const conviteId = parseInt(req.params.id, 10);
  const { acao } = req.body;
  const userId = req.user.id;

  if (isNaN(conviteId) || (acao !== 'aceitar' && acao !== 'recusar')) {
    return res.status(400).json({ erro: 'ID de convite inválido ou ação incorreta (use "aceitar" ou "recusar").' });
  }

  const convite = db.prepare(`
    SELECT c.*, r.titulo as reuniao_titulo, r.data_reuniao, r.hora_inicio, r.hora_fim, r.status as reuniao_status,
           s.capacidade as sala_capacidade, s.nome as sala_nome
    FROM convites_reuniao c
    JOIN reunioes r ON c.reuniao_id = r.id
    JOIN salas s ON r.sala_id = s.id
    WHERE c.id = ?
  `).get(conviteId);

  if (!convite) {
    return res.status(404).json({ erro: 'Convite não encontrado.', status: 404 });
  }

  // AUTORIZAÇÃO: Apenas o convidado pode responder seu próprio convite
  if (convite.usuario_id !== userId) {
    return res.status(403).json({
      erro: 'Acesso negado (403). Você não é o destinatário deste convite.',
      status: 403,
    });
  }

  // Checagem temporal da reunião
  const estadoTemporal = verificarEstadoTemporal(convite.data_reuniao, convite.hora_inicio, convite.hora_fim);
  if (estadoTemporal === 'passada' || convite.reuniao_status === 'encerrada') {
    return res.status(400).json({
      erro: 'Esta reunião já aconteceu ou foi encerrada e o convite não pode mais ser respondido.',
      status: 400,
    });
  }

  if (convite.status !== 'pendente') {
    return res.status(400).json({
      erro: `Este convite já foi respondido anteriormente com o status "${convite.status}".`,
      status: 400,
    });
  }

  const respondidoEm = new Date().toISOString();

  if (acao === 'aceitar') {
    const participantesCount = db.prepare('SELECT COUNT(*) as count FROM participantes_reuniao WHERE reuniao_id = ?').get(convite.reuniao_id).count;
    if (participantesCount >= convite.sala_capacidade) {
      return res.status(400).json({
        erro: `A sala atingiu a capacidade máxima de ${convite.sala_capacidade} participantes. Não é possível aceitar o convite.`,
        status: 400,
      });
    }

    db.prepare('INSERT OR IGNORE INTO participantes_reuniao (reuniao_id, usuario_id) VALUES (?, ?)').run(convite.reuniao_id, userId);
    db.prepare('UPDATE convites_reuniao SET status = \'aceito\', respondido_em = ? WHERE id = ?').run(respondidoEm, conviteId);

    return res.json({
      mensagem: `Convite para "${convite.reuniao_titulo}" aceito com sucesso! Você agora é participante.`,
      status: 'aceito',
    });
  }

  if (acao === 'recusar') {
    db.prepare('UPDATE convites_reuniao SET status = \'recusado\', respondido_em = ? WHERE id = ?').run(respondidoEm, conviteId);
    return res.json({
      mensagem: `Convite para "${convite.reuniao_titulo}" foi recusado.`,
      status: 'recusado',
    });
  }
}

// 6. Responder pedido de participação (Criador ou Líderes)
function responderPedido(req, res) {
  const pedidoId = parseInt(req.params.id, 10);
  const { acao } = req.body;
  const userId = req.user.id;

  if (isNaN(pedidoId) || (acao !== 'aceitar' && acao !== 'recusar')) {
    return res.status(400).json({ erro: 'ID inválido ou ação incorreta.' });
  }

  const pedido = db.prepare(`
    SELECT p.*, r.titulo as reuniao_titulo, r.status as reuniao_status, r.criador_id as reuniao_criador_id,
           r.data_reuniao, r.hora_inicio, r.hora_fim,
           s.capacidade as sala_capacidade, s.nome as sala_nome,
           u.nome as solicitante_nome
    FROM pedidos_participacao p
    JOIN reunioes r ON p.reuniao_id = r.id
    JOIN salas s ON r.sala_id = s.id
    JOIN usuarios u ON p.usuario_id = u.id
    WHERE p.id = ?
  `).get(pedidoId);

  if (!pedido) {
    return res.status(404).json({ erro: 'Pedido de participação não encontrado.', status: 404 });
  }

  // AUTORIZAÇÃO: Somente o criador da reunião pode aceitar/recusar pedidos de participação
  if (pedido.reuniao_criador_id !== userId) {
    return res.status(403).json({
      erro: 'Acesso negado (403). Somente o criador desta reunião tem permissão para aceitar ou recusar pedidos de participação.',
      status: 403,
    });
  }

  // Checagem temporal
  const estadoTemporal = verificarEstadoTemporal(pedido.data_reuniao, pedido.hora_inicio, pedido.hora_fim);
  if (estadoTemporal === 'passada' || pedido.reuniao_status === 'encerrada') {
    return res.status(400).json({
      erro: 'Não é possível responder a pedidos de uma reunião que já aconteceu ou foi encerrada.',
      status: 400,
    });
  }

  if (pedido.status !== 'pendente') {
    return res.status(400).json({
      erro: `Este pedido já foi respondido anteriormente com o status "${pedido.status}". Não pode ser reavaliado.`,
      status: 400,
    });
  }

  const respondidoEm = new Date().toISOString();

  if (acao === 'aceitar') {
    const participantesAtuais = db.prepare('SELECT COUNT(*) as count FROM participantes_reuniao WHERE reuniao_id = ?').get(pedido.reuniao_id).count;
    if (participantesAtuais >= pedido.sala_capacidade) {
      return res.status(400).json({
        erro: `Capacidade máxima atingida: A sala "${pedido.sala_nome}" já atingiu o limite de ${pedido.sala_capacidade} participantes. O pedido não pode ser aceito.`,
        status: 400,
      });
    }

    db.prepare('INSERT OR IGNORE INTO participantes_reuniao (reuniao_id, usuario_id) VALUES (?, ?)').run(pedido.reuniao_id, pedido.usuario_id);
    db.prepare('UPDATE pedidos_participacao SET status = \'aceito\', respondido_em = ? WHERE id = ?').run(respondidoEm, pedidoId);

    return res.json({
      mensagem: `Pedido de ${pedido.solicitante_nome} aceito com sucesso! Participante adicionado à sala.`,
      status: 'aceito',
      pedido_id: pedidoId,
      reuniao_id: pedido.reuniao_id,
    });
  }

  if (acao === 'recusar') {
    db.prepare('UPDATE pedidos_participacao SET status = \'recusado\', respondido_em = ? WHERE id = ?').run(respondidoEm, pedidoId);
    return res.json({
      mensagem: `Pedido de ${pedido.solicitante_nome} foi recusado.`,
      status: 'recusado',
      pedido_id: pedidoId,
      reuniao_id: pedido.reuniao_id,
    });
  }
}

// 7. Alteração de Privacidade de Reunião (Cenário 9)
function alterarPrivacidade(req, res) {
  const reuniaoId = parseInt(req.params.id, 10);
  const { tipo } = req.body; // 'publica' ou 'privada'
  const userId = req.user.id;

  if (!tipo || (tipo !== 'publica' && tipo !== 'privada')) {
    return res.status(400).json({ erro: 'Tipo inválido. Escolha "publica" ou "privada".' });
  }

  const reuniao = db.prepare('SELECT * FROM reunioes WHERE id = ?').get(reuniaoId);
  if (!reuniao) {
    return res.status(404).json({ erro: 'Reunião não encontrada.' });
  }

  if (reuniao.criador_id !== userId) {
    return res.status(403).json({ erro: 'Apenas o criador pode alterar a privacidade da reunião.' });
  }

  db.prepare('UPDATE reunioes SET tipo = ? WHERE id = ?').run(tipo, reuniaoId);

  // Se passou de pública para privada: pedidos pendentes anteriores são cancelados por segurança
  let pedidosCancelados = 0;
  if (tipo === 'privada') {
    const info = db.prepare(`
      UPDATE pedidos_participacao
      SET status = 'recusado', respondido_em = ?
      WHERE reuniao_id = ? AND status = 'pendente'
    `).run(new Date().toISOString(), reuniaoId);
    pedidosCancelados = info.changes;
  }

  res.json({
    mensagem: `Privacidade da reunião alterada para ${tipo}.`,
    tipo,
    pedidosCancelados,
  });
}

// 8. Listar Meus Pedidos e Meus Convites
function listarMeusPedidos(req, res) {
  const userId = req.user.id;

  const pedidosEnviados = db.prepare(`
    SELECT p.*, r.titulo as reuniao_titulo, r.data_reuniao, s.nome as sala_nome, u.nome as criador_nome
    FROM pedidos_participacao p
    JOIN reunioes r ON p.reuniao_id = r.id
    JOIN salas s ON r.sala_id = s.id
    JOIN usuarios u ON r.criador_id = u.id
    WHERE p.usuario_id = ?
    ORDER BY p.criado_em DESC
  `).all(userId);

  const convitesRecebidos = db.prepare(`
    SELECT c.*, r.titulo as reuniao_titulo, r.data_reuniao, r.hora_inicio, r.hora_fim, s.nome as sala_nome,
           u.nome as convidado_por_nome
    FROM convites_reuniao c
    JOIN reunioes r ON c.reuniao_id = r.id
    JOIN salas s ON r.sala_id = s.id
    JOIN usuarios u ON c.convidado_por = u.id
    WHERE c.usuario_id = ?
    ORDER BY c.criado_em DESC
  `).all(userId);

  const convitesPendentes = convitesRecebidos.filter((c) => c.status === 'pendente').length;

  res.json({
    pedidosEnviados,
    convitesRecebidos,
    convitesPendentes,
  });
}

// 9. Listar usuários
function listarUsuarios(req, res) {
  const usuarios = db.prepare('SELECT id, nome, email, perfil FROM usuarios').all();
  res.json({ usuarios });
}

async function criarReuniao(req, res) {
  const { titulo, sala_id: salaId, data_reuniao: data, hora_inicio: horaInicio, hora_fim: horaFim, tipo = 'publica' } = req.body;
  if (
    typeof titulo !== 'string' || !titulo.trim() ||
    !Number.isInteger(Number(salaId)) ||
    !dataISOValida(data) ||
    data < obterDataLocalISO() ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(horaInicio || '') ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(horaFim || '') ||
    horaFim <= horaInicio ||
    !['publica', 'privada'].includes(tipo)
  ) {
    return res.status(400).json({ erro: 'Informe título, sala, data, horários válidos e tipo de reunião.' });
  }
  const sala = db.prepare('SELECT id FROM salas WHERE id = ?').get(Number(salaId));
  if (!sala) return res.status(400).json({ erro: 'A sala selecionada não existe.' });

  db.exec('BEGIN');
  let reuniaoId;
  try {
    const resultado = db.prepare(`
      INSERT INTO reunioes (titulo, sala_id, criador_id, data_reuniao, hora_inicio, hora_fim, tipo, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'ativa')
    `).run(titulo.trim(), Number(salaId), req.user.id, data, horaInicio, horaFim, tipo);
    db.prepare('INSERT INTO participantes_reuniao (reuniao_id, usuario_id) VALUES (?, ?)')
      .run(resultado.lastInsertRowid, req.user.id);
    reuniaoId = Number(resultado.lastInsertRowid);
    db.exec('COMMIT');
  } catch (erro) {
    db.exec('ROLLBACK');
    throw erro;
  }
  const reuniao = db.prepare(`
    SELECT r.id, r.titulo, r.data_reuniao, r.hora_inicio, r.hora_fim, r.tipo, r.status,
           r.criador_id, s.nome AS sala_nome
    FROM reunioes r JOIN salas s ON s.id = r.sala_id
    WHERE r.id = ?
  `).get(reuniaoId);
  let sincronizacao = { sincronizado: false };
  try {
    await googleCalendar.sincronizarEvento(
      req.user.id,
      'reuniao',
      reuniaoId,
      googleCalendar.eventoDeReuniao(reuniao)
    );
    sincronizacao = { sincronizado: true };
  } catch (erro) {
    sincronizacao = { sincronizado: false, erro: erro.message };
  }
  return res.status(201).json({ reuniao, sincronizacao });
}

module.exports = {
  listarReunioes,
  obterReuniaoPorId,
  solicitarParticipacao,
  enviarConvite,
  responderConvite,
  responderPedido,
  alterarPrivacidade,
  listarMeusPedidos,
  listarUsuarios,
  criarReuniao,
  verificarEstadoTemporal,
  obterDataLocalISO,
};
