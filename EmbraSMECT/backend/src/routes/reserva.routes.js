import { Router } from 'express';
import {
	getEventosDisponiveis,
	getEventosTV,
	getRelatorios,
	getReservas,
	getEventosInscritos,
	getEventoInscrito,
	deleteEvento,
	patchAssento,
	patchEvento,
	patchReserva,
	postInscricao,
	postReserva,
} from '../controllers/reserva.controller.js';
import { listarSalas } from '../repositories/usuario.repository.js';

const router = Router();

router.get('/evento/:codigo/convidado', (req, res, next) => {
	if (req.usuario.role === 'guest') return next();
	return res.status(403).json({ erro: 'Somente convidados podem acessar esta página.' });
}, getEventoInscrito);

router.get('/salas', (req, res, next) => {
	if (req.usuario.role === 'admin' || req.usuario.role === 'organizer') {
		return res.json(listarSalas());
	}
	return res.status(403).json({ erro: 'Somente ADM ou organizadores podem consultar os espaços.' });
});

router.get('/ficha', (req, res, next) => {
	if (['guest', 'admin', 'organizer'].includes(req.usuario.role)) return next();
	return res.status(403).json({ erro: 'Papel de usuário sem permissão para consultar eventos disponíveis.' });
}, getEventosDisponiveis);

router.get('/inscricoes', (req, res, next) => {
	if (['guest', 'admin', 'organizer'].includes(req.usuario.role)) return next();
	return res.status(403).json({ erro: 'Papel de usuário sem permissão para consultar inscrições.' });
}, getEventosInscritos);

router.get('/relatorios', (req, res, next) => {
	if (req.usuario.role === 'admin' || req.usuario.role === 'organizer') return next();
	return res.status(403).json({ erro: 'Somente ADM ou organizadores podem consultar relatórios.' });
}, getRelatorios);

router.get('/tv', (req, res, next) => {
	if (req.usuario.role === 'admin' || req.usuario.role === 'organizer') return next();
	return res.status(403).json({ erro: 'Somente ADM ou organizadores podem exibir a programação na TV.' });
}, getEventosTV);

router.patch('/:id', (req, res, next) => {
	if (req.usuario.role === 'admin' || req.usuario.role === 'organizer') return next();
	return res.status(403).json({ erro: 'Somente quem cadastrou o evento pode alterá-lo.' });
}, patchEvento);

router.delete('/:id', (req, res, next) => {
	if (req.usuario.role === 'admin' || req.usuario.role === 'organizer') return next();
	return res.status(403).json({ erro: 'Somente quem cadastrou o evento pode excluí-lo.' });
}, deleteEvento);

router.post('/:id/inscricoes', (req, res, next) => {
	if (['guest', 'admin', 'organizer'].includes(req.usuario.role)) return next();
	return res.status(403).json({ erro: 'Papel de usuário sem permissão para se inscrever.' });
}, postInscricao);

router.patch('/:id/inscricoes/:convidadoId/assento', (req, res, next) => {
	if (req.usuario.role === 'admin' || req.usuario.role === 'organizer') return next();
	return res.status(403).json({ erro: 'Somente ADM ou o organizador podem atribuir assentos.' });
}, patchAssento);

// Todos os papéis cadastrados podem consultar reservas; outros são recusados.
router.get('/', (req, res, next) => {
	if (req.usuario.role === 'admin' || req.usuario.role === 'organizer' || req.usuario.role === 'guest') {
		return next();
	} else {
		return res.status(403).json({ erro: 'Papel de usuário sem permissão.' });
	}
}, getReservas);

// Administradores e organizadores podem solicitar reservas; convidados não podem.
router.post('/', (req, res, next) => {
	if (req.usuario.role === 'admin' || req.usuario.role === 'organizer') {
		return next();
	} else if (req.usuario.role === 'guest') {
		return res.status(403).json({ erro: 'Convidados podem apenas consultar as reservas.' });
	} else {
		return res.status(403).json({ erro: 'Papel de usuário sem permissão.' });
	}
}, postReserva);

// Somente administradores podem tomar decisões sobre reservas.
router.patch('/:id/decisao', (req, res, next) => {
	if (req.usuario.role === 'admin') return next();
	return res.status(403).json({ erro: 'Somente administradores podem aprovar ou rejeitar reservas.' });
}, patchReserva);
export default router;
