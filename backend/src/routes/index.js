const express = require('express');
const exampleController = require('../controllers/exampleController');
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const reuniaoRoutes = require('./reuniaoRoutes');
const googleCalendarRoutes = require('./googleCalendarRoutes');

const router = express.Router();

router.get('/', exampleController.getExample);
router.post('/api/login', (req, res, next) => authController.login(req, res).catch(next));
router.get('/api/sessao', authMiddleware, authController.sessao);

// Monta rotas de reuniões e pedidos de participação
router.use('/api', reuniaoRoutes);
router.use('/', reuniaoRoutes);
router.use('/api/google-calendar', googleCalendarRoutes);

module.exports = router;