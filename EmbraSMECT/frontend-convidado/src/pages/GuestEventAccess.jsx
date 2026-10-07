import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const formatarData = (data) => new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export default function GuestEventAccess() {
  const { codigo } = useParams();
  const { user, loginGuest, logout, isLoading, authError, restoreSession } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erroLogin, setErroLogin] = useState('');
  const [evento, setEvento] = useState(null);
  const [erroEvento, setErroEvento] = useState('');
  const [carregandoEvento, setCarregandoEvento] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (isLoading || user?.role !== 'guest') {
      setEvento(null);
      setErroEvento('');
      setCarregandoEvento(false);
      return undefined;
    }

    let ativo = true;
    setCarregandoEvento(true);
    api.get(`/reservas/evento/${encodeURIComponent(codigo)}/convidado`)
      .then(({ data }) => {
        if (ativo) setEvento(data);
      })
      .catch((requestError) => {
        if (ativo) setErroEvento(requestError.response?.data?.erro || 'Não foi possível carregar os detalhes do evento.');
      })
      .finally(() => {
        if (ativo) setCarregandoEvento(false);
      });

    return () => {
      ativo = false;
    };
  }, [codigo, isLoading, user]);

  async function entrar(event) {
    event.preventDefault();
    setErroLogin('');
    setEnviando(true);
    try {
      await loginGuest(email, senha);
    } catch (requestError) {
      setErroLogin(requestError.response?.data?.erro || 'Não foi possível conectar à API.');
    } finally {
      setEnviando(false);
    }
  }

  return <main className="page">
    <header className="page-header">
      <Link to={`/evento/${encodeURIComponent(codigo)}`} className="brand">EmbraSMECT</Link>
      <span>Acesso do convidado · {codigo}</span>
    </header>

    {isLoading && <p className="empty">Restaurando sessão...</p>}
    {!isLoading && !user && <div className="auth-wrap"><form className="auth-card" onSubmit={entrar}>
      <span className="eyebrow">ACESSO EXCLUSIVO DO EVENTO</span>
      <h1>Entrar no evento</h1>
      <p>Use a conta de convidado cadastrada com o mesmo e-mail da inscrição.</p>
      <label>E-mail<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
      <label>Senha<input type="password" autoComplete="current-password" value={senha} onChange={(event) => setSenha(event.target.value)} required /></label>
      {authError && <div className="error" role="alert">{authError}<button type="button" className="text-button" onClick={restoreSession}>Tentar novamente</button></div>}
      {erroLogin && <div className="error" role="alert">{erroLogin}</div>}
      <button className="primary-button" type="submit" disabled={enviando}>{enviando ? 'Entrando...' : 'Entrar no evento'}</button>
      <p className="form-footer">Ainda não tem conta de convidado? <Link to={`/cadastro?evento=${encodeURIComponent(codigo)}`}>Criar acesso</Link></p>
    </form></div>}

    {!isLoading && user && user.role !== 'guest' && <section className="panel">
      <h1>Acesso exclusivo para convidados</h1>
      <p>Esta sessão pertence a uma conta de gestão. Saia para entrar com a conta de convidado inscrita neste evento.</p>
      <button className="primary-button" type="button" onClick={logout}>Sair da conta</button>
    </section>}

    {!isLoading && user?.role === 'guest' && carregandoEvento && <p className="empty">Carregando seu evento...</p>}
    {!isLoading && user?.role === 'guest' && erroEvento && <section className="panel">
      <div className="error" role="alert">{erroEvento}</div>
      <p>Se ainda não confirmou sua inscrição, acesse a página pública do evento.</p>
      <Link to={`/evento/${encodeURIComponent(codigo)}`}>Ver detalhes e inscrição</Link>
    </section>}
    {!isLoading && evento && <section className="panel">
      <div className="event-title">
        <span className="eyebrow">{evento.codigo} · SEU EVENTO</span>
        <h1>{evento.nome}</h1>
        <p className="event-date">{formatarData(evento.data)}</p>
        {evento.descricao && <p className="event-description">{evento.descricao}</p>}
      </div>
      <div className="event-details">
        <div><span>Horário</span><strong>{evento.horaInicio} – {evento.horaFim} · {evento.duracaoMinutos} min</strong></div>
        <div><span>Espaço</span><strong>{evento.sala}</strong></div>
        <div><span>Palestrante</span><strong>{evento.palestrante}</strong></div>
      </div>
      <p className="notice" role="status">Inscrição confirmada. Esta é a programação do evento para o qual você está inscrito.</p>
      <button className="text-button" type="button" onClick={logout}>Sair</button>
    </section>}
  </main>;
}
