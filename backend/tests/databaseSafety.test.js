const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');

const databasePath = require('./testDatabase').assertIsolatedTestDatabase();
const db = require('../src/config/db');
const backendRoot = path.resolve(__dirname, '..');
const defaultDatabasePath = path.resolve(__dirname, '../../database/embrasmect.db');

test('o banco configurado é temporário e isolado', () => {
  const relative = path.relative(path.resolve(os.tmpdir()), databasePath);
  assert.notEqual(relative, '..');
  assert.ok(!relative.startsWith(`..${path.sep}`));
  assert.notEqual(databasePath.toLowerCase(), defaultDatabasePath.toLowerCase());
  assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
});

test('CRUD de teste afeta somente o banco temporário', () => {
  const nome = `Teste isolado ${process.pid}`;
  const inserted = db.prepare('INSERT INTO salas (nome, capacidade) VALUES (?, ?)').run(nome, 3);
  const id = Number(inserted.lastInsertRowid);
  assert.equal(db.prepare('SELECT nome FROM salas WHERE id = ?').get(id).nome, nome);

  db.prepare('UPDATE salas SET capacidade = ? WHERE id = ?').run(5, id);
  assert.equal(db.prepare('SELECT capacidade FROM salas WHERE id = ?').get(id).capacidade, 5);

  db.prepare('DELETE FROM salas WHERE id = ?').run(id);
  assert.equal(db.prepare('SELECT id FROM salas WHERE id = ?').get(id), undefined);
});

test('falha antes de abrir o banco se DATABASE_PATH estiver ausente', () => {
  const result = spawnSync(process.execPath, ['-e', "require('./src/config/db')"], {
    cwd: backendRoot,
    env: { ...process.env, NODE_ENV: 'test', DATABASE_PATH: '', TEST_DATABASE_ROOT: '' },
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /DATABASE_PATH explícito/);
});

test('recusa o caminho padrão mesmo quando DATABASE_PATH foi definido', () => {
  const result = spawnSync(process.execPath, ['-e', "require('./src/config/db')"], {
    cwd: backendRoot,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_PATH: defaultDatabasePath,
      TEST_DATABASE_ROOT: '',
    },
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /dentro de uma pasta temporária/);
});
