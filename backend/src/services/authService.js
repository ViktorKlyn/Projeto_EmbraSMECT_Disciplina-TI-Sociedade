const crypto = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(crypto.scrypt);
const DURACAO_SESSAO_SEGUNDOS = 8 * 60 * 60;

function obterSegredoSessao() {
  const segredo = process.env.AUTH_SECRET;
  return typeof segredo === 'string' && segredo.length >= 32 ? segredo : null;
}

async function criarHashSenha(senha) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(senha, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

async function verificarSenha(senha, senhaHash) {
  if (typeof senha !== 'string' || typeof senhaHash !== 'string') return false;
  const [algoritmo, saltHex, hashHex, ...resto] = senhaHash.split('$');
  if (
    algoritmo !== 'scrypt' ||
    resto.length > 0 ||
    !/^(?:[a-f0-9]{2})+$/i.test(saltHex || '') ||
    !/^(?:[a-f0-9]{2})+$/i.test(hashHex || '')
  ) {
    return false;
  }

  const salt = Buffer.from(saltHex, 'hex');
  const esperado = Buffer.from(hashHex, 'hex');
  const recebido = await scrypt(senha, salt, esperado.length);
  return recebido.length === esperado.length && crypto.timingSafeEqual(recebido, esperado);
}

function criarTokenSessao(usuario, segredo = obterSegredoSessao()) {
  if (!segredo) throw new Error('AUTH_SECRET deve conter pelo menos 32 caracteres.');
  const payload = Buffer.from(JSON.stringify({
    sub: usuario.id,
    exp: Math.floor(Date.now() / 1000) + DURACAO_SESSAO_SEGUNDOS,
  })).toString('base64url');
  const assinatura = crypto.createHmac('sha256', segredo).update(payload).digest('base64url');
  return `${payload}.${assinatura}`;
}

function verificarTokenSessao(token, segredo = obterSegredoSessao()) {
  if (!segredo || typeof token !== 'string') return null;
  const partes = token.split('.');
  if (partes.length !== 2) return null;

  const [payload, assinatura] = partes;
  const assinaturaEsperada = crypto.createHmac('sha256', segredo).update(payload).digest();
  let assinaturaRecebida;
  try {
    assinaturaRecebida = Buffer.from(assinatura, 'base64url');
  } catch {
    return null;
  }
  if (
    assinaturaRecebida.length !== assinaturaEsperada.length ||
    !crypto.timingSafeEqual(assinaturaRecebida, assinaturaEsperada)
  ) {
    return null;
  }

  try {
    const dados = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!Number.isInteger(dados.sub) || !Number.isInteger(dados.exp) || dados.exp <= Date.now() / 1000) {
      return null;
    }
    return { usuarioId: dados.sub };
  } catch {
    return null;
  }
}

module.exports = {
  criarHashSenha,
  criarTokenSessao,
  obterSegredoSessao,
  verificarSenha,
  verificarTokenSessao,
};
