import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

// Consulta a API e apresenta as reservas em formato de relatório.
export default function Relatorios() {
  const [reservas, setReservas] = useState([]);
  useEffect(() => { api.get('/reservas/relatorios').then(({ data }) => setReservas(data)); }, []);
  return <section>
    <div className="page-heading"><span className="eyebrow">ACOMPANHAMENTO</span><h1>Relatórios</h1><p>Consulte eventos, participantes e ocupação. Em <strong>Abrir evento</strong>, ADM e organizadores podem se inscrever nos eventos disponíveis.</p></div>
    <div className="table-wrap"><table><thead><tr><th>Evento</th><th>Organizador</th><th>Espaço</th><th>Data</th><th>Horário</th><th>Participantes</th><th>Ocupação</th><th>Status</th><th>Página</th></tr></thead><tbody>
      {reservas.map((reserva) => <tr key={reserva.id}>
        <td>{reserva.nome}</td>
        <td>{reserva.usuarioNome || `Conta ${reserva.usuarioId}`}</td>
        <td>{reserva.sala}</td>
        <td>{new Date(`${reserva.data}T12:00:00`).toLocaleDateString('pt-BR')}</td>
        <td>{reserva.horaInicio} – {reserva.horaFim}</td>
        <td>{reserva.participantes} / {reserva.capacidadeSala}</td>
        <td>{reserva.ocupacaoPercentual}%</td>
        <td><span className={`status ${reserva.status}`}>{reserva.status}</span></td>
        <td><Link to={`/evento/${encodeURIComponent(reserva.codigo)}`}>Abrir evento</Link></td>
      </tr>)}
    </tbody></table></div>
  </section>;
}
