const crypto = require('node:crypto');
const db = require('../config/db');

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const TOKEN_ENCRYPTION_KEY = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google-calendar/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';
const TIME_ZONE = process.env.GOOGLE_CALENDAR_TIME_ZONE || 'America/Sao_Paulo';

function exigirConfiguracaoOAuth() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    const erro = new Error('Integração Google não configurada. Defina GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no backend.');
    erro.status = 503;
    throw erro;
  }
  if (!TOKEN_ENCRYPTION_KEY || !/^[a-f0-9]{64}$/i.test(TOKEN_ENCRYPTION_KEY)) {
    const erro = new Error('Defina GOOGLE_TOKEN_ENCRYPTION_KEY com uma chave persistente de 64 caracteres hexadecimais.');
    erro.status = 503;
    throw erro;
  }
}

function criptografarToken(token) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(TOKEN_ENCRYPTION_KEY, 'hex'), iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((parte) => parte.toString('base64')).join('.');
}

function descriptografarToken(tokenCriptografado) {
  const [ivBase64, tagBase64, encryptedBase64] = tokenCriptografado.split('.');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(TOKEN_ENCRYPTION_KEY, 'hex'),
    Buffer.from(ivBase64, 'base64')
  );
  decipher.setAuthTag(Buffer.from(tagBase64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

function criarUrlAutorizacao(usuarioId) {
  exigirConfiguracaoOAuth();
  const state = crypto.randomBytes(32).toString('hex');
  db.prepare('DELETE FROM google_calendar_states WHERE criada_em < ?').run(Date.now() - 10 * 60 * 1000);
  db.prepare('INSERT INTO google_calendar_states (state, usuario_id, criada_em) VALUES (?, ?, ?)')
    .run(state, usuarioId, Date.now());

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.events',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

async function trocarCodigoPorTokens(code) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });
  const tokens = await response.json();
  if (!response.ok) {
    throw new Error(tokens.error_description || tokens.error || 'Não foi possível concluir a autorização do Google.');
  }
  return tokens;
}

async function concluirAutorizacao(state, code) {
  exigirConfiguracaoOAuth();
  const registro = db.prepare('SELECT usuario_id FROM google_calendar_states WHERE state = ?').get(state);
  db.prepare('DELETE FROM google_calendar_states WHERE state = ?').run(state);
  if (!registro || Date.now() - registro.criada_em > 10 * 60 * 1000) {
    throw new Error('A autorização expirou ou não é válida. Tente conectar novamente.');
  }

  const tokens = await trocarCodigoPorTokens(code);
  const existente = db.prepare('SELECT refresh_token FROM google_calendar_tokens WHERE usuario_id = ?')
    .get(registro.usuario_id);
  const refreshToken = tokens.refresh_token ||
    (existente ? descriptografarToken(existente.refresh_token) : null);
  if (!refreshToken) {
    throw new Error('O Google não forneceu um token de renovação. Revogue o acesso ao aplicativo na sua conta Google e conecte novamente.');
  }
  if (existente && tokens.refresh_token &&
      descriptografarToken(existente.refresh_token) !== tokens.refresh_token) {
    db.prepare('DELETE FROM google_calendar_event_syncs WHERE usuario_id = ?')
      .run(registro.usuario_id);
  }

  db.prepare(`
    INSERT INTO google_calendar_tokens (usuario_id, access_token, refresh_token, expiry_date)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(usuario_id) DO UPDATE SET
      access_token = excluded.access_token,
      refresh_token = excluded.refresh_token,
      expiry_date = excluded.expiry_date
  `).run(
    registro.usuario_id,
    criptografarToken(tokens.access_token),
    criptografarToken(refreshToken),
    Date.now() + tokens.expires_in * 1000
  );
  return registro.usuario_id;
}

function obterStatus(usuarioId) {
  return Boolean(db.prepare('SELECT 1 FROM google_calendar_tokens WHERE usuario_id = ?').get(usuarioId));
}

async function obterAccessToken(usuarioId) {
  exigirConfiguracaoOAuth();
  let tokens = db.prepare('SELECT * FROM google_calendar_tokens WHERE usuario_id = ?').get(usuarioId);
  if (!tokens) {
    const erro = new Error('Conecte sua conta Google Agenda antes de sincronizar eventos.');
    erro.status = 409;
    throw erro;
  }
  tokens = {
    ...tokens,
    access_token: descriptografarToken(tokens.access_token),
    refresh_token: descriptografarToken(tokens.refresh_token),
  };
  if (tokens.expiry_date <= Date.now() + 60_000) {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: tokens.refresh_token,
        grant_type: 'refresh_token',
      }),
    });
    const renovacao = await response.json();
    if (!response.ok) {
      throw new Error(renovacao.error_description || renovacao.error || 'Não foi possível renovar a autorização do Google.');
    }
    tokens = {
      ...tokens,
      access_token: renovacao.access_token,
      expiry_date: Date.now() + renovacao.expires_in * 1000,
    };
    db.prepare('UPDATE google_calendar_tokens SET access_token = ?, expiry_date = ? WHERE usuario_id = ?')
      .run(criptografarToken(tokens.access_token), tokens.expiry_date, usuarioId);
  }
  return tokens.access_token;
}

async function requisitarGoogle(usuarioId, path, options = {}) {
  const accessToken = await obterAccessToken(usuarioId);
  const response = await fetch(`${GOOGLE_CALENDAR_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) {
    const erro = new Error(data.error?.message || `A API do Google retornou HTTP ${response.status}.`);
    erro.status = response.status;
    throw erro;
  }
  return data;
}

function eventoDeReserva(reserva) {
  const dataSeguinte = new Date(`${reserva.data_reserva}T00:00:00Z`);
  dataSeguinte.setUTCDate(dataSeguinte.getUTCDate() + 1);
  return {
    summary: `Reserva: ${reserva.sala}`,
    description: `Reserva de espaço no Embrapa Meeting. Recursos: ${reserva.recurso}.`,
    start: { date: reserva.data_reserva },
    end: { date: dataSeguinte.toISOString().slice(0, 10) },
  };
}

function eventoDeReuniao(reuniao) {
  return {
    summary: reuniao.titulo,
    location: reuniao.sala_nome,
    description: `Reunião criada no Embrapa Meeting.`,
    start: {
      dateTime: `${reuniao.data_reuniao}T${reuniao.hora_inicio}:00`,
      timeZone: TIME_ZONE,
    },
    end: {
      dateTime: `${reuniao.data_reuniao}T${reuniao.hora_fim}:00`,
      timeZone: TIME_ZONE,
    },
  };
}

async function sincronizarEvento(usuarioId, tipo, entidadeId, evento) {
  const existente = db.prepare('SELECT evento_id FROM google_calendar_event_syncs WHERE tipo = ? AND entidade_id = ?')
    .get(tipo, entidadeId);
  const caminho = existente
    ? `/calendars/primary/events/${encodeURIComponent(existente.evento_id)}`
    : '/calendars/primary/events';
  const salvo = await requisitarGoogle(usuarioId, caminho, {
    method: existente ? 'PATCH' : 'POST',
    body: JSON.stringify(evento),
  });
  db.prepare(`
    INSERT INTO google_calendar_event_syncs (tipo, entidade_id, usuario_id, evento_id)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(tipo, entidade_id) DO UPDATE SET
      usuario_id = excluded.usuario_id,
      evento_id = excluded.evento_id
  `).run(tipo, entidadeId, usuarioId, salvo.id);
  return salvo.id;
}

async function removerEvento(usuarioId, tipo, entidadeId) {
  const registro = db.prepare('SELECT usuario_id, evento_id FROM google_calendar_event_syncs WHERE tipo = ? AND entidade_id = ?')
    .get(tipo, entidadeId);
  if (!registro) return;
  if (registro.usuario_id !== usuarioId) {
    throw new Error('Somente a conta que criou o evento pode removê-lo do Google Agenda.');
  }
  try {
    await requisitarGoogle(usuarioId, `/calendars/primary/events/${encodeURIComponent(registro.evento_id)}`, {
      method: 'DELETE',
    });
  } catch (erro) {
    if (erro.status !== 404) throw erro;
  }
  db.prepare('DELETE FROM google_calendar_event_syncs WHERE tipo = ? AND entidade_id = ?')
    .run(tipo, entidadeId);
}

async function sincronizarPendentes(usuarioId) {
  const reservas = db.prepare(`
    SELECT id, sala, data_reserva, recurso
    FROM reservas
    WHERE usuario_id = ? AND status = 'Aprovada' AND data_reserva >= date('now', 'localtime')
  `).all(usuarioId);
  const reunioes = db.prepare(`
    SELECT r.id, r.titulo, r.data_reuniao, r.hora_inicio, r.hora_fim, s.nome AS sala_nome
    FROM reunioes r
    JOIN salas s ON s.id = r.sala_id
    WHERE r.criador_id = ? AND r.status = 'ativa'
      AND datetime(r.data_reuniao || ' ' || r.hora_fim) >= datetime('now', 'localtime')
  `).all(usuarioId);
  const erros = [];
  let sincronizados = 0;
  for (const reserva of reservas) {
    try {
      await sincronizarEvento(usuarioId, 'reserva', reserva.id, eventoDeReserva(reserva));
      sincronizados++;
    } catch (erro) {
      erros.push({ tipo: 'reserva', id: reserva.id, erro: erro.message });
    }
  }
  for (const reuniao of reunioes) {
    try {
      await sincronizarEvento(usuarioId, 'reuniao', reuniao.id, eventoDeReuniao(reuniao));
      sincronizados++;
    } catch (erro) {
      erros.push({ tipo: 'reuniao', id: reuniao.id, erro: erro.message });
    }
  }
  return { sincronizados, erros };
}

function desconectar(usuarioId) {
  db.prepare('DELETE FROM google_calendar_event_syncs WHERE usuario_id = ?').run(usuarioId);
  db.prepare('DELETE FROM google_calendar_tokens WHERE usuario_id = ?').run(usuarioId);
}

function urlRetorno(status) {
  return `${FRONTEND_URL}/?googleCalendar=${encodeURIComponent(status)}`;
}

module.exports = {
  criarUrlAutorizacao,
  concluirAutorizacao,
  obterStatus,
  sincronizarEvento,
  removerEvento,
  eventoDeReserva,
  eventoDeReuniao,
  sincronizarPendentes,
  desconectar,
  urlRetorno,
};
