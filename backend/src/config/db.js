const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const dbPath = path.resolve(
  process.env.DATABASE_PATH || path.resolve(__dirname, '../../../database/embrasmect.db')
);
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new DatabaseSync(dbPath);

// Habilita chaves estrangeiras
db.exec('PRAGMA foreign_keys = ON;');

// Criação das tabelas base
db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    perfil TEXT NOT NULL DEFAULT 'comum'
  );

  CREATE TABLE IF NOT EXISTS salas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    capacidade INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reunioes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    sala_id INTEGER NOT NULL REFERENCES salas(id) ON DELETE CASCADE,
    criador_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    data_reuniao TEXT NOT NULL,
    hora_inicio TEXT NOT NULL DEFAULT '14:00',
    hora_fim TEXT NOT NULL DEFAULT '15:00',
    tipo TEXT NOT NULL DEFAULT 'publica' CHECK (tipo IN ('publica', 'privada')),
    status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'cancelada', 'encerrada'))
  );

  CREATE TABLE IF NOT EXISTS participantes_reuniao (
    reuniao_id INTEGER NOT NULL REFERENCES reunioes(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    PRIMARY KEY (reuniao_id, usuario_id)
  );

  CREATE TABLE IF NOT EXISTS lideres_reuniao (
    reuniao_id INTEGER NOT NULL REFERENCES reunioes(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    PRIMARY KEY (reuniao_id, usuario_id)
  );

  CREATE TABLE IF NOT EXISTS pedidos_participacao (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reuniao_id INTEGER NOT NULL REFERENCES reunioes(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceito', 'recusado')),
    criado_em TEXT NOT NULL,
    respondido_em TEXT,
    UNIQUE (reuniao_id, usuario_id)
  );

  CREATE TABLE IF NOT EXISTS convites_reuniao (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reuniao_id INTEGER NOT NULL REFERENCES reunioes(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    convidado_por INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceito', 'recusado')),
    criado_em TEXT NOT NULL,
    respondido_em TEXT,
    UNIQUE (reuniao_id, usuario_id)
  );

  CREATE TABLE IF NOT EXISTS reservas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    sala TEXT NOT NULL,
    data_reserva TEXT NOT NULL,
    recurso TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pendente'
      CHECK (status IN ('Pendente', 'Aprovada', 'Rejeitada')),
    criada_em TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS google_calendar_tokens (
    usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expiry_date INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS google_calendar_states (
    state TEXT PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    criada_em INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS google_calendar_event_syncs (
    tipo TEXT NOT NULL CHECK (tipo IN ('reserva', 'reuniao')),
    entidade_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    evento_id TEXT NOT NULL,
    PRIMARY KEY (tipo, entidade_id),
    UNIQUE (usuario_id, evento_id)
  );
`);

// Migração segura para tabelas já existentes
try {
  db.exec("ALTER TABLE reunioes ADD COLUMN tipo TEXT NOT NULL DEFAULT 'publica';");
} catch (e) {}

try {
  db.exec("ALTER TABLE reunioes ADD COLUMN hora_inicio TEXT NOT NULL DEFAULT '14:00';");
} catch (e) {}

try {
  db.exec("ALTER TABLE reunioes ADD COLUMN hora_fim TEXT NOT NULL DEFAULT '15:00';");
} catch (e) {}

const salasDisponiveis = [
  [1, '1 (Tropical)', 3],
  [2, '2 (Doko)', 20],
  [3, '3 (Conquista)', 50],
  [4, '4 (Uirapuru)', 20],
  [5, '5 (Pintado)', 20],
  [6, '6 (Vencedora)', 20],
  [7, '7 (Tracajá)', 20],
  [8, 'Auditório Principal', 50],
];
const sincronizarSala = db.prepare(`
  INSERT INTO salas (id, nome, capacidade) VALUES (?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET nome = excluded.nome
`);
for (const sala of salasDisponiveis) {
  sincronizarSala.run(...sala);
}

// Sincroniza tipos e líderes para as reuniões padrão
try {
  db.prepare("UPDATE reunioes SET tipo = 'publica' WHERE id = 1").run();
  db.prepare("UPDATE reunioes SET tipo = 'privada' WHERE id = 2").run();
  db.prepare("UPDATE reunioes SET tipo = 'publica' WHERE id IN (3, 4)").run();
  db.prepare("INSERT OR IGNORE INTO lideres_reuniao (reuniao_id, usuario_id) VALUES (1, 3)").run();
  db.prepare("INSERT OR IGNORE INTO lideres_reuniao (reuniao_id, usuario_id) VALUES (2, 2)").run();
} catch (e) {}

// Popular dados iniciais se estiver vazio
const userCount = db.prepare('SELECT COUNT(*) as count FROM usuarios').get().count;

if (userCount === 0) {
  // Inserir Usuários
  const insertUser = db.prepare('INSERT INTO usuarios (id, nome, email, perfil) VALUES (?, ?, ?, ?)');
  insertUser.run(1, 'Gustavo Silva', 'gustavo@embrasmect.edu.br', 'admin');
  insertUser.run(2, 'Prof. Ricardo', 'ricardo@embrasmect.edu.br', 'gestor');
  insertUser.run(3, 'Ana Souza', 'ana@embrasmect.edu.br', 'comum');
  insertUser.run(4, 'Bruno Lima', 'bruno@embrasmect.edu.br', 'comum');

  // Inserir Reuniões
  const insertReuniao = db.prepare('INSERT INTO reunioes (id, titulo, sala_id, criador_id, data_reuniao, hora_inicio, hora_fim, tipo, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  // 1: Pública Futura (criador Ricardo, lider Ana, 2/3 participantes)
  insertReuniao.run(1, 'Alinhamento TI & Sociedade', 1, 2, '2026-10-25', '14:00', '15:00', 'publica', 'ativa');
  // 2: Privada Futura (criador Gustavo, lider Ricardo, 1/3 participantes)
  insertReuniao.run(2, 'Planejamento Estratégico Secreto', 1, 1, '2026-10-27', '10:00', '11:30', 'privada', 'ativa');
  // 3: Reunião Já Realizada / Encerrada
  insertReuniao.run(3, 'Palestra Inaugural de Semestre', 3, 2, '2026-10-10', '08:00', '10:00', 'publica', 'encerrada');
  // 4: Reunião Lotada (3/3 participantes)
  insertReuniao.run(4, 'Comitê Executivo Extraordinário', 1, 2, '2026-10-28', '16:00', '17:00', 'publica', 'ativa');

  // Participantes iniciais
  const insertPart = db.prepare('INSERT INTO participantes_reuniao (reuniao_id, usuario_id) VALUES (?, ?)');
  insertPart.run(1, 2);
  insertPart.run(1, 3);
  insertPart.run(2, 1);
  insertPart.run(3, 2);
  insertPart.run(4, 2);
  insertPart.run(4, 3);
  insertPart.run(4, 4);

  // Líderes iniciais
  const insertLider = db.prepare('INSERT INTO lideres_reuniao (reuniao_id, usuario_id) VALUES (?, ?)');
  insertLider.run(1, 3); // Ana é líder na Reunião 1
  insertLider.run(2, 2); // Ricardo é líder na Reunião 2 (Privada)
}

module.exports = db;
