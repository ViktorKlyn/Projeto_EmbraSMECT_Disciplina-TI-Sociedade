import { Router } from 'express';
import { buscarUsuarioPorId, listarSalas } from '../repositories/usuario.repository.js';
import {
  adicionarRecursoTecnico,
  atualizarNomeRecursoTecnico,
  atualizarSalaRecursoTecnico,
  atualizarStatusRecursoTecnico,
  listarRecursosTecnicos,
  removerRecursoTecnico,
} from '../repositories/recurso-tecnico.repository.js';

const router = Router();
const categoriasValidas = ['Áudio', 'Vídeo', 'Informática', 'Iluminação', 'Outros'];

function apenasEquipe(req, res, next) {
  if (req.usuario.role === 'admin' || req.usuario.role === 'organizer') return next();
  return res.status(403).json({ erro: 'Somente ADM, Gestores ou organizadores podem gerenciar recursos técnicos.' });
}

function eAdmPrincipal(usuarioId) {
  return buscarUsuarioPorId(usuarioId)?.principal === true;
}

router.use(apenasEquipe);

router.get('/', (req, res) => res.json(listarRecursosTecnicos()));

router.delete('/:id', (req, res) => {
  const recurso = removerRecursoTecnico(req.params.id);
  if (!recurso) return res.status(404).json({ erro: 'Recurso técnico não encontrado.' });
  return res.json({ recurso });
});

router.post('/', (req, res) => {
  const nome = typeof req.body.nome === 'string' ? req.body.nome.trim() : '';
  const categoria = typeof req.body.categoria === 'string' ? req.body.categoria : '';
  if (nome.length < 2 || nome.length > 100) {
    return res.status(400).json({ erro: 'Informe um nome de recurso técnico entre 2 e 100 caracteres.' });
  }
  if (!categoriasValidas.includes(categoria)) {
    return res.status(400).json({ erro: 'Selecione uma categoria válida para o recurso técnico.' });
  }
  if (listarRecursosTecnicos().some((recurso) => recurso.nome.toLocaleLowerCase('pt-BR') === nome.toLocaleLowerCase('pt-BR'))) {
    return res.status(409).json({ erro: 'Já existe um recurso técnico com esse nome.' });
  }

  const principal = eAdmPrincipal(req.usuario.id);
  let salaId = null;
  if (principal && req.body.salaId !== undefined && req.body.salaId !== null && req.body.salaId !== '') {
    salaId = Number(req.body.salaId);
    if (!Number.isInteger(salaId) || !listarSalas().some((sala) => sala.id === salaId)) {
      return res.status(400).json({ erro: 'Selecione um espaço válido para fixar o recurso.' });
    }
  }

  const recurso = adicionarRecursoTecnico({
    nome,
    categoria,
    salaId,
    criadoPor: req.usuario.id,
    criadoPorNome: req.usuario.nome,
  });
  return res.status(201).json({ recurso });
});

router.patch('/:id/status', (req, res) => {
  const status = req.body.status;
  if (!['ok', 'manutencao'].includes(status)) {
    return res.status(400).json({ erro: 'Selecione um status válido: OK ou manutenção.' });
  }

  const recurso = atualizarStatusRecursoTecnico(req.params.id, status);
  if (!recurso) return res.status(404).json({ erro: 'Recurso técnico não encontrado.' });
  return res.json({ recurso });
});

router.patch('/:id/nome', (req, res) => {
  const nome = typeof req.body.nome === 'string' ? req.body.nome.trim() : '';
  if (nome.length < 2 || nome.length > 100) {
    return res.status(400).json({ erro: 'Informe um nome de recurso técnico entre 2 e 100 caracteres.' });
  }
  if (listarRecursosTecnicos().some((recurso) => recurso.id !== Number(req.params.id)
    && recurso.nome.toLocaleLowerCase('pt-BR') === nome.toLocaleLowerCase('pt-BR'))) {
    return res.status(409).json({ erro: 'Já existe um recurso técnico com esse nome.' });
  }

  const recurso = atualizarNomeRecursoTecnico(req.params.id, nome);
  if (!recurso) return res.status(404).json({ erro: 'Recurso técnico não encontrado.' });
  return res.json({ recurso });
});

router.patch('/:id/sala', (req, res) => {
  if (!eAdmPrincipal(req.usuario.id)) return res.status(403).json({ erro: 'Somente o ADM pode fixar recursos em espaços.' });

  const salaId = req.body.salaId === null || req.body.salaId === '' ? null : Number(req.body.salaId);
  if (salaId !== null && (!Number.isInteger(salaId) || !listarSalas().some((sala) => sala.id === salaId))) {
    return res.status(400).json({ erro: 'Selecione um espaço válido.' });
  }

  const recurso = atualizarSalaRecursoTecnico(req.params.id, salaId);
  if (!recurso) return res.status(404).json({ erro: 'Recurso técnico não encontrado.' });
  return res.json({ recurso });
});

export default router;
