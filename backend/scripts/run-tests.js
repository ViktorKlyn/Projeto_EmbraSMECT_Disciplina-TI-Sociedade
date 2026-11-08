const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const backendRoot = path.resolve(__dirname, '..');
const testsRoot = path.join(backendRoot, 'tests');
const testFiles = fs.readdirSync(testsRoot)
  .filter((name) => name.endsWith('.test.js'))
  .sort();

if (testFiles.length === 0) {
  console.error('Nenhum arquivo de teste foi encontrado.');
  process.exit(1);
}

const tempRoot = path.resolve(os.tmpdir());
const runnerRoot = process.env.EMBRAPA_TEST_RUN_ROOT
  ? path.resolve(process.env.EMBRAPA_TEST_RUN_ROOT)
  : fs.mkdtempSync(path.join(tempRoot, 'embrapa-meeting-tests-'));
const relativeToTemp = path.relative(tempRoot, runnerRoot);
if (relativeToTemp === '..' || relativeToTemp.startsWith(`..${path.sep}`) || path.isAbsolute(relativeToTemp)) {
  throw new Error('O diretório de testes não está dentro do diretório temporário do sistema.');
}
if (process.env.EMBRAPA_TEST_RUN_ROOT) {
  if (fs.existsSync(runnerRoot)) {
    throw new Error(`O diretório de teste já existe; recusando reutilizá-lo: ${runnerRoot}`);
  }
  fs.mkdirSync(runnerRoot);
}

let failures = 0;
try {
  for (const testFile of testFiles) {
    const isolatedRoot = path.join(runnerRoot, path.basename(testFile, '.test.js'));
    fs.mkdirSync(isolatedRoot);
    const databasePath = path.join(isolatedRoot, 'test.sqlite');
    const env = {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_PATH: databasePath,
      TEST_DATABASE_ROOT: isolatedRoot,
      AUTH_SECRET: 'test-only-secret-with-at-least-thirty-two-characters',
      GOOGLE_CLIENT_ID: 'test-google-client-id',
      GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
      GOOGLE_TOKEN_ENCRYPTION_KEY: 'a'.repeat(64),
      GOOGLE_REDIRECT_URI: 'http://127.0.0.1:3000/api/google-calendar/callback',
      FRONTEND_URL: 'http://127.0.0.1:3001',
    };

    console.log(`\nTeste: ${path.join(testsRoot, testFile)}`);
    console.log(`DATABASE_PATH temporário: ${databasePath}`);
    const result = spawnSync(process.execPath, ['--test', path.join(testsRoot, testFile)], {
      cwd: backendRoot,
      env,
      stdio: 'inherit',
    });

    if (result.error) {
      console.error(`Não foi possível iniciar o teste ${testFile}:`, result.error.message);
      failures++;
    } else if (result.status !== 0) {
      console.error(`Teste falhou: ${testFile} (código ${result.status ?? 'indisponível'})`);
      failures++;
    }

    const resolvedRoot = path.resolve(isolatedRoot);
    const relativeToRunner = path.relative(runnerRoot, resolvedRoot);
    if (relativeToRunner === '..' || relativeToRunner.startsWith(`..${path.sep}`) || path.isAbsolute(relativeToRunner)) {
      throw new Error('Recusando limpeza fora do diretório temporário criado pelo runner.');
    }
    fs.rmSync(resolvedRoot, { recursive: true, force: true });
  }
} finally {
  fs.rmSync(runnerRoot, { recursive: true, force: true });
}

if (failures > 0) {
  console.error(`\n${failures} arquivo(s) de teste falharam.`);
  process.exitCode = 1;
} else {
  console.log('\nTodos os arquivos de teste passaram; os bancos temporários foram removidos.');
}
