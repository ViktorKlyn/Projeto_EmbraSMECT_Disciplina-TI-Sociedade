const exampleRepository = require('../repositories/exampleRepository');

function getExample() {
  return {
    mensagem: 'API funcionando',
    dados: exampleRepository.findAll(),
  };
}

module.exports = { getExample };