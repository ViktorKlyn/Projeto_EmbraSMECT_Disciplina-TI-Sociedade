import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultDataFile = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'app-data.json');
const dataFile = process.env.EMBRASMECT_DATA_FILE
  ? resolve(process.env.EMBRASMECT_DATA_FILE)
  : defaultDataFile;

function readDataFile() {
  try {
    const parsed = JSON.parse(readFileSync(dataFile, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(`O arquivo de dados ${dataFile} deve conter um objeto JSON.`);
    }
    return parsed;
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw error;
  }
}

let data = readDataFile();

export function carregarColecao(nome, padrao) {
  const colecao = data[nome] ?? padrao;
  if (!Array.isArray(colecao)) {
    throw new Error(`A coleção "${nome}" no arquivo ${dataFile} deve ser uma lista.`);
  }
  data[nome] = colecao;
  return colecao;
}

export function salvarColecoes(colecoes) {
  const proximoEstado = { ...data, ...colecoes };
  const diretorio = dirname(dataFile);
  const arquivoTemporario = `${dataFile}.${process.pid}.tmp`;

  mkdirSync(diretorio, { recursive: true });
  try {
    writeFileSync(arquivoTemporario, `${JSON.stringify(proximoEstado, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
    renameSync(arquivoTemporario, dataFile);
    data = proximoEstado;
  } catch (error) {
    throw new Error(`Não foi possível salvar os dados em ${dataFile}: ${error.message}`, { cause: error });
  }
}
