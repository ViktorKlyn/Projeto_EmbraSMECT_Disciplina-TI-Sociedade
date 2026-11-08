const CONTAS_EQ01 = [
  {
    nome: 'João Victor Klein',
    email: 'joaoklein@email.com',
    perfil: 'admin',
    nomesAnteriores: ['João Victor Klein', 'Joao Klein'],
  },
  {
    nome: 'Fernando Vinícius da Costa Vaz',
    email: 'fernandovinicius@email.com',
    perfil: 'admin',
    nomesAnteriores: ['Fernando Vinícius da Costa Vaz', 'Fernando Vinícuis'],
  },
  {
    nome: 'Gustavo Lira de Oliveira',
    email: 'gustavolira@email.com',
    perfil: 'admin',
    nomesAnteriores: ['Gustavo Lira de Oliveira', 'Gustavo Lira'],
  },
  {
    nome: 'Nicolas Toshio',
    email: 'nicolastoshio@email.com',
    perfil: 'admin',
    nomesAnteriores: ['Nicolas Toshio'],
  },
  {
    nome: 'Lorkendy Lormilus',
    email: 'lormiluskendy@email.com',
    perfil: 'admin',
    nomesAnteriores: ['Lorkendy Lormilus', 'Lormilus Kendy'],
  },
];

function normalizarNome(nome) {
  return nome.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLocaleLowerCase('pt-BR');
}

function provisionarContasEq01(db) {
  const colunas = db.prepare('PRAGMA table_info(usuarios)').all();
  if (!['id', 'nome', 'email', 'perfil', 'senha_hash'].every((nome) => colunas.some((coluna) => coluna.name === nome))) {
    throw new Error('O schema de usuários não corresponde ao esperado; nenhuma conta foi alterada.');
  }

  const existentes = [];
  const criadas = [];
  db.exec('BEGIN IMMEDIATE');
  try {
    const usuarios = db.prepare('SELECT id, nome, email, perfil FROM usuarios').all();
    const porEmail = new Map(usuarios.map((usuario) => [usuario.email.toLocaleLowerCase('en-US'), usuario]));

    for (const conta of CONTAS_EQ01) {
      const emailNormalizado = conta.email.toLocaleLowerCase('en-US');
      if (porEmail.has(emailNormalizado)) {
        existentes.push(conta.email);
        continue;
      }

      const nomesNormalizados = new Set(conta.nomesAnteriores.map(normalizarNome));
      const duplicataPessoa = usuarios.find((usuario) => nomesNormalizados.has(normalizarNome(usuario.nome)));
      if (duplicataPessoa) {
        throw new Error(`Existe um usuário com nome correspondente e outro e-mail; revisão manual necessária para ${conta.email}.`);
      }

      const resultado = db.prepare(`
        INSERT INTO usuarios (nome, email, perfil, senha_hash)
        VALUES (?, ?, ?, NULL)
      `).run(conta.nome, conta.email, conta.perfil);
      criadas.push(conta.email);
      usuarios.push({ id: Number(resultado.lastInsertRowid), ...conta });
      porEmail.set(emailNormalizado, conta);
    }

    db.exec('COMMIT');
    return { criadas, existentes };
  } catch (erro) {
    db.exec('ROLLBACK');
    throw erro;
  }
}

module.exports = { provisionarContasEq01 };
