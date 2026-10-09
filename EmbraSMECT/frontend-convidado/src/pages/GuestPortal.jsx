import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const formatarData = (data) => new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function mesAtualISO() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const valores = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
  return `${valores.year}-${valores.month}`;
}

function deslocarMes(mes, deslocamento) {
  const [ano, numeroMes] = mes.split('-').map(Number);
  const data = new Date(Date.UTC(ano, numeroMes - 1 + deslocamento, 1));
  return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, '0')}`;
}

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
  const { user, loginGuest, logout, isLoading, authError, restoreSession } = useAuth();
  const eventoInicial = new URLSearchParams(location.search).get('evento')?.trim() || '';
  const [modo, setModo] = useState(location.pathname === '/cadastro' ? 'cadastro' : 'login');
  const [credenciais, setCredenciais] = useState({ nome: '', email: '', senha: '', confirmarSenha: '' });
  const [eventos, setEventos] = useState([]);
  const [eventoReservado, setEventoReservado] = useState(null);
  const [identificadorReservado, setIdentificadorReservado] = useState('');
  const [mes, setMes] = useState(mesAtualISO);
  const fallbackInicialAplicado = useRef(false);
  const buscaInicialAplicada = useRef('');
  const [carregandoEventos, setCarregandoEventos] = useState(false);
  const [enviandoLogin, setEnviandoLogin] = useState(false);
  const [buscandoReservado, setBuscandoReservado] = useState(false);
  const [erro, setErro] = useState('');
  const [inscrevendoId, setInscrevendoId] = useState(null);

  useEffect(() => {
    if (!user) {
      setEventos([]);
      setEventoReservado(null);
      setCarregandoEventos(false);
      fallbackInicialAplicado.current = false;
      return undefined;
    }

    let ativo = true;
    setCarregandoEventos(true);
    setErro('');
    api.get('/reservas/mes', { params: { mes } })
      .then(({ data }) => {
        if (!ativo) return;
        if (fallbackInicialAplicado.current || data.length > 0) {
          fallbackInicialAplicado.current = true;
          setEventos(data);
          return;
        }

        fallbackInicialAplicado.current = true;
        return api.get('/reservas/proximo-mes').then(({ data: proximoMes }) => {
          if (!ativo || !proximoMes) {
            setEventos([]);
            return;
          }
          setMes(proximoMes.mes);
          setEventos(proximoMes.eventos);
        });
      })
      .catch((requestError) => {
        if (ativo) setErro(requestError.response?.data?.erro || 'Não foi possível carregar os eventos deste mês.');
      })
      .finally(() => {
        if (ativo) setCarregandoEventos(false);
      });

    return () => {
      ativo = false;
    };
  }, [user, mes]);

  useEffect(() => {
    if (!user || !eventoInicial || buscaInicialAplicada.current === eventoInicial) return undefined;

    let ativo = true;
    buscaInicialAplicada.current = eventoInicial;
    setIdentificadorReservado(eventoInicial);
    setErro('');
    setBuscandoReservado(true);
    api.get(`/reservas/reservado/${encodeURIComponent(eventoInicial)}`)
      .then(({ data }) => {
        if (ativo) setEventoReservado(data);
      })
      .catch((requestError) => {
        if (ativo) setErro(requestError.response?.data?.erro || 'Não foi possível localizar o evento reservado.');
      })
      .finally(() => {
        if (ativo) setBuscandoReservado(false);
      });

    return () => {
      ativo = false;
    };
  }, [eventoInicial, user]);

  async function autenticar(event) {
    event.preventDefault();
    setErro('');
    setEnviandoLogin(true);
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
      setEnviandoLogin(false);
    }
  }

  async function inscrever(evento) {
    setErro('');
    setInscrevendoId(evento.id);
    try {
      const { data } = await api.post(`/reservas/${evento.id}/inscricoes`);
      const atualizarInscrito = (item) => item.id === evento.id
        ? { ...item, inscrito: true, participantes: data.participantes }
        : item;
      setEventos((lista) => lista.map(atualizarInscrito));
      setEventoReservado((atual) => (atual ? atualizarInscrito(atual) : atual));
    } catch (requestError) {
      setErro(requestError.response?.data?.erro || 'Não foi possível realizar a inscrição.');
    } finally {
      setInscrevendoId(null);
    }
  }

  async function buscarEventoReservado(event) {
    event.preventDefault();
    setErro('');
    setEventoReservado(null);
    setBuscandoReservado(true);
    try {
      const identificador = identificadorReservado.trim();
      const { data } = await api.get(`/reservas/reservado/${encodeURIComponent(identificador)}`);
      setEventoReservado(data);
    } catch (requestError) {
      setErro(requestError.response?.data?.erro || 'Não foi possível localizar o evento reservado.');
    } finally {
      setBuscandoReservado(false);
    }
  }

  function sair() {
    logout();
    setEventos([]);
    setEventoReservado(null);
    setErro('');
  }

  const hoje = dataAtualISO();
  const mesFormatado = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${mes}-01T12:00:00`));

  if (isLoading) {
    return <main className="auth-page"><p className="empty">Verificando acesso...</p></main>;
  }

  if (!user) {
    return <main className="auth-page">
      <form className="auth-card" onSubmit={autenticar}>
        <span className="eyebrow">ACESSO DO CONVIDADO</span>
        <h1>{modo === 'login' ? 'Entrar' : 'Criar acesso'}</h1>
        <p>{modo === 'login'
          ? 'Entre para ver os eventos disponíveis neste mês e confirmar sua inscrição.'
          : 'Crie sua conta de convidado para se inscrever em eventos.'}</p>
        {modo === 'cadastro' && <label>Nome<input autoComplete="name" maxLength="100" value={credenciais.nome} onChange={(event) => setCredenciais({ ...credenciais, nome: event.target.value })} minLength="2" required /></label>}
        <label>E-mail<input type="email" autoComplete="email" maxLength="100" value={credenciais.email} onChange={(event) => setCredenciais({ ...credenciais, email: event.target.value })} required /></label>
        <label>Senha<input type="password" autoComplete={modo === 'login' ? 'current-password' : 'new-password'} minLength={modo === 'cadastro' ? 12 : undefined} maxLength="72" value={credenciais.senha} onChange={(event) => setCredenciais({ ...credenciais, senha: event.target.value })} required /></label>
        {modo === 'cadastro' && <label>Confirmar senha<input type="password" autoComplete="new-password" minLength="12" maxLength="72" value={credenciais.confirmarSenha} onChange={(event) => setCredenciais({ ...credenciais, confirmarSenha: event.target.value })} required /></label>}
        {authError && <div className="error" role="alert">{authError}<button type="button" className="text-button" onClick={restoreSession}>Tentar novamente</button></div>}
        {erro && <div className="error" role="alert">{erro}</div>}
        <button className="primary-button" type="submit" disabled={enviandoLogin}>{enviandoLogin ? 'Aguarde...' : modo === 'login' ? 'Entrar' : 'Criar conta e entrar'}</button>
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
      <h1>Eventos de {mesFormatado}</h1>
      <p>Veja os eventos públicos aprovados do mês selecionado. Cada evento tem um código de identificação; escolha um e inscreva-se diretamente.</p>
      <div className="month-navigation" aria-label="Navegar pelos meses de eventos">
        <button className="text-button" type="button" aria-label="Mês anterior" onClick={() => setMes((atual) => deslocarMes(atual, -1))}>‹ Anterior</button>
        <label>Mês<input type="month" value={mes} onChange={(event) => {
          if (/^\d{4}-(0[1-9]|1[0-2])$/.test(event.target.value)) setMes(event.target.value);
        }} /></label>
        <button className="text-button" type="button" aria-label="Próximo mês" onClick={() => setMes((atual) => deslocarMes(atual, 1))}>Próximo ›</button>
      </div>
      {erro && <div className="error" role="alert">{erro}</div>}
    </section>

    <section className="panel">
      {carregandoEventos && <p className="empty">Carregando eventos de {mesFormatado}...</p>}
      {!carregandoEventos && eventos.length === 0 && <p className="empty">Não há eventos públicos aprovados em {mesFormatado}. Para localizar um evento reservado, informe o ID ou código abaixo.</p>}
      <form className="event-lookup-form" onSubmit={buscarEventoReservado}>
        <label>ID ou código de evento reservado<input value={identificadorReservado} onChange={(event) => setIdentificadorReservado(event.target.value)} maxLength="40" placeholder="Ex.: EVT-000001" required /></label>
        <button className="primary-button" type="submit" disabled={buscandoReservado || !identificadorReservado.trim()}>{buscandoReservado ? 'Buscando...' : 'Buscar evento reservado'}</button>
      </form>
      <div className="guest-event-list">
        {[...eventos, ...(eventoReservado && !eventos.some((evento) => evento.id === eventoReservado.id) ? [eventoReservado] : [])].map((evento) => {
          const vagasRestantes = Math.max(0, evento.capacidadeSala - evento.participantes);
          const encerrado = evento.data < hoje;
          const lotado = vagasRestantes === 0;
          return <article className="available-event" key={evento.id}>
            <div>
              <span className="eyebrow">{evento.codigo} · ID DO EVENTO</span>
              <h2>{evento.nome}</h2>
              <p className="event-date">{formatarData(evento.data)}</p>
              <p>{evento.horaInicio} – {evento.horaFim} · {evento.sala} · {evento.palestrante}</p>
              {evento.descricao && <p className="event-description">{evento.descricao}</p>}
              <p>{evento.participantes} / {evento.capacidadeSala} inscritos</p>
            </div>
            {evento.inscrito
              ? <span className="notice" role="status">Inscrição confirmada</span>
              : encerrado
                ? <span className="event-registration-status">Inscrições encerradas</span>
                : lotado
                  ? <span className="event-registration-status">Evento lotado</span>
                  : <button className="primary-button" type="button" disabled={inscrevendoId === evento.id} onClick={() => inscrever(evento)}>{inscrevendoId === evento.id ? 'Inscrevendo...' : `Inscrever-se · ${evento.codigo}`}</button>}
          </article>;
        })}
      </div>
    </section>
  </main>;
}
