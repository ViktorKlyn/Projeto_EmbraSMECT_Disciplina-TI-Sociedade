const express = require('express');
const googleCalendarController = require('../controllers/googleCalendarController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/connect', authMiddleware, googleCalendarController.iniciarConexao);
router.get('/callback', googleCalendarController.callback);
router.get('/status', authMiddleware, googleCalendarController.status);
router.post('/sync', authMiddleware, googleCalendarController.sincronizar);

module.exports = router;
