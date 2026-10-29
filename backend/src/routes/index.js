const express = require('express');
const exampleController = require('../controllers/exampleController');
const reuniaoRoutes = require('./reuniaoRoutes');
const googleCalendarRoutes = require('./googleCalendarRoutes');

const router = express.Router();

router.get('/', exampleController.getExample);

// Monta rotas de reuniões e pedidos de participação
router.use('/api', reuniaoRoutes);
router.use('/', reuniaoRoutes);
router.use('/api/google-calendar', googleCalendarRoutes);

module.exports = router;