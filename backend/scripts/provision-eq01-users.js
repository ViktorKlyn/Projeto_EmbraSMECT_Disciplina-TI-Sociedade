const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const { provisionarContasEq01 } = require('../src/services/teamAccountProvisioner');

function main() {
  const databasePath = process.env.DATABASE_PATH
    ? path.resolve(process.env.DATABASE_PATH)
    : '';
  if (!databasePath || !fs.existsSync(databasePath) || !fs.statSync(databasePath).isFile()) {
    throw new Error('Defina DATABASE_PATH para um SQLite existente; o script não cria ou migra bancos.');
  }

  const db = new DatabaseSync(databasePath);
  try {
    db.exec('PRAGMA busy_timeout = 5000;');
    const resultado = provisionarContasEq01(db);
    console.log(`Contas EQ-01 criadas: ${resultado.criadas.length}.`);
    console.log(`Contas já existentes preservadas sem alteração: ${resultado.existentes.length}.`);
    console.log('As senhas permanecem sem configuração; cada pessoa deve defini-la individualmente.');
  } finally {
    db.close();
  }
}

try {
  main();
} catch (erro) {
  console.error(erro.message);
  process.exitCode = 1;
}
