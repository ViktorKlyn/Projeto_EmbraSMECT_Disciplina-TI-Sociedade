import React, { useEffect, useState } from 'react';
import api from '../services/api';

export default function Relatorios() {
  const [reservas, setReservas] = useState([]);
  useEffect(() => { api.get('/reservas').then(({ data }) => setReservas(data)); }, []);
  return <section><div className="page-heading"><span className="eyebrow">ACOMPANHAMENTO</span><h1>Relatórios</h1><p>Visão geral das reservas registradas.</p></div><div className="table-wrap"><table><thead><tr><th>Sala</th><th>Data</th><th>Status</th></tr></thead><tbody>{reservas.map((reserva) => <tr key={reserva.id}><td>{reserva.sala}</td><td>{reserva.data}</td><td><span className={`status ${reserva.status}`}>{reserva.status}</span></td></tr>)}</tbody></table></div></section>;
}
