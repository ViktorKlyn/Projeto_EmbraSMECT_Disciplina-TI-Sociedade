const googleCalendar = require('../services/googleCalendarService');

function obterMensagemErro(erro) {
  return erro.status ? erro.message : `Falha na integração com Google Agenda: ${erro.message}`;
}

function iniciarConexao(req, res) {
  try {
    return res.json({ url: googleCalendar.criarUrlAutorizacao(req.user.id) });
  } catch (erro) {
    return res.status(erro.status || 502).json({ erro: obterMensagemErro(erro) });
  }
}

async function callback(req, res) {
  try {
    if (req.query.error) {
      return res.redirect(googleCalendar.urlRetorno(`error:${req.query.error}`));
    }
    if (!req.query.code || !req.query.state) {
      return res.redirect(googleCalendar.urlRetorno('error:Resposta de autorização incompleta.'));
    }
    await googleCalendar.concluirAutorizacao(req.query.state, req.query.code);
    return res.redirect(googleCalendar.urlRetorno('connected'));
  } catch (erro) {
    console.error('Erro ao conectar Google Agenda:', erro.message);
    return res.redirect(googleCalendar.urlRetorno(`error:${erro.message}`));
  }
}

function status(req, res) {
  return res.json({ conectado: googleCalendar.obterStatus(req.user.id) });
}

async function sincronizar(req, res) {
  try {
    const resultado = await googleCalendar.sincronizarPendentes(req.user.id);
    if (resultado.erros.length) {
      return res.status(502).json({
        erro: 'Alguns eventos não foram sincronizados com o Google Agenda.',
        ...resultado,
      });
    }
    return res.json(resultado);
  } catch (erro) {
    return res.status(erro.status || 502).json({ erro: obterMensagemErro(erro) });
  }
}

module.exports = { iniciarConexao, callback, status, sincronizar };
