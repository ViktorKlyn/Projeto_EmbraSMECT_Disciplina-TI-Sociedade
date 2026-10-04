import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import EventShare from '../components/EventShare';

const initialForm = {
  nome: '',
  data: '',
  horaInicio: '',
  horaFim: '',
  sala: '',
  unirSalas: false,
  recurso: [],
  gerenciarAssentos: false,
  palestrante: '',
  duracaoMinutos: 60,
  brinde: '',
};

const formatarData = (data) => new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR');

function mascararData(valor) {
  const digitos = valor.replace(/\D/g, '').slice(0, 8);
  if (digitos.length > 4) return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
  if (digitos.length > 2) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  return digitos;
}

function converterDataParaISO(valor) {
  const partes = valor.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!partes) return null;
  const [, dia, mes, ano] = partes;
  const data = new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia)));
  if (data.getUTCFullYear() !== Number(ano) || data.getUTCMonth() !== Number(mes) - 1 || data.getUTCDate() !== Number(dia)) return null;
  return `${ano}-${mes}-${dia}`;
}

function dataAtualISO() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export default function Reservas() {
  const { user } = useAuth();
  const [reservas, setReservas] = useState([]);
  const [salas, setSalas] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [recursoAtual, setRecursoAtual] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [assentos, setAssentos] = useState({});
  const [assentoSalvando, setAssentoSalvando] = useState('');
  const [edicao, setEdicao] = useState(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [excluindoReservaId, setExcluindoReservaId] = useState(null);

  async function carregar() {
    const { data } = await api.get('/reservas');
    setReservas(data);
  }

  useEffect(() => {
    Promise.all([carregar(), api.get('/reservas/salas')])
      .then(([, { data }]) => {
        setSalas(data);
        setForm((atual) => ({ ...atual, sala: atual.sala || data[0]?.nome || '' }));
      })
      .catch(() => setErro('Não foi possível carregar as reservas e salas.'));
  }, []);

  const salaSelecionada = salas.find((sala) => sala.nome === form.sala);
  const salaConjugada = salaSelecionada?.conjugadaId
    ? salas.find((sala) => sala.id === salaSelecionada.conjugadaId)
    : null;

  function nomesSalasSelecionadas(salaBase, incluirConjugada) {
    const sala = salas.find((item) => item.nome === salaBase);
    if (!sala) return [];
    if (!incluirConjugada || !sala.conjugadaId) return [sala.nome];
    const conjugada = salas.find((item) => item.id === sala.conjugadaId);
    return conjugada ? [sala.nome, conjugada.nome] : [sala.nome];
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErro('');
    setMensagem('');
    if (form.recurso.length === 0) {
      setErro('Adicione pelo menos um recurso técnico.');
      return;
    }
    const dataISO = converterDataParaISO(form.data);
    if (!dataISO) {
      setErro('Digite uma data válida no formato DD/MM/AAAA.');
      return;
    }
    if (dataISO < dataAtualISO()) {
      setErro('Não é possível criar eventos em datas passadas.');
      return;
    }

    try {
      const { data: eventoCriado } = await api.post('/reservas', {
        ...form,
        salas: nomesSalasSelecionadas(form.sala, form.unirSalas),
        nome: form.nome.trim(),
        data: dataISO,
      });
      setForm(initialForm);
      setRecursoAtual('');
      setMensagem(user?.role === 'admin'
        ? `Evento aprovado. Código para a ficha: ${eventoCriado.codigo}.`
        : `Solicitação enviada para aprovação do ADM. Código da ficha: ${eventoCriado.codigo}.`);
      await carregar();
    } catch (requestError) {
      setErro(requestError.response?.data?.erro || 'Não foi possível enviar a solicitação.');
    }
  }

  function adicionarRecurso(event) {
    event.preventDefault();
    const recurso = recursoAtual.trim();
    if (!recurso) return;
    if (form.recurso.some((item) => item.toLocaleLowerCase('pt-BR') === recurso.toLocaleLowerCase('pt-BR'))) {
      setErro('Esse recurso técnico já foi adicionado.');
      return;
    }
    setErro('');
    setForm((atual) => ({ ...atual, recurso: [...atual.recurso, recurso] }));
    setRecursoAtual('');
  }

  function iniciarEdicao(reserva) {
    setErro('');
    setMensagem('');
    setEdicao({
      id: reserva.id,
      nome: reserva.nome,
      data: reserva.data,
      horaInicio: reserva.horaInicio,
      horaFim: reserva.horaFim,
      sala: (reserva.salas ?? [reserva.sala])[0],
      unirSalas: (reserva.salas ?? [reserva.sala]).length > 1,
      recurso: reserva.recurso.split(',').map((item) => item.trim()).filter(Boolean),
      recursoAtual: '',
      palestrante: reserva.palestrante,
      brinde: reserva.brinde === 'Não haverá brinde' ? '' : reserva.brinde,
      gerenciarAssentos: reserva.gerenciarAssentos,
    });
  }

  function adicionarRecursoEdicao(event) {
    event.preventDefault();
    const recurso = edicao.recursoAtual.trim();
    if (!recurso) return;
    if (edicao.recurso.some((item) => item.toLocaleLowerCase('pt-BR') === recurso.toLocaleLowerCase('pt-BR'))) {
      setErro('Esse recurso técnico já foi adicionado.');
      return;
    }
    setErro('');
    setEdicao((atual) => ({ ...atual, recurso: [...atual.recurso, recurso], recursoAtual: '' }));
  }

  async function salvarEdicao(event) {
    event.preventDefault();
    setErro('');
    setMensagem('');
    if (!edicao.recurso.length) {
      setErro('Adicione pelo menos um recurso técnico.');
      return;
    }
    if (edicao.data < dataAtualISO()) {
      setErro('Não é possível salvar eventos em datas passadas.');
      return;
    }

    setSalvandoEdicao(true);
    try {
      await api.patch(`/reservas/${edicao.id}`, {
        ...edicao,
        salas: nomesSalasSelecionadas(edicao.sala, edicao.unirSalas),
      });
      setEdicao(null);
      setMensagem('Evento atualizado com sucesso.');
      await carregar();
    } catch (requestError) {
      setErro(requestError.response?.data?.erro || 'Não foi possível atualizar o evento.');
    } finally {
      setSalvandoEdicao(false);
    }
  }

  async function excluirEvento(reserva) {
    if (!window.confirm(`Excluir o evento "${reserva.nome}"? Esta ação também removerá as inscrições vinculadas e não pode ser desfeita.`)) return;

    setErro('');
    setMensagem('');
    setExcluindoReservaId(reserva.id);
    try {
      await api.delete(`/reservas/${reserva.id}`);
      if (edicao?.id === reserva.id) setEdicao(null);
      setReservas((lista) => lista.filter((item) => item.id !== reserva.id));
      setMensagem(`O evento "${reserva.nome}" foi excluído.`);
    } catch (requestError) {
      setErro(requestError.response?.data?.erro || 'Não foi possível excluir o evento.');
    } finally {
      setExcluindoReservaId(null);
    }
  }

  async function salvarAssento(reserva, inscrito) {
    const chave = `${reserva.id}-${inscrito.id}`;
    const assento = assentos[chave]?.trim();
    if (!assento) return;
    setErro('');
    setMensagem('');
    setAssentoSalvando(chave);
    try {
      await api.patch(`/reservas/${reserva.id}/inscricoes/${inscrito.id}/assento`, { assento });
      setMensagem(`Assento de ${inscrito.nome} atualizado.`);
      await carregar();
    } catch (requestError) {
      setErro(requestError.response?.data?.erro || 'Não foi possível salvar o assento.');
    } finally {
      setAssentoSalvando('');
    }
  }

  const aprovadas = reservas.filter((reserva) => reserva.status === 'aprovada');
  const ocupacaoMedia = aprovadas.length
    ? Math.round(aprovadas.reduce((total, reserva) => total + reserva.ocupacaoPercentual, 0) / aprovadas.length)
    : 0;

  return <section>
    <div className="page-heading">
      <span className="eyebrow">{user?.role === 'admin' ? 'GESTÃO DE EVENTOS' : 'ÁREA DO ORGANIZADOR'}</span>
      <h1>{user?.role === 'admin' ? 'Reservas' : 'Minhas reservas'}</h1>
      <p>{user?.role === 'admin' ? 'Cadastre eventos e acompanhe todas as solicitações.' : 'Solicite eventos, acompanhe suas decisões e consulte a ocupação das salas.'}</p>
    </div>

    <form className="form-panel booking-form" onSubmit={handleSubmit}>
      <label>Nome do evento<input value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} maxLength="160" placeholder="Ex.: Encontro de inovação" required /></label>
      <label>Data<input type="text" inputMode="numeric" autoComplete="off" placeholder="DD/MM/AAAA" maxLength="10" value={form.data} onChange={(event) => setForm({ ...form, data: mascararData(event.target.value) })} required /></label>
      <label>Horário de início<input type="time" value={form.horaInicio} onChange={(event) => setForm({ ...form, horaInicio: event.target.value })} required /></label>
      <label>Horário de término<input type="time" value={form.horaFim} onChange={(event) => setForm({ ...form, horaFim: event.target.value })} required min={form.horaInicio || undefined} /></label>
      <label>Sala<select value={form.sala} onChange={(event) => setForm({ ...form, sala: event.target.value, unirSalas: false })} required disabled={salas.length === 0}><option value="" disabled>Selecione uma sala</option>{salas.map((sala) => <option key={sala.id} value={sala.nome}>{sala.nome} · {sala.capacidade} lugares</option>)}</select></label>
      {salaConjugada && <label className="seat-management-toggle"><input type="checkbox" checked={Boolean(form.unirSalas)} onChange={(event) => setForm({ ...form, unirSalas: event.target.checked })} /><span><strong>Unir com {salaConjugada.nome}</strong><small>Capacidade conjunta: {salaSelecionada.capacidade + salaConjugada.capacidade} pessoas.</small></span></label>}
      <div className="technical-resources-field">
        <label htmlFor="technical-resource">Recursos técnicos</label>
        <div className="technical-resource-entry">
          <input id="technical-resource" value={recursoAtual} onChange={(event) => setRecursoAtual(event.target.value)} maxLength="80" placeholder="Ex.: projetor" />
          <button className="link-button" type="button" onClick={adicionarRecurso}>Adicionar</button>
        </div>
        {form.recurso.length > 0 && <ul className="technical-resource-list">
          {form.recurso.map((recurso, index) => <li key={`${recurso}-${index}`}>
            <span>{recurso}</span>
            <button className="link-button" type="button" aria-label={`Remover ${recurso}`} onClick={() => setForm((atual) => ({ ...atual, recurso: atual.recurso.filter((_, itemIndex) => itemIndex !== index) }))}>Remover</button>
          </li>)}
        </ul>}
        {form.recurso.length === 0 && <small>Adicione um ou mais recursos necessários para o evento.</small>}
      </div>
      <label>Palestrante<input value={form.palestrante} onChange={(event) => setForm({ ...form, palestrante: event.target.value })} required /></label>
      <label>Brinde ao final (opcional)<input value={form.brinde} onChange={(event) => setForm({ ...form, brinde: event.target.value })} placeholder="Ex.: kit do evento" /></label>
      <label className="seat-management-toggle"><input type="checkbox" checked={form.gerenciarAssentos} onChange={(event) => setForm({ ...form, gerenciarAssentos: event.target.checked })} /><span><strong>Gerenciar assentos</strong><small>Opcional. Permite atribuir um assento a cada convidado inscrito.</small></span></label>
      <button className="primary-button" type="submit">{user?.role === 'admin' ? 'Cadastrar evento' : 'Solicitar reserva'}</button>
    </form>

    {mensagem && <p className="notice">{mensagem}</p>}
    {erro && <p className="error" role="alert">{erro}</p>}

    {user?.role === 'organizer' && <div className="summary-grid">
      <div className="summary-card"><span>Solicitações</span><strong>{reservas.length}</strong></div>
      <div className="summary-card"><span>Aprovadas</span><strong>{aprovadas.length}</strong></div>
      <div className="summary-card"><span>Ocupação média aprovada</span><strong>{ocupacaoMedia}%</strong></div>
    </div>}

    <h2>{user?.role === 'admin' ? 'Todas as reservas' : 'Histórico das minhas reservas'}</h2>
    <div className="reservation-list">
      {reservas.length === 0 && <p className="empty">Ainda não há reservas para exibir.</p>}
      {reservas.map((reserva) => <article className="reservation-item" key={reserva.id}>
        <div className="reservation-top">
          <div><strong>{reserva.nome}</strong><small>{reserva.codigo} · {reserva.sala} · {formatarData(reserva.data)} · {reserva.horaInicio}–{reserva.horaFim} · {reserva.recurso}</small></div>
          <span className={`status ${reserva.status}`}>{reserva.status}</span>
        </div>
        {reserva.usuarioId === Number(user?.id) && <EventShare codigo={reserva.codigo} />}
        {reserva.usuarioId === Number(user?.id) && edicao?.id !== reserva.id && <div className="room-actions">
          <button className="link-button account-promote" type="button" onClick={() => iniciarEdicao(reserva)}>Editar evento</button>
          <button className="link-button account-promote" type="button" disabled={excluindoReservaId === reserva.id} onClick={() => excluirEvento(reserva)}>{excluindoReservaId === reserva.id ? 'Excluindo...' : 'Excluir evento'}</button>
        </div>}
        {edicao?.id === reserva.id && <form className="form-panel booking-form reservation-edit-form" onSubmit={salvarEdicao}>
          <label>Nome do evento<input value={edicao.nome} onChange={(event) => setEdicao({ ...edicao, nome: event.target.value })} maxLength="160" required /></label>
          <label>Data<input type="date" min={dataAtualISO()} value={edicao.data} onChange={(event) => setEdicao({ ...edicao, data: event.target.value })} required /></label>
          <label>Horário de início<input type="time" value={edicao.horaInicio} onChange={(event) => setEdicao({ ...edicao, horaInicio: event.target.value })} required /></label>
          <label>Horário de término<input type="time" value={edicao.horaFim} min={edicao.horaInicio || undefined} onChange={(event) => setEdicao({ ...edicao, horaFim: event.target.value })} required /></label>
          <label>Sala<select value={edicao.sala} onChange={(event) => setEdicao({ ...edicao, sala: event.target.value, unirSalas: false })} required>{salas.map((sala) => <option key={sala.id} value={sala.nome}>{sala.nome} · {sala.capacidade} lugares</option>)}</select></label>
          {(() => {
            const salaEditada = salas.find((sala) => sala.nome === edicao.sala);
            const conjugadaEditada = salas.find((sala) => sala.id === salaEditada?.conjugadaId);
            return conjugadaEditada && <label className="seat-management-toggle"><input type="checkbox" checked={Boolean(edicao.unirSalas)} onChange={(event) => setEdicao({ ...edicao, unirSalas: event.target.checked })} /><span><strong>Unir com {conjugadaEditada.nome}</strong><small>Capacidade conjunta: {salaEditada.capacidade + conjugadaEditada.capacidade} pessoas.</small></span></label>;
          })()}
          <div className="technical-resources-field">
            <label htmlFor={`edit-resource-${reserva.id}`}>Recursos técnicos</label>
            <div className="technical-resource-entry">
              <input id={`edit-resource-${reserva.id}`} value={edicao.recursoAtual} onChange={(event) => setEdicao({ ...edicao, recursoAtual: event.target.value })} maxLength="80" placeholder="Ex.: projetor" />
              <button className="link-button" type="button" onClick={adicionarRecursoEdicao}>Adicionar</button>
            </div>
            <ul className="technical-resource-list">{edicao.recurso.map((recurso, index) => <li key={`${recurso}-${index}`}>
              <span>{recurso}</span>
              <button className="link-button" type="button" aria-label={`Remover ${recurso}`} onClick={() => setEdicao({ ...edicao, recurso: edicao.recurso.filter((_, itemIndex) => itemIndex !== index) })}>Remover</button>
            </li>)}</ul>
          </div>
          <label>Palestrante<input value={edicao.palestrante} onChange={(event) => setEdicao({ ...edicao, palestrante: event.target.value })} required /></label>
          <label>Brinde ao final (opcional)<input value={edicao.brinde} onChange={(event) => setEdicao({ ...edicao, brinde: event.target.value })} /></label>
          <label className="seat-management-toggle"><input type="checkbox" checked={edicao.gerenciarAssentos} onChange={(event) => setEdicao({ ...edicao, gerenciarAssentos: event.target.checked })} /><span><strong>Gerenciar assentos</strong><small>Permite atribuir assentos aos inscritos.</small></span></label>
          <div className="reservation-edit-actions">
            <button className="primary-button" type="submit" disabled={salvandoEdicao}>{salvandoEdicao ? 'Salvando...' : 'Salvar alterações'}</button>
            <button className="link-button" type="button" disabled={salvandoEdicao} onClick={() => setEdicao(null)}>Cancelar</button>
          </div>
        </form>}
        <div className="reservation-details">
          <span><small>Inscritos</small>{reserva.participantes} / {reserva.capacidadeSala}</span>
          <span><small>Palestrante</small>{reserva.palestrante}</span>
          <span><small>Duração</small>{reserva.duracaoMinutos} min</span>
          <span><small>Brinde</small>{reserva.brinde}</span>
        </div>
        <div className="occupancy">
          <div><small>Ocupação estimada</small><strong>{reserva.ocupacaoPercentual}%</strong></div>
          <div className="occupancy-track" role="progressbar" aria-label={`Ocupação da ${reserva.sala}`} aria-valuenow={reserva.ocupacaoPercentual} aria-valuemin="0" aria-valuemax="100"><span style={{ width: `${reserva.ocupacaoPercentual}%` }} /></div>
          <small>{reserva.participantes} de {reserva.capacidadeSala} lugares</small>
        </div>
        {reserva.status === 'rejeitada' && reserva.motivoRejeicao && <p className="rejection-reason"><strong>Motivo da rejeição:</strong> {reserva.motivoRejeicao}</p>}
        {reserva.gerenciarAssentos && <div className="attendee-list">
          <h3>Assentos dos inscritos</h3>
          {reserva.inscritos.length === 0 && <p className="empty">Os assentos poderão ser definidos quando houver inscrições.</p>}
          {reserva.inscritos.map((inscrito) => {
            const chave = `${reserva.id}-${inscrito.id}`;
            return <div className="attendee-row" key={inscrito.id}>
              <div><strong>{inscrito.nome}</strong>{inscrito.email && <small>{inscrito.email}</small>}</div>
              <label>Assento<input value={assentos[chave] ?? inscrito.assento ?? ''} onChange={(event) => setAssentos({ ...assentos, [chave]: event.target.value })} placeholder="Ex.: Fileira A, assento 03" /></label>
              <button className="link-button account-promote" type="button" disabled={!assentos[chave]?.trim() || assentoSalvando === chave} onClick={() => salvarAssento(reserva, inscrito)}>{assentoSalvando === chave ? 'Salvando...' : 'Salvar assento'}</button>
            </div>;
          })}
        </div>}
      </article>)}
    </div>
  </section>;
}
