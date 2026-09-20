import React, { useEffect, useState } from 'react';
import api from '../services/api';

// Lista reservas e envia novas solicitações para a API.
export default function Reservas() {
  const [reservas, setReservas] = useState([]);
  const [form, setForm] = useState({ data: '', sala: 'Sala 101', recurso: '' });
  const [mensagem, setMensagem] = useState('');

  // Busca as reservas já cadastradas no backend.
  async function carregar() {
    const { data } = await api.get('/reservas');
    setReservas(data);
  }

  useEffect(() => { carregar().catch(() => setMensagem('Não foi possível carregar as reservas.')); }, []);

  // Envia o formulário, limpa os campos e atualiza a lista.
  async function handleSubmit(event) {
    event.preventDefault();
    await api.post('/reservas', form);
    setForm({ data: '', sala: 'Sala 101', recurso: '' });
    setMensagem('Reserva enviada para aprovação.');
    carregar();
  }
  return <section><div className="page-heading"><span className="eyebrow">ESPAÇOS</span><h1>Reservas</h1><p>Preencha os dados para solicitar uma nova reserva.</p></div>
    <form className="form-panel" onSubmit={handleSubmit}><label>Data<input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} required /></label><label>Sala<select value={form.sala} onChange={(e) => setForm({ ...form, sala: e.target.value })}><option>Sala 101</option><option>Sala 202</option></select></label><label>Recurso<input value={form.recurso} onChange={(e) => setForm({ ...form, recurso: e.target.value })} placeholder="Ex.: projetor" required /></label><button className="primary-button" type="submit">Solicitar reserva</button></form>
    {mensagem && <p className="notice">{mensagem}</p>}<h2>Reservas cadastradas</h2><div className="list">{reservas.map((reserva) => <div className="list-row" key={reserva.id}><span><strong>{reserva.sala}</strong><small>{reserva.recurso || 'Sem recurso informado'}</small></span><span>{reserva.data}</span><span className={`status ${reserva.status}`}>{reserva.status}</span></div>)}</div>
  </section>;
}
