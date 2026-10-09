import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import EventShare from '../components/EventShare';

const initialForm = {
  nome: '',
  descricao: '',
  data: '',
  horaInicio: '',
  horaFim: '',
  sala: '',
  unirSalas: false,
  recurso: [],
  reservado: false,
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
  const [recursosTecnicos, setRecursosTecnicos] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [edicao, setEdicao] = useState(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [excluindoReservaId, setExcluindoReservaId] = useState(null);
  const [conflitosRecursos, setConflitosRecursos] = useState([]);
  const [consultandoDisponibilidade, setConsultandoDisponibilidade] = useState(false);
  const [erroDisponibilidade, setErroDisponibilidade] = useState('');

  async function carregar() {
    const { data } = await api.get('/reservas');
    setReservas(data);
  }

  useEffect(() => {
    Promise.all([carregar(), api.get('/reservas/salas'), api.get('/recursos-tecnicos')])
      .then(([, { data: listaSalas }, { data: listaRecursos }]) => {
        setSalas(listaSalas);
        setRecursosTecnicos(listaRecursos);
        setForm((atual) => ({ ...atual, sala: atual.sala || listaSalas[0]?.nome || '' }));
      })
      .catch(() => setErro('Não foi possível carregar as reservas, espaços e recursos técnicos.'));
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

  function recursosFixosParaSalas(nomesSalas) {
    const salaIds = new Set(salas.filter((sala) => nomesSalas.includes(sala.nome)).map((sala) => sala.id));
    return recursosTecnicos.filter((recurso) => recurso.salaId && salaIds.has(recurso.salaId));
  }

  function recursosDoEvento(dados) {
    const nomesSalas = nomesSalasSelecionadas(dados.sala, dados.unirSalas);
    const fixos = recursosFixosParaSalas(nomesSalas).map((recurso) => recurso.nome);
    return [...new Set([...dados.recurso, ...fixos])];
  }

  function recursosLivres() {
    return recursosTecnicos.filter((recurso) => !recurso.salaId);
  }

  const dataDisponibilidade = edicao ? edicao.data : converterDataParaISO(form.data);
  const horaInicioDisponibilidade = edicao ? edicao.horaInicio : form.horaInicio;
  const horaFimDisponibilidade = edicao ? edicao.horaFim : form.horaFim;
  const idIgnoradoDisponibilidade = edicao?.id || '';

  useEffect(() => {
    if (!dataDisponibilidade || !horaInicioDisponibilidade || !horaFimDisponibilidade || horaFimDisponibilidade <= horaInicioDisponibilidade) {
      setConflitosRecursos([]);
      setErroDisponibilidade('');
      setConsultandoDisponibilidade(false);
      return undefined;
    }

    let ativo = true;
    setConsultandoDisponibilidade(true);
    setConflitosRecursos([]);
    setErroDisponibilidade('');
    api.get('/reservas/disponibilidade-recursos', {
      params: {
        data: dataDisponibilidade,
        horaInicio: horaInicioDisponibilidade,
        horaFim: horaFimDisponibilidade,
        ...(idIgnoradoDisponibilidade ? { ignorarId: idIgnoradoDisponibilidade } : {}),
      },
    })
      .then(({ data }) => {
        if (ativo) setConflitosRecursos(data.conflitos);
      })
      .catch((requestError) => {
        if (ativo) {
          setConflitosRecursos([]);
          setErroDisponibilidade(requestError.response?.data?.erro || 'Não foi possível consultar a disponibilidade dos recursos técnicos.');
        }
      })
      .finally(() => {
        if (ativo) setConsultandoDisponibilidade(false);
      });

    return () => {
      ativo = false;
    };
  }, [dataDisponibilidade, horaInicioDisponibilidade, horaFimDisponibilidade, idIgnoradoDisponibilidade]);

  function conflitoDoRecurso(nomeRecurso) {
    return conflitosRecursos.find((conflito) => (
      conflito.recurso.toLocaleLowerCase('pt-BR') === nomeRecurso.toLocaleLowerCase('pt-BR')
    ));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErro('');
    setMensagem('');
    const recursosSelecionados = recursosDoEvento(form);
    if (recursosSelecionados.length === 0) {
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
        recurso: recursosSelecionados,
        salas: nomesSalasSelecionadas(form.sala, form.unirSalas),
        nome: form.nome.trim(),
        data: dataISO,
      });
      setForm(initialForm);
      setMensagem(user?.role === 'admin'
        ? `Evento aprovado. ${eventoCriado.reservado ? `Compartilhe o código ${eventoCriado.codigo} apenas com os convidados autorizados.` : `A página do convidado está disponível para o evento ${eventoCriado.codigo}.`}`
        : `Solicitação enviada para aprovação do ADM. ${eventoCriado.reservado ? `Após a aprovação, compartilhe o código ${eventoCriado.codigo} apenas com os convidados autorizados.` : `A página do convidado ${eventoCriado.codigo} ficará disponível após a aprovação.`}`);
      await carregar();
    } catch (requestError) {
      setErro(requestError.response?.data?.erro || 'Não foi possível enviar a solicitação.');
    }
  }

  function iniciarEdicao(reserva) {
    setErro('');
    setMensagem('');
    setEdicao({
      id: reserva.id,
      nome: reserva.nome,
      descricao: reserva.descricao || '',
      data: reserva.data,
      horaInicio: reserva.horaInicio,
      horaFim: reserva.horaFim,
      sala: (reserva.salas ?? [reserva.sala])[0],
      unirSalas: (reserva.salas ?? [reserva.sala]).length > 1,
      recurso: reserva.recurso.split(',').map((item) => item.trim()).filter((nome) => (
        recursosTecnicos.some((recurso) => !recurso.salaId && recurso.nome.toLocaleLowerCase('pt-BR') === nome.toLocaleLowerCase('pt-BR'))
      )),
      recursosNaoCadastrados: reserva.recurso.split(',').map((item) => item.trim()).filter((nome) => (
        nome && !recursosTecnicos.some((recurso) => recurso.nome.toLocaleLowerCase('pt-BR') === nome.toLocaleLowerCase('pt-BR'))
      )),
      palestrante: reserva.palestrante,
      brinde: reserva.brinde === 'Não haverá brinde' ? '' : reserva.brinde,
      reservado: reserva.reservado === true,
    });
  }

  async function salvarEdicao(event) {
    event.preventDefault();
    setErro('');
    setMensagem('');
    if (recursosDoEvento(edicao).length === 0) {
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
        recurso: recursosDoEvento(edicao),
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

  const aprovadas = reservas.filter((reserva) => reserva.status === 'aprovada');
  const ocupacaoMedia = aprovadas.length
    ? Math.round(aprovadas.reduce((total, reserva) => total + reserva.ocupacaoPercentual, 0) / aprovadas.length)
    : 0;
  const isAdmPrincipal = user?.role === 'admin' && user?.principal === true;
  const podeGerenciarEvento = (reserva) => isAdmPrincipal || reserva.usuarioId === Number(user?.id);

  return <section>
    <div className="page-heading">
      <span className="eyebrow">{user?.role === 'admin' ? 'GESTÃO DE EVENTOS' : 'ÁREA DO ORGANIZADOR'}</span>
      <h1>{user?.role === 'admin' ? 'Reservas' : 'Minhas reservas'}</h1>
      <p>{isAdmPrincipal ? 'Cadastre eventos, consulte todos os eventos e gerencie qualquer um deles.' : user?.role === 'admin' ? 'Cadastre eventos e visualize somente as reservas que você criou.' : 'Solicite eventos, acompanhe suas decisões e consulte a ocupação dos espaços.'}</p>
    </div>

    <form className="form-panel booking-form" onSubmit={handleSubmit}>
      <label>Nome do evento<input value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} maxLength="160" placeholder="Ex.: Encontro de inovação" required /></label>
      <label>Descrição do evento (opcional)<textarea value={form.descricao} onChange={(event) => setForm({ ...form, descricao: event.target.value })} maxLength="2000" rows="4" placeholder="Apresente o evento e o que os participantes podem esperar." /></label>
      <label>Data<input type="text" inputMode="numeric" autoComplete="off" placeholder="DD/MM/AAAA" maxLength="10" value={form.data} onChange={(event) => setForm({ ...form, data: mascararData(event.target.value) })} required /></label>
      <label>Horário de início<input type="time" value={form.horaInicio} onChange={(event) => setForm({ ...form, horaInicio: event.target.value })} required /></label>
      <label>Horário de término<input type="time" value={form.horaFim} onChange={(event) => setForm({ ...form, horaFim: event.target.value })} required min={form.horaInicio || undefined} /></label>
      <label>Espaço<select value={form.sala} onChange={(event) => setForm({ ...form, sala: event.target.value, unirSalas: false })} required disabled={salas.length === 0}><option value="" disabled>Selecione um espaço</option>{salas.map((sala) => <option key={sala.id} value={sala.nome}>{sala.nome} · {sala.capacidade} lugares</option>)}</select></label>
      {salaConjugada && <label className="seat-management-toggle"><input type="checkbox" checked={Boolean(form.unirSalas)} onChange={(event) => setForm({ ...form, unirSalas: event.target.checked })} /><span><strong>Unir com {salaConjugada.nome}</strong><small>Capacidade total: {salaSelecionada.capacidade + salaConjugada.capacidade} pessoas.</small></span></label>}
      <div className="technical-resources-field">
        <strong>Recursos técnicos</strong>
        <div className="technical-resource-picker">
          {recursosFixosParaSalas(nomesSalasSelecionadas(form.sala, form.unirSalas)).map((recurso) => {
            return <span className="technical-resource-selected fixed" key={recurso.id}>
              {recurso.nome} · {recurso.categoria} · {recurso.status === 'manutencao' ? 'Manutenção' : 'OK'} · Fixo
            </span>;
          })}
          {form.recurso.map((nomeRecurso) => <span className="technical-resource-selected" key={nomeRecurso}>
              {nomeRecurso}
              <button className="link-button" type="button" onClick={() => setForm((atual) => ({ ...atual, recurso: atual.recurso.filter((item) => item !== nomeRecurso) }))}>Remover</button>
          </span>)}
          <label>Selecionar recurso cadastrado
            <select value="" onChange={(event) => {
              const recurso = recursosTecnicos.find((item) => item.id === Number(event.target.value));
              if (recurso && !form.recurso.includes(recurso.nome)) {
                setForm((atual) => ({ ...atual, recurso: [...atual.recurso, recurso.nome] }));
              }
            }} disabled={recursosLivres().length === 0}>
              <option value="">{recursosLivres().length ? 'Escolha um recurso...' : 'Nenhum recurso livre disponível'}</option>
              {['Áudio', 'Vídeo', 'Informática', 'Iluminação', 'Outros'].map((categoria) => {
                const recursosCategoria = recursosLivres().filter((recurso) => (
                  (recurso.categoria || 'Outros') === categoria && !form.recurso.includes(recurso.nome)
                ));
                return recursosCategoria.length > 0 && <optgroup label={categoria} key={categoria}>
                  {recursosCategoria.map((recurso) => {
                    const emUso = Boolean(conflitoDoRecurso(recurso.nome));
                    return <option key={recurso.id} value={recurso.id} disabled={emUso}>
                      {recurso.nome} · {recurso.status === 'manutencao' ? 'Manutenção' : 'OK'}{emUso ? ' · Em uso' : ''}
                    </option>;
                  })}
                </optgroup>;
              })}
            </select>
          </label>
        </div>
        {recursosTecnicos.length === 0 && <small>Nenhum recurso cadastrado. Cadastre recursos na opção Recursos técnicos antes de criar uma reserva.</small>}
        {consultandoDisponibilidade && <small>Consultando disponibilidade...</small>}
        {erroDisponibilidade && <small className="error" role="alert">{erroDisponibilidade}</small>}
        <small>Selecione quantos recursos forem necessários; os fixados ao espaço são incluídos automaticamente.</small>
      </div>
      <label>Palestrante<input value={form.palestrante} onChange={(event) => setForm({ ...form, palestrante: event.target.value })} required /></label>
      <label>Brinde ao final (opcional)<input value={form.brinde} onChange={(event) => setForm({ ...form, brinde: event.target.value })} placeholder="Ex.: kit do evento" /></label>
      <label className="seat-management-toggle"><input type="checkbox" checked={form.reservado} onChange={(event) => setForm({ ...form, reservado: event.target.checked })} /><span><strong>Evento reservado</strong><small>Não aparece na lista de eventos do convidado. Compartilhe o código do evento apenas com os convidados autorizados.</small></span></label>
      <button className="primary-button" type="submit">{user?.role === 'admin' ? 'Cadastrar evento' : 'Solicitar reserva'}</button>
    </form>

    {mensagem && <p className="notice">{mensagem}</p>}
    {erro && <p className="error" role="alert">{erro}</p>}

    {user?.role === 'organizer' && <div className="summary-grid">
      <div className="summary-card"><span>Solicitações</span><strong>{reservas.length}</strong></div>
      <div className="summary-card"><span>Aprovadas</span><strong>{aprovadas.length}</strong></div>
      <div className="summary-card"><span>Ocupação média aprovada</span><strong>{ocupacaoMedia}%</strong></div>
    </div>}

    <h2>{isAdmPrincipal ? 'Eventos cadastrados' : 'Minhas reservas criadas'}</h2>
    <div className="reservation-list">
      {reservas.length === 0 && <p className="empty">Você ainda não criou reservas.</p>}
      {reservas.map((reserva) => <article className="reservation-item" key={reserva.id}>
        <div className="reservation-top">
          <div><strong>{reserva.nome}</strong><small>{reserva.codigo}{reserva.reservado ? ' · EVENTO RESERVADO' : ''} · Espaço {reserva.sala} · {formatarData(reserva.data)} · {reserva.horaInicio} – {reserva.horaFim} · {reserva.recurso}</small></div>
          <span className={`status ${reserva.status}`}>{reserva.status}</span>
        </div>
        {reserva.usuarioId === Number(user?.id) && <EventShare codigo={reserva.codigo} reservado={reserva.reservado === true} />}
        {podeGerenciarEvento(reserva) && edicao?.id !== reserva.id && <div className="room-actions">
          <button className="link-button account-promote" type="button" onClick={() => iniciarEdicao(reserva)}>Editar evento</button>
          <button className="link-button account-promote" type="button" disabled={excluindoReservaId === reserva.id} onClick={() => excluirEvento(reserva)}>{excluindoReservaId === reserva.id ? 'Excluindo...' : 'Excluir evento'}</button>
        </div>}
        {edicao?.id === reserva.id && <form className="form-panel booking-form reservation-edit-form" onSubmit={salvarEdicao}>
          <label>Nome do evento<input value={edicao.nome} onChange={(event) => setEdicao({ ...edicao, nome: event.target.value })} maxLength="160" required /></label>
          <label>Descrição do evento (opcional)<textarea value={edicao.descricao} onChange={(event) => setEdicao({ ...edicao, descricao: event.target.value })} maxLength="2000" rows="4" placeholder="Apresente o evento e o que os participantes podem esperar." /></label>
          <label>Data<input type="date" min={dataAtualISO()} value={edicao.data} onChange={(event) => setEdicao({ ...edicao, data: event.target.value })} required /></label>
          <label>Horário de início<input type="time" value={edicao.horaInicio} onChange={(event) => setEdicao({ ...edicao, horaInicio: event.target.value })} required /></label>
          <label>Horário de término<input type="time" value={edicao.horaFim} min={edicao.horaInicio || undefined} onChange={(event) => setEdicao({ ...edicao, horaFim: event.target.value })} required /></label>
          <label>Espaço<select value={edicao.sala} onChange={(event) => setEdicao({ ...edicao, sala: event.target.value, unirSalas: false })} required>{salas.map((sala) => <option key={sala.id} value={sala.nome}>{sala.nome} · {sala.capacidade} lugares</option>)}</select></label>
          {(() => {
            const salaEditada = salas.find((sala) => sala.nome === edicao.sala);
            const conjugadaEditada = salas.find((sala) => sala.id === salaEditada?.conjugadaId);
            return conjugadaEditada && <label className="seat-management-toggle"><input type="checkbox" checked={Boolean(edicao.unirSalas)} onChange={(event) => setEdicao({ ...edicao, unirSalas: event.target.checked })} /><span><strong>Unir com {conjugadaEditada.nome}</strong><small>Capacidade total: {salaEditada.capacidade + conjugadaEditada.capacidade} pessoas.</small></span></label>;
          })()}
          <div className="technical-resources-field">
            <strong>Recursos técnicos</strong>
            {edicao.recursosNaoCadastrados.length > 0 && <small className="error">Recursos antigos não cadastrados não podem ser mantidos: {edicao.recursosNaoCadastrados.join(', ')}. Selecione os recursos disponíveis abaixo.</small>}
            <div className="technical-resource-picker">
              {recursosFixosParaSalas(nomesSalasSelecionadas(edicao.sala, edicao.unirSalas)).map((recurso) => {
                return <span className="technical-resource-selected fixed" key={recurso.id}>
                  {recurso.nome} · {recurso.categoria} · {recurso.status === 'manutencao' ? 'Manutenção' : 'OK'} · Fixo
                </span>;
              })}
              {edicao.recurso.map((nomeRecurso) => <span className="technical-resource-selected" key={nomeRecurso}>
                  {nomeRecurso}
                  <button className="link-button" type="button" onClick={() => setEdicao((atual) => ({ ...atual, recurso: atual.recurso.filter((item) => item !== nomeRecurso) }))}>Remover</button>
                </span>)}
              <label>Selecionar recurso cadastrado
                <select value="" onChange={(event) => {
                  const recurso = recursosTecnicos.find((item) => item.id === Number(event.target.value));
                  if (recurso && !edicao.recurso.includes(recurso.nome)) {
                    setEdicao((atual) => ({ ...atual, recurso: [...atual.recurso, recurso.nome] }));
                  }
                }} disabled={recursosLivres().length === 0}>
                  <option value="">{recursosLivres().length ? 'Escolha um recurso...' : 'Nenhum recurso livre disponível'}</option>
                  {['Áudio', 'Vídeo', 'Informática', 'Iluminação', 'Outros'].map((categoria) => {
                    const recursosCategoria = recursosLivres().filter((recurso) => (
                      (recurso.categoria || 'Outros') === categoria && !edicao.recurso.includes(recurso.nome)
                    ));
                    return recursosCategoria.length > 0 && <optgroup label={categoria} key={categoria}>
                      {recursosCategoria.map((recurso) => {
                        const emUso = Boolean(conflitoDoRecurso(recurso.nome));
                        return <option key={recurso.id} value={recurso.id} disabled={emUso}>
                          {recurso.nome} · {recurso.status === 'manutencao' ? 'Manutenção' : 'OK'}{emUso ? ' · Em uso' : ''}
                        </option>;
                      })}
                    </optgroup>;
                  })}
                </select>
              </label>
            </div>
            {recursosTecnicos.length === 0 && <small>Nenhum recurso cadastrado. Cadastre recursos na opção Recursos técnicos para editar este evento.</small>}
            {consultandoDisponibilidade && <small>Consultando disponibilidade...</small>}
            {erroDisponibilidade && <small className="error" role="alert">{erroDisponibilidade}</small>}
            <small>Selecione quantos recursos forem necessários; os fixados ao espaço são incluídos automaticamente.</small>
          </div>
          <label>Palestrante<input value={edicao.palestrante} onChange={(event) => setEdicao({ ...edicao, palestrante: event.target.value })} required /></label>
          <label>Brinde ao final (opcional)<input value={edicao.brinde} onChange={(event) => setEdicao({ ...edicao, brinde: event.target.value })} /></label>
          <label className="seat-management-toggle"><input type="checkbox" checked={edicao.reservado} onChange={(event) => setEdicao({ ...edicao, reservado: event.target.checked })} /><span><strong>Evento reservado</strong><small>Oculta o evento da lista de convidados; o código precisa ser compartilhado com eles.</small></span></label>
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
      </article>)}
    </div>
  </section>;
}
