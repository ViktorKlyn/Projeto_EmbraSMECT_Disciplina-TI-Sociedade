import React, { useEffect, useState } from 'react';
import api from '../services/api';

const formatarData = (data) => new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export default function GuestEvent() {
  const [eventos, setEventos] = useState([]);
  const [disponiveis, setDisponiveis] = useState([]);
  const [identificador, setIdentificador] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [buscando, setBuscando] = useState(false);
  const [buscaRealizada, setBuscaRealizada] = useState(false);
  const [erro, setErro] = useState('');
  const [inscrevendoId, setInscrevendoId] = useState(null);

  async function carregar() {
    const { data: inscricoes } = await api.get('/reservas');
    setEventos(inscricoes);
  }

  useEffect(() => {
    carregar()
      .catch(() => setErro('Não foi possível carregar os eventos.'))
      .finally(() => setCarregando(false));
  }, []);

  async function inscrever(evento) {
    setErro('');
    setInscrevendoId(evento.id);
    try {
      await api.post(`/reservas/${evento.id}/inscricoes`);
      setDisponiveis((atuais) => atuais.filter((item) => item.id !== evento.id));
      await carregar();
    } catch (requestError) {
      setErro(requestError.response?.data?.erro || 'Não foi possível realizar a inscrição.');
    } finally {
      setInscrevendoId(null);
    }
  }

  async function buscarFicha(event) {
    event.preventDefault();
    setErro('');
    setBuscaRealizada(true);
    setBuscando(true);
    try {
      const { data } = await api.get('/reservas/ficha', { params: { identificador } });
      setDisponiveis(data);
    } catch (requestError) {
      setDisponiveis([]);
      setErro(requestError.response?.data?.erro || 'Não foi possível buscar a ficha do evento.');
    } finally {
      setBuscando(false);
    }
  }

  return <section>
    <div className="page-heading">
      <span className="eyebrow">INFORMAÇÕES DO CONVIDADO</span>
      <h1>Seu evento</h1>
      <p>Use o código ou o nome informado pelo organizador para localizar a ficha e se inscrever.</p>
    </div>
    {carregando && <p className="empty">Carregando eventos...</p>}
    {erro && <p className="error" role="alert">{erro}</p>}
    {!carregando && eventos.length === 0 && <p className="empty">Você ainda não está inscrito em nenhum evento.</p>}
    <div className="guest-event-list">
      {eventos.map((evento) => <article className="guest-event" key={evento.id}>
        <div className="guest-event-date">{formatarData(evento.data)}</div>
        <div className="guest-event-heading"><span className="eyebrow">{evento.codigo} · PROGRAMAÇÃO CONFIRMADA</span><h2>{evento.nome}</h2><p>{evento.sala} · {evento.horaInicio}–{evento.horaFim} · {evento.recurso}</p></div>
        <div className="guest-details">
          <div><span>Seu lugar</span><strong>{evento.assento}</strong></div>
          <div><span>Palestrante</span><strong>{evento.palestrante}</strong></div>
          <div><span>Horário</span><strong>{evento.horaInicio}–{evento.horaFim} ({evento.duracaoMinutos} min)</strong></div>
          <div><span>Brinde ao final</span><strong>{evento.brinde}</strong></div>
        </div>
      </article>)}
    </div>
    {!carregando && <>
      <h2 className="guest-available-heading">Acessar ficha do evento</h2>
      <form className="event-lookup-form" onSubmit={buscarFicha}>
        <label>Código ou nome do evento<input value={identificador} onChange={(event) => setIdentificador(event.target.value)} minLength="2" placeholder="Ex.: EVT-000001 ou Encontro de inovação" required /></label>
        <button className="primary-button" type="submit" disabled={buscando}>{buscando ? 'Buscando...' : 'Buscar ficha'}</button>
      </form>
      {buscaRealizada && disponiveis.length === 0 && !buscando && !erro && <p className="empty">Nenhum evento aprovado encontrado para esse código ou nome.</p>}
      <div className="guest-event-list">
        {disponiveis.map((evento) => <article className="available-event" key={evento.id}>
          <div><span className="eyebrow">{evento.codigo} · {formatarData(evento.data)}</span><h3>{evento.nome}</h3><p>{evento.sala} · {evento.horaInicio}–{evento.horaFim} · {evento.recurso} · {evento.palestrante}</p></div>
          <button className="primary-button" type="button" disabled={inscrevendoId === evento.id || evento.participantes >= evento.capacidadeSala} onClick={() => inscrever(evento)}>{inscrevendoId === evento.id ? 'Inscrevendo...' : 'Inscrever-se'}</button>
        </article>)}
      </div>
    </>}
  </section>;
}