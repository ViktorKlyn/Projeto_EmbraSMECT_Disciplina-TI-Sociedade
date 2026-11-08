const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const { criarHashSenha } = require('../src/services/authService');

function lerSenhaOculta(rotulo) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    return Promise.reject(new Error('Execute este comando em um terminal interativo para digitar a senha com segurança.'));
  }

  const stdin = process.stdin;
  process.stdout.write(rotulo);
  stdin.setEncoding('utf8');
  stdin.setRawMode(true);
  stdin.resume();

  return new Promise((resolve, reject) => {
    let valor = '';
    const finalizar = (erro) => {
      stdin.removeListener('data', receber);
      stdin.setRawMode(false);
      stdin.pause();
      process.stdout.write('\n');
      if (erro) reject(erro);
      else resolve(valor);
    };
    const receber = (caractere) => {
      if (caractere === '\u0003') return finalizar(new Error('Operação cancelada.'));
      if (caractere === '\r' || caractere === '\n') return finalizar();
      if (caractere === '\u0008' || caractere === '\u007f') {
        valor = valor.slice(0, -1);
        return;
      }
      if (caractere >= ' ') valor += caractere;
    };
    stdin.on('data', receber);
  });
}

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const databasePath = process.env.DATABASE_PATH
    ? path.resolve(process.env.DATABASE_PATH)
    : '';
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error('Informe o e-mail de um usuário já cadastrado: npm run set-password -- usuario@exemplo.org');
  }
  if (!databasePath || !fs.existsSync(databasePath) || !fs.statSync(databasePath).isFile()) {
    throw new Error('Defina DATABASE_PATH para um arquivo SQLite existente após criar um backup.');
  }

  const senha = await lerSenhaOculta('Nova senha (mínimo 12 caracteres): ');
  const confirmacao = await lerSenhaOculta('Confirme a senha: ');
  if (senha.length < 12 || senha !== confirmacao) {
    throw new Error('As senhas devem coincidir e ter pelo menos 12 caracteres.');
  }

  const db = new DatabaseSync(databasePath);
  try {
    db.exec('PRAGMA busy_timeout = 5000;');
    const colunasUsuario = db.prepare('PRAGMA table_info(usuarios)').all();
    if (!colunasUsuario.some((coluna) => coluna.name === 'senha_hash')) {
      throw new Error('A coluna senha_hash não existe. O script não executou migrações.');
    }

    const usuario = db.prepare('SELECT id FROM usuarios WHERE lower(email) = ?').get(email);
    if (!usuario) throw new Error('Não há usuário cadastrado com esse e-mail.');

    const atualizacao = db.prepare('UPDATE usuarios SET senha_hash = ? WHERE lower(email) = ?')
      .run(await criarHashSenha(senha), email);
    if (atualizacao.changes !== 1) throw new Error('Não foi possível atualizar exatamente um usuário.');
    console.log('Senha configurada para o usuário existente. Nenhuma migração ou seed foi executada.');
  } finally {
    db.close();
  }
}

main().catch((erro) => {
  console.error(erro.message);
  process.exitCode = 1;
});
