const exampleService = require('../services/exampleService');

function getExample(req, res) {
  res.json(exampleService.getExample());
}

module.exports = { getExample };