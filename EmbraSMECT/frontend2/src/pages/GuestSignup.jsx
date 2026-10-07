import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';

export default function GuestSignup() {
  const [searchParams] = useSearchParams();
  const codigoEvento = searchParams.get('evento');
  const linkEvento = codigoEvento ? `/evento/${encodeURIComponent(codigoEvento)}/acesso` : null;
  const [formulario, setFormulario] = useState({ nome: '', email: '', senha: '', confirmarSenha: '' });
  const [erro, setErro] = useState('');
  const [cadastrado, setCadastrado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function cadastrar(event) {
    event.preventDefault();
    setErro('');
    if (formulario.senha !== formulario.confirmarSenha) {
      setErro('As senhas não coincidem.');
      return;
    }

    setEnviando(true);
    try {
      await api.post('/usuarios/cadastro', {
        nome: formulario.nome,
        email: formulario.email,
        senha: formulario.senha,
      });
      setCadastrado(true);
    } catch (requestError) {
      setErro(requestError.response?.data?.erro || 'Não foi possível concluir o cadastro.');
    } finally {
      setEnviando(false);
    }
  }

  return <div className="login-page">
    <form className="login-card guest-signup-card" onSubmit={cadastrar}>
      <span className="eyebrow">ACESSO DO CONVIDADO</span>
      <h1>Criar acesso</h1>
      <p>Crie sua conta de convidado e use o link próprio do evento para entrar.</p>
      {cadastrado ? <div className="notice" role="status">Cadastro concluído. Acesse a página do evento para entrar com seu e-mail e senha.{linkEvento && <Link to={linkEvento}>Ir para o acesso do evento</Link>}</div> : <>
        <label>Nome<input autoComplete="name" maxLength="100" value={formulario.nome} onChange={(event) => setFormulario({ ...formulario, nome: event.target.value })} required /></label>
        <label>E-mail<input type="email" autoComplete="email" maxLength="100" value={formulario.email} onChange={(event) => setFormulario({ ...formulario, email: event.target.value })} required /></label>
        <label>Senha<input type="password" autoComplete="new-password" minLength="12" maxLength="72" value={formulario.senha} onChange={(event) => setFormulario({ ...formulario, senha: event.target.value })} required /></label>
        <label>Confirmar senha<input type="password" autoComplete="new-password" minLength="12" maxLength="72" value={formulario.confirmarSenha} onChange={(event) => setFormulario({ ...formulario, confirmarSenha: event.target.value })} required /></label>
        {erro && <div className="error" role="alert">{erro}</div>}
        <button className="primary-button" type="submit" disabled={enviando}>{enviando ? 'Criando acesso...' : 'Criar acesso de convidado'}</button>
      </>}
      {!cadastrado && <p className="login-signup-prompt"><Link to={linkEvento || '/login'}>{linkEvento ? 'Voltar ao evento' : 'Voltar ao acesso de gestão'}</Link></p>}
    </form>
  </div>;
}