import { Router } from 'express';

const router = Router();
const usuarios = [
  { id: 1, nome: 'Joao', email: 'joao@email.com', senha: '123456' },
  { id: 2, nome: 'Maria', email: 'maria@email.com', senha: 'abcdef' },
];

router.post('/', (req, res) => {
  const usuario = usuarios.find((item) => item.email === req.body.email && item.senha === req.body.senha);
  if (!usuario) return res.status(401).json({ erro: 'Usuário ou senha inválidos.' });
  return res.json({ usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email } });
});
export default router;
