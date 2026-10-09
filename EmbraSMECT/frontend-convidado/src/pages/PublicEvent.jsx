import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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

export default function PublicEvent() {
  const { codigo } = useParams();
  const navigate = useNavigate();
  const [evento, setEvento] = useState(null);
  const [formulario, setFormulario] = useState({ nome: '', email: '' });
  const [identificadorReservado, setIdentificadorReservado] = useState(codigo);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [inscrito, setInscrito] = useState(false);
  const [erro, setErro] = useState('');
  const [eventoNaoPublico, setEventoNaoPublico] = useState(false);

  useEffect(() => {
    let ativo = true;
    api.get(`/eventos/${encodeURIComponent(codigo)}`)
      .then(({ data }) => {
        if (ativo) setEvento(data);
      })
      .catch((requestError) => {
        if (ativo && requestError.response?.status === 404) {
          setEventoNaoPublico(true);
          setIdentificadorReservado(codigo);
          return;
        }
        if (ativo) setErro(requestError.response?.data?.erro || 'Não foi possível carregar os detalhes do evento.');
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [codigo]);

  function buscarEventoReservado(event) {
    event.preventDefault();
    const identificador = identificadorReservado.trim();
    if (!identificador) return;
    navigate(`/login?evento=${encodeURIComponent(identificador)}`);
  }

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

  const vagasRestantes = evento ? Math.max(0, evento.capacidadeSala - evento.participantes) : 0;
  const podeInscrever = evento?.status === 'aprovada'
    && vagasRestantes > 0
    && evento.data >= dataAtualISO();

  return <main className="page">
    <header className="page-header">
      <Link to={`/evento/${encodeURIComponent(codigo)}/acesso`} className="brand">EmbraSMECT</Link>
      <span>Inscrição em eventos</span>
    </header>
    {carregando && <p className="empty">Carregando detalhes do evento...</p>}
    {!carregando && erro && !evento && <div className="error" role="alert">{erro}</div>}
    {!carregando && eventoNaoPublico && !evento && <section className="panel">
      <span className="eyebrow">EVENTO RESERVADO</span>
      <h1>Localizar evento reservado</h1>
      <p>Este evento não está disponível publicamente. Se você recebeu o ID ou código de um evento reservado, informe abaixo para entrar e localizá-lo.</p>
      <form className="event-lookup-form" onSubmit={buscarEventoReservado}>
        <label>ID ou código do evento<input value={identificadorReservado} onChange={(event) => setIdentificadorReservado(event.target.value)} maxLength="40" placeholder="Ex.: EVT-000001" required /></label>
        <button className="primary-button" type="submit" disabled={!identificadorReservado.trim()}>Entrar e buscar</button>
      </form>
    </section>}
    {!carregando && evento && <>
      <section className="panel">
        <div className="event-title">
          <span className="eyebrow">{evento.codigo} · DETALHES DO EVENTO</span>
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
      </section>

      <section className="panel">
        <span className="eyebrow">CONFIRME SUA PARTICIPAÇÃO</span>
        <h2>Inscrição</h2>
        {inscrito ? <p className="notice" role="status">Inscrição confirmada. Você está na lista de participantes.</p> : <>
          {evento.status !== 'aprovada' && <p className="notice">As inscrições serão liberadas quando o evento for aprovado.</p>}
          {evento.status === 'aprovada' && vagasRestantes === 0 && <p className="notice">As vagas deste evento foram preenchidas.</p>}
          {evento.status === 'aprovada' && vagasRestantes > 0 && evento.data < dataAtualISO() && <p className="notice">As inscrições para este evento foram encerradas.</p>}
          {podeInscrever && <form className="registration-form" onSubmit={inscrever}>
            <p>Se você já possui cadastro, informe o e-mail da conta. Novos convidados também devem informar o nome e depois criar acesso.</p>
            <label>Nome completo <span>(para novos convidados)</span><input autoComplete="name" maxLength="100" value={formulario.nome} onChange={(event) => setFormulario({ ...formulario, nome: event.target.value })} /></label>
            <label>E-mail<input type="email" autoComplete="email" maxLength="254" value={formulario.email} onChange={(event) => setFormulario({ ...formulario, email: event.target.value })} required /></label>
            {erro && <p className="error" role="alert">{erro}</p>}
            <button className="primary-button" type="submit" disabled={enviando}>{enviando ? 'Inscrevendo...' : 'Confirmar inscrição'}</button>
          </form>}
        </>}
        <p className="form-footer">Já está inscrito? <Link to={`/evento/${encodeURIComponent(codigo)}/acesso`}>Acessar página do convidado</Link></p>
        {!inscrito && podeInscrever && <p className="form-footer">Ainda não tem conta? <Link to={`/cadastro?evento=${encodeURIComponent(codigo)}`}>Criar acesso de convidado</Link></p>}
      </section>
    </>}
  </main>;
}
