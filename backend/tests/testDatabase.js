const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

function assertIsolatedTestDatabase() {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Execute os testes pelo runner; NODE_ENV=test é obrigatório.');
  }
  if (!process.env.DATABASE_PATH) {
    throw new Error('DATABASE_PATH explícito é obrigatório durante os testes.');
  }
  if (!process.env.TEST_DATABASE_ROOT) {
    throw new Error('TEST_DATABASE_ROOT temporário é obrigatório durante os testes.');
  }

  const databasePath = path.resolve(process.env.DATABASE_PATH);
  const testRoot = path.resolve(process.env.TEST_DATABASE_ROOT);
  if (!fs.existsSync(testRoot)) {
    throw new Error('TEST_DATABASE_ROOT deve existir antes de executar os testes.');
  }
  const physicalTempRoot = fs.realpathSync(path.resolve(os.tmpdir()));
  const physicalTestRoot = fs.realpathSync(testRoot);
  const physicalDatabasePath = fs.existsSync(databasePath)
    ? fs.realpathSync(databasePath)
    : path.join(physicalTestRoot, path.basename(databasePath));
  const relativeToTemp = path.relative(physicalTempRoot, physicalTestRoot);
  const relativeToTestRoot = path.relative(physicalTestRoot, physicalDatabasePath);
  const outsideTemp = relativeToTemp === '..'
    || relativeToTemp.startsWith(`..${path.sep}`)
    || path.isAbsolute(relativeToTemp);
  const outsideTestRoot = relativeToTestRoot === '..'
    || relativeToTestRoot.startsWith(`..${path.sep}`)
    || path.isAbsolute(relativeToTestRoot);
  const expectedDefault = path.resolve(__dirname, '../../database/embrasmect.db');

  if (outsideTemp || outsideTestRoot || path.dirname(databasePath) !== testRoot) {
    throw new Error('O banco do teste deve estar isolado dentro de TEST_DATABASE_ROOT em TEMP.');
  }
  if (databasePath.toLowerCase() === expectedDefault.toLowerCase()) {
    throw new Error('Recusando executar teste contra o banco padrão do projeto.');
  }

  return databasePath;
}

function dataFuturaISO(dias) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const date = new Date(`${values.year}-${values.month}-${values.day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + dias);
  return date.toISOString().slice(0, 10);
}

module.exports = { assertIsolatedTestDatabase, dataFuturaISO };
