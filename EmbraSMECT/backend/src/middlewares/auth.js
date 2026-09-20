import jwt from 'jsonwebtoken';

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error('JWT_SECRET deve ser definida como variável de ambiente.');
}

export function exigirAutenticacao(req, res, next) {
  const cabecalho = req.headers.authorization || '';
  const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : '';

  try {
    req.usuario = jwt.verify(token, jwtSecret);
    next();
  } catch {
    res.status(401).json({ erro: 'Autenticação necessária.' });
  }
}

export function criarToken(usuario) {
  return jwt.sign({ id: usuario.id, email: usuario.email, nome: usuario.nome }, jwtSecret, { expiresIn: '2h' });
}