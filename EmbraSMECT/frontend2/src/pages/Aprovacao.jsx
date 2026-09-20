import React, { useEffect, useState } from 'react';
import api from '../services/api';

// Mostra somente solicitações pendentes para análise do usuário.
export default function Aprovacao() {
  const [reservas, setReservas] = useState([]);
  useEffect(() => { api.get('/reservas').then(({ data }) => setReservas(data.filter((item) => item.status === 'pendente'))); }, []);

  // Remove o item da lista após a ação de aprovação ou rejeição.
  function atualizar(id, status) { setReservas((itens) => itens.filter((item) => item.id !== id)); }
  return <section><div className="page-heading"><span className="eyebrow">ANÁLISE</span><h1>Aprovação</h1><p>Pedidos aguardando avaliação.</p></div><div className="list">{reservas.length === 0 && <p className="empty">Nenhuma reserva pendente.</p>}{reservas.map((reserva) => <div className="approval-row" key={reserva.id}><div><strong>{reserva.sala}</strong><small>{reserva.data} · {reserva.recurso || 'Sem recurso informado'}</small></div><div><button className="success-button" onClick={() => atualizar(reserva.id, 'aprovada')}>Aprovar</button><button className="danger-button" onClick={() => atualizar(reserva.id, 'rejeitada')}>Rejeitar</button></div></div>)}</div></section>;
}
