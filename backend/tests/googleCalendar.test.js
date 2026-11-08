const assert = require('node:assert/strict');
const { test } = require('node:test');

require('./testDatabase').assertIsolatedTestDatabase();
const db = require('../src/config/db');
const googleCalendar = require('../src/services/googleCalendarService');

test('OAuth, armazenamento criptografado e sincronização de eventos', async () => {
  assert.equal(googleCalendar.configurado(), true);
  const usuarioId = 1;
  const chamadas = [];
  const fetchOriginal = global.fetch;
  global.fetch = async (url, options = {}) => {
    chamadas.push({ url: String(url), options });
    if (String(url) === 'https://oauth2.googleapis.com/token') {
      return Response.json({
        access_token: 'access-token-test-only',
        refresh_token: 'refresh-token-test-only',
        expires_in: 3600,
      });
    }
    if (options.method === 'DELETE') {
      return new Response(null, { status: 204 });
    }
    return Response.json({ id: 'google-event-test-id' });
  };

  try {
    const url = new URL(googleCalendar.criarUrlAutorizacao(usuarioId));
    assert.equal(url.origin, 'https://accounts.google.com');
    assert.equal(url.searchParams.get('access_type'), 'offline');
    assert.equal(url.searchParams.get('scope'), 'https://www.googleapis.com/auth/calendar.events');
    const state = url.searchParams.get('state');
    assert.ok(state);
    assert.equal(db.prepare('SELECT usuario_id FROM google_calendar_states WHERE state = ?').get(state).usuario_id, usuarioId);

    await googleCalendar.concluirAutorizacao(state, 'authorization-code-test-only');
    assert.equal(googleCalendar.obterStatus(usuarioId), true);
    const storedTokens = db.prepare('SELECT access_token, refresh_token FROM google_calendar_tokens WHERE usuario_id = ?')
      .get(usuarioId);
    assert.ok(!storedTokens.access_token.includes('access-token-test-only'));
    assert.ok(!storedTokens.refresh_token.includes('refresh-token-test-only'));

    const event = {
      summary: 'Reunião de teste',
      start: { dateTime: '2026-11-09T14:00:00', timeZone: 'America/Sao_Paulo' },
      end: { dateTime: '2026-11-09T15:00:00', timeZone: 'America/Sao_Paulo' },
    };
    await googleCalendar.sincronizarEvento(usuarioId, 'reuniao', 991, event);
    await googleCalendar.sincronizarEvento(usuarioId, 'reuniao', 991, { ...event, summary: 'Reunião atualizada' });
    await googleCalendar.removerEvento(usuarioId, 'reuniao', 991);

    const calendarCalls = chamadas.filter(({ url: target }) => target.startsWith('https://www.googleapis.com/calendar/v3/'));
    assert.deepEqual(calendarCalls.map(({ options }) => options.method), ['POST', 'PATCH', 'DELETE']);
    assert.equal(
      db.prepare('SELECT 1 FROM google_calendar_event_syncs WHERE tipo = ? AND entidade_id = ?').get('reuniao', 991),
      undefined
    );
    assert.equal(db.prepare('SELECT COUNT(*) AS total FROM google_calendar_states').get().total, 0);
  } finally {
    global.fetch = fetchOriginal;
  }
});

test('recusa state inválido sem trocar código com o Google', async () => {
  const fetchOriginal = global.fetch;
  global.fetch = async () => {
    throw new Error('A chamada externa não deveria acontecer.');
  };
  try {
    await assert.rejects(
      googleCalendar.concluirAutorizacao('state-inexistente', 'authorization-code-test-only'),
      /expirou ou não é válida/
    );
  } finally {
    global.fetch = fetchOriginal;
  }
});
