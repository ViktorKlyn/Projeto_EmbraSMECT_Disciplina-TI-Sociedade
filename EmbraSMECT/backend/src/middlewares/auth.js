import jwt from 'jsonwebtoken';

// A mesma chave deve ser usada para criar e validar os tokens JWT.
// Ela fica no ambiente para não ser exposta no código-fonte.
const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error('JWT_SECRET deve ser definida como variável de ambiente.');
}

// Protege rotas que exigem um usuário autenticado.
export function exigirAutenticacao(req, res, next) {
  const cabecalho = req.headers.authorization || '';
  const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : '';

  try {
    // Valida o token e disponibiliza os dados do usuário para a rota.
    req.usuario = jwt.verify(token, jwtSecret);
    next();
  } catch {
    // Token ausente, expirado ou inválido não pode acessar a rota.
    res.status(401).json({ erro: 'Autenticação necessária.' });
  }
}

// Cria um token com os dados mínimos necessários no frontend.
export function criarToken(usuario) {
  // Inclui o papel e o nível administrativo para que as rotas possam autorizar ações.
  return jwt.sign({
    id: usuario.id,
    email: usuario.email,
    nome: usuario.nome,
    role: usuario.role,
    principal: Boolean(usuario.principal),
  }, jwtSecret, { expiresIn: '2h' });
}