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

app.listen(config.port, () => {
	console.log(`EmbraSMECT API rodando em http://localhost:${config.port}`);
});

module.exports = app;
