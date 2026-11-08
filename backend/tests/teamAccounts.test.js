const assert = require('node:assert/strict');
const { test } = require('node:test');

require('./testDatabase').assertIsolatedTestDatabase();
const db = require('../src/config/db');
const { provisionarContasEq01 } = require('../src/services/teamAccountProvisioner');

test('recusa colisão de identidade e provisiona contas ausentes sem duplicá-las', () => {
  const usuariosOriginais = db.prepare('SELECT id, nome, email, perfil FROM usuarios ORDER BY id').all();

  const colisaoId = db.prepare('INSERT INTO usuarios (nome, email, perfil) VALUES (?, ?, ?)').run(
    'Joao Klein',
    'joao.alternativo@example.org',
    'comum'
  ).lastInsertRowid;
  const antes = db.prepare('SELECT COUNT(*) AS total FROM usuarios').get().total;
  assert.throws(() => provisionarContasEq01(db), /revisão manual necessária/);
  assert.equal(db.prepare('SELECT COUNT(*) AS total FROM usuarios').get().total, antes);
  assert.equal(
    db.prepare('SELECT id FROM usuarios WHERE email = ?').get('joaoklein@email.com'),
    undefined
  );
  db.prepare('DELETE FROM usuarios WHERE id = ?').run(colisaoId);

  const primeiraExecucao = provisionarContasEq01(db);
  assert.equal(primeiraExecucao.criadas.length, 5);
  assert.equal(primeiraExecucao.existentes.length, 0);

  const segundaExecucao = provisionarContasEq01(db);
  assert.equal(segundaExecucao.criadas.length, 0);
  assert.equal(segundaExecucao.existentes.length, 5);

  const usuariosAtuais = db.prepare('SELECT id, nome, email, perfil FROM usuarios WHERE id <= 4 ORDER BY id').all();
  assert.deepEqual(usuariosAtuais, usuariosOriginais);

  const equipe = db.prepare(`
    SELECT email, perfil, senha_hash AS senhaHash
    FROM usuarios
    WHERE email IN (?, ?, ?, ?, ?)
    ORDER BY email
  `).all(
    'joaoklein@email.com',
    'fernandovinicius@email.com',
    'gustavolira@email.com',
    'nicolastoshio@email.com',
    'lormiluskendy@email.com'
  );
  assert.equal(equipe.length, 5);
  assert.ok(equipe.every((usuario) => usuario.perfil === 'admin' && usuario.senhaHash === null));
});
