import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const formatarData = (data) => new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
});

export default function TVDisplay() {
  const displayRef = useRef(null);
  const navigate = useNavigate();
  const [eventos, setEventos] = useState([]);
  const [erro, setErro] = useState('');
  const [modoTelaCheia, setModoTelaCheia] = useState(Boolean(document.fullscreenElement));

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      try {
        const { data } = await api.get('/reservas/tv');
        if (!cancelado) setEventos(data.filter((evento) => evento.status === 'aprovada').sort((a, b) => a.data.localeCompare(b.data) || a.horaInicio.localeCompare(b.horaInicio)));
      } catch {
        if (!cancelado) setErro('Não foi possível atualizar a programação.');
      }
    }

    carregar();
    const intervalo = window.setInterval(carregar, 30000);
    return () => {
      cancelado = true;
      window.clearInterval(intervalo);
    };
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => setModoTelaCheia(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  async function alternarTelaCheia() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setModoTelaCheia(false);
        return;
      }

      await displayRef.current?.requestFullscreen();
      setModoTelaCheia(true);
    } catch {
      setErro('O navegador não permitiu ativar a tela cheia.');
    }
  }

  async function voltarAoPainel() {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        setErro('Não foi possível sair da tela cheia.');
        return;
      }
    }
    navigate('/');
  }

  return <section className="tv-display" ref={displayRef}>
    <div className="tv-toolbar">
      <div><span className="eyebrow">EMBRASMECT · PROGRAMAÇÃO</span><h1>Eventos confirmados</h1></div>
      <div className="tv-toolbar-actions">
        {modoTelaCheia && <button className="tv-back-button" type="button" onClick={voltarAoPainel}>Voltar</button>}
        {!modoTelaCheia && <button className="primary-button" type="button" onClick={alternarTelaCheia}>Alternar tela cheia</button>}
      </div>
    </div>
    {erro && <p className="error" role="alert">{erro}</p>}
    {eventos.length === 0 && <p className="tv-empty">Nenhum evento aprovado.</p>}
    <div className="tv-event-list">
      {eventos.map((evento) => <article className="tv-event" key={evento.id}>
        <p className="tv-date">{formatarData(evento.data)}</p>
        <div><h2>{evento.nome}</h2><p>{evento.codigo} · {evento.sala} · {evento.horaInicio}–{evento.horaFim} · {evento.palestrante}</p></div>
        <div className="tv-event-meta"><span>{evento.duracaoMinutos} min</span><span>{evento.participantes} participantes</span></div>
      </article>)}
    </div>
    <p className="tv-refresh">Programação atualizada automaticamente a cada 30 segundos.</p>
  </section>;
}