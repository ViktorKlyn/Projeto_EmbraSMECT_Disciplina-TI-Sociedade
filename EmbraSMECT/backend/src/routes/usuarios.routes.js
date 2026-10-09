import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { rateLimit } from 'express-rate-limit';
import { exigirAutenticacao } from '../middlewares/auth.js';
import {
  adicionarSala,
  adicionarUsuario,
  atualizarCapacidadeSala,
  buscarUsuarioPorId,
  configurarSalasConjugadas,
  emailEmUso,
  listarSalas,
  listarUsuarios,
  promoverOrganizador,
  rebaixarAdmin,
  removerSala,
  removerUsuario,
} from '../repositories/usuario.repository.js';
import { renomearEspaco, salaEmUso } from '../repositories/reserva.repository.js';
import { desvincularRecursosTecnicosDaSala } from '../repositories/recurso-tecnico.repository.js';

const router = Router();
const emailValido = /^\S+@\S+\.\S+$/;
const limiteCadastro = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false, message: { erro: 'Limite de cadastros atingido. Tente novamente mais tarde.' } });

function usuarioPublico({ senha, ...usuario }) {
  return usuario;
}

function apenasAdmin(req, res, next) {
  if (req.usuario.role !== 'admin') return res.status(403).json({ erro: 'Somente ADM ou Gestores podem gerenciar contas.' });
  return next();
}

function eAdminPrincipal(usuarioId) {
  return buscarUsuarioPorId(usuarioId)?.principal === true;
}

router.post('/cadastro', limiteCadastro, async (req, res) => {
  const nome = typeof req.body.nome === 'string' ? req.body.nome.trim() : '';
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const senha = typeof req.body.senha === 'string' ? req.body.senha : '';

  if (nome.length < 2 || nome.length > 100 || !emailValido.test(email) || senha.length < 12 || Buffer.byteLength(senha) > 72) {
    return res.status(400).json({ erro: 'Informe nome, e-mail válido e senha entre 12 e 72 bytes.' });
  }
  if (emailEmUso(email)) return res.status(409).json({ erro: 'Este e-mail já está cadastrado.' });

  const senhaHash = await bcrypt.hash(senha, 12);
  const usuario = adicionarUsuario({ nome, email, senha: senhaHash, role: 'guest' });
  return res.status(201).json({ usuario: usuarioPublico(usuario) });
});

router.use(exigirAutenticacao, apenasAdmin);

router.get('/', (req, res) => res.json(listarUsuarios(req.usuario)));

router.get('/salas', (req, res) => res.json(listarSalas()));

router.post('/organizadores', async (req, res) => {
  const nome = typeof req.body.nome === 'string' ? req.body.nome.trim() : '';
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const senha = typeof req.body.senha === 'string' ? req.body.senha : '';

  if (nome.length < 2 || nome.length > 100 || !emailValido.test(email) || senha.length < 12 || Buffer.byteLength(senha) > 72) {
    return res.status(400).json({ erro: 'Informe nome, e-mail válido e senha entre 12 e 72 bytes.' });
  }
  if (emailEmUso(email)) return res.status(409).json({ erro: 'Este e-mail já está cadastrado.' });

  const senhaHash = await bcrypt.hash(senha, 12);
  const usuario = adicionarUsuario({ nome, email, senha: senhaHash, role: 'organizer' });
  return res.status(201).json({ usuario: usuarioPublico(usuario) });
});

router.post('/salas', (req, res) => {
  if (!eAdminPrincipal(req.usuario.id)) return res.status(403).json({ erro: 'Somente o ADM pode criar espaços.' });

  const nome = typeof req.body.nome === 'string' ? req.body.nome.trim() : '';
  const capacidade = Number(req.body.capacidade);

  if (!nome || nome.length < 2 || !Number.isFinite(capacidade) || capacidade < 1 || capacidade > 500) {
    return res.status(400).json({ erro: 'Informe nome do espaço e capacidade válida entre 1 e 500.' });
  }

  const sala = adicionarSala({ nome, capacidade });
  if (!sala) return res.status(400).json({ erro: 'Não foi possível criar o espaço.' });

  return res.status(201).json({ sala });
});

router.delete('/salas/:id', (req, res) => {
  if (!eAdminPrincipal(req.usuario.id)) return res.status(403).json({ erro: 'Somente o ADM pode excluir espaços.' });

  const sala = listarSalas().find((item) => item.id === Number(req.params.id));
  if (!sala) return res.status(404).json({ erro: 'Espaço não encontrado.' });
  if (salaEmUso(sala.nome)) return res.status(409).json({ erro: 'Este espaço não pode ser removido porque está vinculado a uma reserva.' });

  const removida = removerSala(sala.id);
  if (!removida) return res.status(404).json({ erro: 'Não foi possível remover o espaço.' });
  desvincularRecursosTecnicosDaSala(sala.id);

  return res.json({ sala: removida });
});

router.patch('/salas/:id/nome', (req, res) => {
  if (!eAdminPrincipal(req.usuario.id)) return res.status(403).json({ erro: 'Somente o ADM pode alterar espaços.' });

  const resultado = renomearEspaco(req.params.id, req.body.nome);
  if (resultado.erro) return res.status(resultado.status).json({ erro: resultado.erro });
  return res.json({ sala: resultado.espaco });
});

router.patch('/salas/:id', (req, res) => {
  if (!eAdminPrincipal(req.usuario.id)) return res.status(403).json({ erro: 'Somente o ADM pode alterar espaços.' });

  const capacidade = req.body.capacidade;
  if (!Number.isInteger(Number(capacidade)) || Number(capacidade) < 1 || Number(capacidade) > 500) {
    return res.status(400).json({ erro: 'A capacidade deve ser um número inteiro entre 1 e 500.' });
  }

  const sala = atualizarCapacidadeSala(req.params.id, capacidade);
  if (!sala) return res.status(404).json({ erro: 'Espaço não encontrado.' });

  return res.json({ sala });
});

router.patch('/salas/:id/conjugada', (req, res) => {
  if (!eAdminPrincipal(req.usuario.id)) return res.status(403).json({ erro: 'Somente o ADM pode configurar espaços para uso conjunto.' });

  const conjugadaId = req.body.conjugadaId === null ? null : Number(req.body.conjugadaId);
  if (conjugadaId !== null && (!Number.isInteger(conjugadaId) || conjugadaId < 1)) {
    return res.status(400).json({ erro: 'Selecione um espaço válido para uso conjunto ou nenhum.' });
  }

  const resultado = configurarSalasConjugadas(req.params.id, conjugadaId);
  if (resultado.erro) return res.status(resultado.status).json({ erro: resultado.erro });

  return res.json(resultado);
});

router.patch('/:id/promover-admin', (req, res) => {
  const usuario = buscarUsuarioPorId(req.params.id);
  if (!usuario) return res.status(404).json({ erro: 'Conta não encontrada.' });
  if (usuario.role !== 'organizer') return res.status(409).json({ erro: 'Somente organizadores podem ser promovidos a Gestor.' });

  return res.json({ usuario: usuarioPublico(promoverOrganizador(usuario.id)) });
});

router.patch('/:id/rebaixar-admin', (req, res) => {
  if (!eAdminPrincipal(req.usuario.id)) return res.status(403).json({ erro: 'Somente o ADM pode rebaixar contas.' });

  const usuario = buscarUsuarioPorId(req.params.id);
  if (!usuario) return res.status(404).json({ erro: 'Conta não encontrada.' });
  if (usuario.role !== 'admin' || usuario.principal) return res.status(409).json({ erro: 'Somente contas de Gestor podem ser rebaixadas para organizador.' });

  const atualizado = rebaixarAdmin(usuario.id);
  if (!atualizado) return res.status(409).json({ erro: 'Não foi possível rebaixar esta conta.' });

  return res.json({ usuario: usuarioPublico(atualizado) });
});

router.delete('/:id', (req, res) => {
  if (!eAdminPrincipal(req.usuario.id)) return res.status(403).json({ erro: 'Somente o ADM pode excluir contas.' });

  const usuario = buscarUsuarioPorId(req.params.id);
  if (!usuario) return res.status(404).json({ erro: 'Conta não encontrada.' });
  if (usuario.id === req.usuario.id) return res.status(403).json({ erro: 'O ADM não pode excluir a própria conta.' });
  if (usuario.principal) return res.status(409).json({ erro: 'O ADM não pode ser excluído.' });

  const removido = removerUsuario(usuario.id);
  if (!removido) return res.status(404).json({ erro: 'Não foi possível excluir a conta.' });

  return res.json({ usuario: usuarioPublico(removido) });
});

export default router;