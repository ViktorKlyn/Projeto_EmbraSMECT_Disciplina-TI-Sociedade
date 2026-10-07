import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import EventShare from '../components/EventShare';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { guestEventUrl } from '../services/guestApp';

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

export default function PublicEvent() {
  const { codigo } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoading: authLoading, authError } = useAuth();
  const isManager = user?.role === 'admin' || user?.role === 'organizer';
  const [evento, setEvento] = useState(null);
  const [formulario, setFormulario] = useState({ nome: '', email: '' });
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [verificandoInscricao, setVerificandoInscricao] = useState(false);
  const [enviandoGestor, setEnviandoGestor] = useState(false);
  const [inscrito, setInscrito] = useState(false);
  const [erro, setErro] = useState('');
  const [erroGestor, setErroGestor] = useState('');

  useEffect(() => {
    let ativo = true;
    api.get(`/eventos/${encodeURIComponent(codigo)}`)
      .then(({ data }) => {
        if (ativo) setEvento(data);
      })
      .catch((requestError) => {
        if (ativo) setErro(requestError.response?.data?.erro || 'Não foi possível carregar os detalhes do evento.');
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [codigo]);

  useEffect(() => {
    if (authLoading || !isManager || !evento) return undefined;
    let ativo = true;
    setInscrito(false);
    setErroGestor('');
    setVerificandoInscricao(true);
    api.get('/reservas/inscricoes')
      .then(({ data }) => {
        if (ativo) setInscrito(data.some((inscricao) => inscricao.id === evento.id));
      })
      .catch((requestError) => {
        if (ativo) setErroGestor(requestError.response?.data?.erro || 'Não foi possível verificar sua inscrição neste evento.');
      })
      .finally(() => {
        if (ativo) setVerificandoInscricao(false);
      });
    return () => {
      ativo = false;
    };
  }, [authLoading, evento?.id, isManager]);

  async function inscrever(event) {
    event.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const { data } = await api.post(`/eventos/${encodeURIComponent(codigo)}/inscricoes`, formulario);
      setEvento((atual) => ({ ...atual, participantes: data.evento.participantes }));
      setInscrito(true);
    } catch (requestError) {
      setErro(requestError.response?.data?.erro || 'Não foi possível realizar a inscrição.');
    } finally {
      setEnviando(false);
    }
  }

  async function inscreverGestor() {
    setErroGestor('');
    setEnviandoGestor(true);
    try {
      const { data } = await api.post(`/reservas/${evento.id}/inscricoes`);
      setEvento((atual) => ({ ...atual, participantes: data.participantes }));
      setInscrito(true);
    } catch (requestError) {
      setErroGestor(requestError.response?.data?.erro || 'Não foi possível realizar a inscrição.');
    } finally {
      setEnviandoGestor(false);
    }
  }

  const vagasRestantes = evento ? Math.max(0, evento.capacidadeSala - evento.participantes) : 0;
  const podeInscrever = evento?.status === 'aprovada'
    && vagasRestantes > 0
    && evento.data >= dataAtualISO();

  function voltar() {
    if (isManager) {
      navigate('/relatorios');
      return;
    }
    if (location.key !== 'default') {
      navigate(-1);
      return;
    }
    navigate('/login');
  }

  return <main className="public-event-page">
    <header className="public-event-header">
      <button className="link-button" type="button" onClick={voltar}>{isManager ? 'Voltar aos relatórios' : 'Voltar'}</button>
      <a href={isManager ? '/relatorios' : guestEventUrl(codigo, 'acesso')} className="public-event-brand">EmbraSMECT</a>
      <span>{isManager ? 'Inscrição de gestores' : 'Inscrição em eventos'}</span>
    </header>
    {carregando && <p className="empty">Carregando detalhes do evento...</p>}
    {!carregando && erro && !evento && <div className="error" role="alert">{erro}</div>}
    {!carregando && evento && <>
      <section className="public-event-card">
        <div className="public-event-title">
          <span className="eyebrow">{evento.codigo} · DETALHES DO EVENTO</span>
          <h1>{evento.nome}</h1>
          <p className="public-event-date">{formatarData(evento.data)}</p>
          {evento.descricao && <p className="public-event-description">{evento.descricao}</p>}
        </div>
        <div className="public-event-details">
          <div><span>Horário</span><strong>{evento.horaInicio} – {evento.horaFim} · {evento.duracaoMinutos} min</strong></div>
          <div><span>Espaço</span><strong>{evento.sala}</strong></div>
          <div><span>Palestrante</span><strong>{evento.palestrante}</strong></div>
          <div><span>Vagas</span><strong>{evento.participantes} / {evento.capacidadeSala} inscritos</strong></div>
        </div>
        <EventShare codigo={evento.codigo} mostrarLinkInscricao={false} />
      </section>

      <section className="public-registration-card">
        <span className="eyebrow">{isManager ? 'INSCRIÇÃO COM SUA CONTA' : 'CONFIRME SUA PARTICIPAÇÃO'}</span>
        <h2>Inscrição</h2>
        {authError ? <p className="error" role="alert">{authError}</p> : authLoading ? <p className="empty">Verificando sessão...</p> : isManager ? <>
          {verificandoInscricao && <p className="empty">Verificando sua inscrição...</p>}
          {erroGestor && <p className="error" role="alert">{erroGestor}</p>}
          {!verificandoInscricao && inscrito && <p className="notice" role="status">Inscrição confirmada. Este evento está nas suas inscrições.</p>}
          {!verificandoInscricao && !inscrito && evento.status !== 'aprovada' && <p className="notice">As inscrições serão liberadas quando o evento for aprovado.</p>}
          {!verificandoInscricao && !inscrito && evento.status === 'aprovada' && vagasRestantes === 0 && <p className="notice">As vagas deste evento foram preenchidas.</p>}
          {!verificandoInscricao && !inscrito && evento.status === 'aprovada' && vagasRestantes > 0 && evento.data < dataAtualISO() && <p className="notice">As inscrições para este evento foram encerradas.</p>}
          {!verificandoInscricao && !inscrito && podeInscrever && <div className="public-registration-form">
            <p>Sua inscrição será vinculada à conta de {user.nome}.</p>
            <button className="primary-button" type="button" onClick={inscreverGestor} disabled={enviandoGestor}>{enviandoGestor ? 'Inscrevendo...' : 'Inscrever-se'}</button>
          </div>}
        </> : <>
          {inscrito ? <p className="notice" role="status">Inscrição confirmada. Você está na lista de participantes.</p> : <>
            {evento.status !== 'aprovada' && <p className="notice">As inscrições serão liberadas quando o evento for aprovado.</p>}
            {evento.status === 'aprovada' && vagasRestantes === 0 && <p className="notice">As vagas deste evento foram preenchidas.</p>}
            {evento.status === 'aprovada' && vagasRestantes > 0 && evento.data < dataAtualISO() && <p className="notice">As inscrições para este evento foram encerradas.</p>}
            {podeInscrever && <form className="public-registration-form" onSubmit={inscrever}>
              <p>Não é necessário entrar ou criar uma senha. Se você já possui cadastro, basta informar seu e-mail; novos convidados devem informar também o nome.</p>
              <label>Nome completo <span>(para novos convidados)</span><input autoComplete="name" maxLength="100" value={formulario.nome} onChange={(event) => setFormulario({ ...formulario, nome: event.target.value })} /></label>
              <label>E-mail<input type="email" autoComplete="email" maxLength="254" value={formulario.email} onChange={(event) => setFormulario({ ...formulario, email: event.target.value })} required /></label>
              {erro && <p className="error" role="alert">{erro}</p>}
              <button className="primary-button" type="submit" disabled={enviando}>{enviando ? 'Inscrevendo...' : 'Confirmar inscrição'}</button>
            </form>}
          </>}
          <p className="public-event-footer">Já está inscrito? <a href={guestEventUrl(codigo, 'acesso')}>Acessar página do convidado</a></p>
        </>}
      </section>
    </>}
  </main>;
}
