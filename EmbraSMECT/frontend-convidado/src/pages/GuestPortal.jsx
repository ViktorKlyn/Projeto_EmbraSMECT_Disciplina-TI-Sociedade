import React, { useEffect, useState } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const formatarData = (data) => new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function dataAtualISO() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const valores = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
  return `${valores.year}-${valores.month}-${valores.day}`;
}

export default function GuestPortal() {
  const location = useLocation();
  const { codigo: codigoDaRota } = useParams();
  const [searchParams] = useSearchParams();
  const codigoInicial = searchParams.get('evento') || codigoDaRota || '';
  const { user, loginGuest, logout, isLoading, authError, restoreSession } = useAuth();
  const [modo, setModo] = useState(location.pathname === '/cadastro' ? 'cadastro' : 'login');
  const [credenciais, setCredenciais] = useState({ nome: '', email: '', senha: '', confirmarSenha: '' });
  const [codigoEvento, setCodigoEvento] = useState(codigoInicial);
  const [evento, setEvento] = useState(null);
  const [inscrito, setInscrito] = useState(false);
  const [erro, setErro] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    setCodigoEvento(codigoInicial);
  }, [codigoInicial]);

  async function autenticar(event) {
    event.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      if (modo === 'cadastro') {
        if (credenciais.senha !== credenciais.confirmarSenha) {
          setErro('As senhas não coincidem.');
          return;
        }
        await api.post('/usuarios/cadastro', {
          nome: credenciais.nome,
          email: credenciais.email,
          senha: credenciais.senha,
        });
      }
      await loginGuest(credenciais.email, credenciais.senha);
    } catch (requestError) {
      setErro(requestError.response?.data?.erro || 'Não foi possível conectar à API.');
    } finally {
      setEnviando(false);
    }
  }

  async function buscarEvento(event) {
    event.preventDefault();
    setErro('');
    setEvento(null);
    setInscrito(false);
    setBuscando(true);
    try {
      const codigoNormalizado = codigoEvento.trim();
      const { data: dadosEvento } = await api.get(`/eventos/${encodeURIComponent(codigoNormalizado)}`);
      const { data: inscricoes } = await api.get('/reservas/inscricoes');
      setEvento(dadosEvento);
      setInscrito(inscricoes.some((item) => item.id === dadosEvento.id));
    } catch (requestError) {
      setErro(requestError.response?.data?.erro || 'Não foi possível localizar ou validar este evento.');
    } finally {
      setBuscando(false);
    }
  }

  async function inscrever() {
    setErro('');
    setEnviando(true);
    try {
      const { data } = await api.post(`/reservas/${evento.id}/inscricoes`);
      setEvento((atual) => ({ ...atual, participantes: data.participantes }));
      setInscrito(true);
    } catch (requestError) {
      setErro(requestError.response?.data?.erro || 'Não foi possível realizar a inscrição.');
    } finally {
      setEnviando(false);
    }
  }

  function sair() {
    logout();
    setEvento(null);
    setInscrito(false);
    setErro('');
  }

  const vagasRestantes = evento ? Math.max(0, evento.capacidadeSala - evento.participantes) : 0;
  const eventoDisponivel = evento?.status === 'aprovada'
    && evento.data >= dataAtualISO()
    && vagasRestantes > 0;

  if (isLoading) {
    return <main className="auth-page"><p className="empty">Verificando acesso...</p></main>;
  }

  if (!user) {
    return <main className="auth-page">
      <form className="auth-card" onSubmit={autenticar}>
        <span className="eyebrow">ACESSO DO CONVIDADO</span>
        <h1>{modo === 'login' ? 'Entrar' : 'Criar acesso'}</h1>
        <p>{modo === 'login'
          ? 'Entre para localizar o evento e confirmar sua inscrição.'
          : 'Crie sua conta de convidado para se inscrever em eventos.'}</p>
        {modo === 'cadastro' && <label>Nome<input autoComplete="name" maxLength="100" value={credenciais.nome} onChange={(event) => setCredenciais({ ...credenciais, nome: event.target.value })} minLength="2" required /></label>}
        <label>E-mail<input type="email" autoComplete="email" maxLength="100" value={credenciais.email} onChange={(event) => setCredenciais({ ...credenciais, email: event.target.value })} required /></label>
        <label>Senha<input type="password" autoComplete={modo === 'login' ? 'current-password' : 'new-password'} minLength={modo === 'cadastro' ? 12 : undefined} maxLength="72" value={credenciais.senha} onChange={(event) => setCredenciais({ ...credenciais, senha: event.target.value })} required /></label>
        {modo === 'cadastro' && <label>Confirmar senha<input type="password" autoComplete="new-password" minLength="12" maxLength="72" value={credenciais.confirmarSenha} onChange={(event) => setCredenciais({ ...credenciais, confirmarSenha: event.target.value })} required /></label>}
        {authError && <div className="error" role="alert">{authError}<button type="button" className="text-button" onClick={restoreSession}>Tentar novamente</button></div>}
        {erro && <div className="error" role="alert">{erro}</div>}
        <button className="primary-button" type="submit" disabled={enviando}>{enviando ? 'Aguarde...' : modo === 'login' ? 'Entrar' : 'Criar conta e entrar'}</button>
        <p className="form-footer">
          {modo === 'login' ? 'Ainda não tem conta?' : 'Já tem uma conta?'}
          <button className="text-button" type="button" onClick={() => { setErro(''); setModo(modo === 'login' ? 'cadastro' : 'login'); }}>
            {modo === 'login' ? 'Criar acesso' : 'Entrar'}
          </button>
        </p>
      </form>
    </main>;
  }

  return <main className="page">
    <header className="page-header">
      <strong className="brand">EmbraSMECT</strong>
      <span>{user.nome} · <button className="text-button" type="button" onClick={sair}>Sair</button></span>
    </header>
    <section className="panel">
      <span className="eyebrow">ÁREA DO CONVIDADO</span>
      <h1>Localize seu evento</h1>
      <p>Informe o código do evento fornecido pelo administrador ou organizador para consultar os detalhes e confirmar sua inscrição.</p>
      <form className="event-lookup-form" onSubmit={buscarEvento}>
        <label>Código do evento<input value={codigoEvento} onChange={(event) => setCodigoEvento(event.target.value)} placeholder="Ex.: EVT-000001" required /></label>
        <button className="primary-button" type="submit" disabled={buscando || !codigoEvento.trim()}>{buscando ? 'Consultando...' : 'Buscar evento'}</button>
      </form>
      {erro && <div className="error" role="alert">{erro}</div>}
    </section>

    {evento && <section className="panel">
      <div className="event-title">
        <span className="eyebrow">{evento.codigo} · EVENTO</span>
        <h1>{evento.nome}</h1>
        <p className="event-date">{formatarData(evento.data)}</p>
        {evento.descricao && <p className="event-description">{evento.descricao}</p>}
      </div>
      <div className="event-details">
        <div><span>Horário</span><strong>{evento.horaInicio} – {evento.horaFim} · {evento.duracaoMinutos} min</strong></div>
        <div><span>Espaço</span><strong>{evento.sala}</strong></div>
        <div><span>Palestrante</span><strong>{evento.palestrante}</strong></div>
        <div><span>Vagas</span><strong>{evento.participantes} / {evento.capacidadeSala} inscritos</strong></div>
      </div>
      <h2>Inscrição</h2>
      {inscrito
        ? <p className="notice" role="status">Você já está inscrito neste evento.</p>
        : evento.status !== 'aprovada'
          ? <p className="notice">Este evento ainda não foi aprovado e não aceita inscrições.</p>
          : evento.data < dataAtualISO()
            ? <p className="notice">As inscrições para este evento foram encerradas.</p>
            : vagasRestantes === 0
              ? <p className="notice">As vagas deste evento foram preenchidas.</p>
              : <div className="registration-form">
                <p>Sua inscrição será vinculada à conta de {user.nome}.</p>
                <button className="primary-button" type="button" onClick={inscrever} disabled={enviando || !eventoDisponivel}>{enviando ? 'Inscrevendo...' : 'Confirmar inscrição'}</button>
              </div>}
    </section>}
  </main>;
}
