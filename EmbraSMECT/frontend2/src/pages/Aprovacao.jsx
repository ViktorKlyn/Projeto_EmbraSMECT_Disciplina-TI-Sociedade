import React, { useEffect, useState } from 'react';
import api from '../services/api';

// Mostra somente solicitações pendentes para análise do usuário.
export default function Aprovacao() {
  const [reservas, setReservas] = useState([]);
  const [motivos, setMotivos] = useState({});
  const [erro, setErro] = useState('');

  async function carregar() {
    const { data } = await api.get('/reservas');
    setReservas(data.filter((item) => item.status === 'pendente'));
  }

  useEffect(() => { carregar().catch(() => setErro('Não foi possível carregar os pedidos.')); }, []);

  async function decidir(reserva, status) {
    setErro('');
    try {
      await api.patch(`/reservas/${reserva.id}/decisao`, { status, motivoRejeicao: motivos[reserva.id] || '' });
      setReservas((itens) => itens.filter((item) => item.id !== reserva.id));
    } catch (requestError) {
      setErro(requestError.response?.data?.erro || 'Não foi possível registrar a decisão.');
    }
  }

  return <section>
    <div className="page-heading"><span className="eyebrow">DECISÃO ADMINISTRATIVA</span><h1>Aprovação</h1><p>Revise os pedidos e registre a decisão do ADM.</p></div>
    {erro && <p className="error" role="alert">{erro}</p>}
    <div className="approval-list">
      {reservas.length === 0 && <p className="empty">Nenhum pedido aguardando aprovação.</p>}
      {reservas.map((reserva) => <article className="approval-card" key={reserva.id}>
        <div className="reservation-top">
          <div><strong>{reserva.nome}</strong><small>{reserva.codigo} · {reserva.sala} · {reserva.data} · {reserva.horaInicio}–{reserva.horaFim} · {reserva.recurso}</small></div>
          <span className="status pendente">Pendente</span>
        </div>
        <div className="reservation-details">
          <span><small>Organizador</small>{reserva.usuarioNome || `Conta ${reserva.usuarioId}`}</span>
          <span><small>Palestrante</small>{reserva.palestrante}</span>
          <span><small>Participantes</small>{reserva.participantes} / {reserva.capacidadeSala}</span>
        </div>
        <label>Motivo, se rejeitar<textarea value={motivos[reserva.id] || ''} onChange={(event) => setMotivos({ ...motivos, [reserva.id]: event.target.value })} rows="2" placeholder="Explique a decisão ao organizador" /></label>
        <div className="approval-actions">
          <button className="success-button" onClick={() => decidir(reserva, 'aprovada')}>Aprovar reserva</button>
          <button className="danger-button" disabled={!motivos[reserva.id]?.trim()} onClick={() => decidir(reserva, 'rejeitada')}>Rejeitar com motivo</button>
        </div>
      </article>)}
    </div>
  </section>;
}
