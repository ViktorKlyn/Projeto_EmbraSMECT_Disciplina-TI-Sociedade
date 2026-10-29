const express = require('express');
const reuniaoController = require('../controllers/reuniaoController');
const reservasController = require('../controllers/reservasController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Rotas públicas ou utilitárias
router.get('/usuarios', reuniaoController.listarUsuarios);

// Reuniões (com autenticação)
router.get('/reunioes', authMiddleware, reuniaoController.listarReunioes);
router.post('/reunioes', authMiddleware, reuniaoController.criarReuniao);
router.get('/reunioes/:id', authMiddleware, reuniaoController.obterReuniaoPorId);
router.patch('/reunioes/:id/privacidade', authMiddleware, reuniaoController.alterarPrivacidade);

// Pedidos de participação
router.post('/reunioes/:id/pedidos', authMiddleware, reuniaoController.solicitarParticipacao);
router.patch('/pedidos/:id', authMiddleware, reuniaoController.responderPedido);

// Convites (para reuniões privadas e públicas)
router.post('/reunioes/:id/convites', authMiddleware, reuniaoController.enviarConvite);
router.patch('/convites/:id', authMiddleware, reuniaoController.responderConvite);

// Painel do usuário (pedidos e convites)
router.get('/pedidos/meus', authMiddleware, reuniaoController.listarMeusPedidos);

router.get('/reservas', authMiddleware, reservasController.listar);
router.post('/reservas', authMiddleware, reservasController.criar);
router.patch('/reservas/:id/status', authMiddleware, reservasController.atualizarStatus);
router.delete('/reservas/:id', authMiddleware, reservasController.cancelar);

module.exports = router;
