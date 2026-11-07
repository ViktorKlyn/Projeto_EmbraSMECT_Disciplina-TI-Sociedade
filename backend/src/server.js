const express = require('express');
const cors = require('cors');
const config = require('./config/config');
const logger = require('./middlewares/logger');
const routes = require('./routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(logger);
app.use('/', routes);

// Middleware para rotas não encontradas (404 JSON)
app.use((req, res) => {
	res.status(404).json({
		erro: 'Rota não encontrada',
		metodo: req.method,
		caminho: req.originalUrl,
	});
});

// Middleware de tratamento global de exceções
app.use((err, req, res, next) => {
	console.error('Erro na requisição:', err);
	res.status(500).json({
		erro: 'Erro interno do servidor',
		mensagem: err.message || 'Ocorreu um erro inesperado.',
	});
});

app.listen(config.port, () => {
	console.log(`Embrapa Meeting API rodando em http://localhost:${config.port}`);
});

module.exports = app;
