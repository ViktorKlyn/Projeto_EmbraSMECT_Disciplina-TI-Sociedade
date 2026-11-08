import { useEffect, useState } from 'react';
import {
  IconBuilding,
  IconCalendar,
  IconSparkles,
  IconPlus,
  IconSearch,
  IconFilter,
  IconAlertCircle,
  IconCheckCircle,
} from '../components/Icons';
import { dataLocalISO, formatarDataAgenda, somarDiasISO } from '../utils/date';
import api from '../services/api';

const RECURSOS_PRESET = [
  'Projetor 4K',
  'Notebooks',
  'Videoconferência',
  'Microfones',
  'Quadro Branco',
];

function Reservas({ reservas = [], adicionarReserva, editarReserva, cancelarReserva, usuarioId, perfil }) {
  const hoje = dataLocalISO();
  const [salas, setSalas] = useState([]);
  const [erroSalas, setErroSalas] = useState('');
  const [novaSala, setNovaSala] = useState({ nome: '', capacidade: '' });
  const [reservaEditandoId, setReservaEditandoId] = useState(null);
  const [formulario, setFormulario] = useState({
    data: '',
    sala: '',
    recurso: '',
  });

  const [filtroStatus, setFiltroStatus] = useState('Todas');
  const [busca, setBusca] = useState('');

  useEffect(() => {
    api.get('/api/salas')
      .then(({ data }) => setSalas(data.salas))
      .catch((erro) => {
        setErroSalas(erro.response?.data?.erro || 'Não foi possível carregar as salas cadastradas.');
      });
  }, []);

  function atualizarCampo(event) {
    setFormulario({ ...formulario, [event.target.name]: event.target.value });
  }

  function selecionarRecurso(recurso) {
    setFormulario((f) => {
      if (!f.recurso) return { ...f, recurso };
      if (f.recurso.includes(recurso)) return f;
      return { ...f, recurso: `${f.recurso}, ${recurso}` };
    });
  }

  function definirDataRapida(diasAFrente) {
    setFormulario((f) => ({ ...f, data: somarDiasISO(hoje, diasAFrente) }));
  }

  function iniciarEdicao(reserva) {
    setReservaEditandoId(reserva.id);
    setFormulario({
      data: reserva.data,
      sala: reserva.sala,
      recurso: reserva.recurso || '',
    });
  }

  function cancelarEdicao() {
    setReservaEditandoId(null);
    setFormulario({ data: '', sala: '', recurso: '' });
  }

  async function cadastrarSala(event) {
    event.preventDefault();
    setErroSalas('');
    try {
      const { data } = await api.post('/api/salas', {
        nome: novaSala.nome.trim(),
        capacidade: Number(novaSala.capacidade),
      });
      setSalas((salasAtuais) => [...salasAtuais, data.sala].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
      setFormulario((atual) => ({ ...atual, sala: data.sala.nome }));
      setNovaSala({ nome: '', capacidade: '' });
    } catch (erro) {
      setErroSalas(erro.response?.data?.erro || 'Não foi possível cadastrar a sala.');
    }
  }

  async function enviarFormulario(event) {
    event.preventDefault();
    if (!formulario.data || !formulario.sala.trim()) return;

    const dados = {
      ...formulario,
      sala: formulario.sala.trim(),
      recurso: formulario.recurso.trim() || 'Nenhum recurso especial',
    };
    const sucesso = reservaEditandoId
      ? await editarReserva(reservaEditandoId, dados)
      : await adicionarReserva(dados);

    if (sucesso) {
      cancelarEdicao();
    }
  }

  // Filtragem combinada por status e termo de busca
  const reservasFiltradas = reservas.filter((reserva) => {
    const atendeStatus =
      filtroStatus === 'Todas' || reserva.status.toLowerCase() === filtroStatus.toLowerCase();
    const termo = busca.toLowerCase();
    const atendeBusca =
      !busca ||
      reserva.sala.toLowerCase().includes(termo) ||
      (reserva.recurso && reserva.recurso.toLowerCase().includes(termo)) ||
      reserva.data.includes(termo);

    return atendeStatus && atendeBusca;
  });

  // Contagens para os badges dos filtros
  const contagem = {
    Todas: reservas.length,
    Pendente: reservas.filter((r) => r.status === 'Pendente').length,
    Aprovada: reservas.filter((r) => r.status === 'Aprovada').length,
    Rejeitada: reservas.filter((r) => r.status === 'Rejeitada').length,
  };
  const agendaQuatorzeDias = Array.from({ length: 14 }, (_, indice) => {
    const data = somarDiasISO(hoje, indice);
    return {
      data,
      titulo: formatarDataAgenda(data),
      reservas: reservas.filter((reserva) => reserva.data === data && reserva.status !== 'Rejeitada'),
    };
  });

  return (
    <section className="page reservations-page" aria-label="Gestão de Reservas">
      <div className="page-header">
        <div>
          <h1 className="page-title">Agendamento & Reservas</h1>
          <p className="page-subtitle">
            Solicite espaços para aulas práticas, bancas, reuniões de departamento ou eventos institucionais.
          </p>
        </div>
      </div>

      <section className="card" aria-labelledby="salas-cadastradas">
        <div className="form-header">
          <h2 id="salas-cadastradas">Salas cadastradas</h2>
          <p>Consulte os espaços disponíveis e suas capacidades.</p>
        </div>
        {erroSalas && <p role="alert" className="status status-rejeitada">{erroSalas}</p>}
        <ul style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.5rem', paddingLeft: '1.25rem' }}>
          {salas.map((sala) => (
            <li key={sala.id}>{sala.nome} — capacidade: {sala.capacidade}</li>
          ))}
          {salas.length === 0 && !erroSalas && <li>Carregando salas...</li>}
        </ul>
        {perfil === 'admin' && (
          <form onSubmit={cadastrarSala}>
            <h3>Cadastrar sala</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'end' }}>
              <div className="form-group" style={{ flex: '1 1 220px', marginBottom: 0 }}>
                <label htmlFor="nova-sala-nome">Nome</label>
                <input
                  id="nova-sala-nome"
                  className="form-input"
                  value={novaSala.nome}
                  onChange={(event) => setNovaSala((atual) => ({ ...atual, nome: event.target.value }))}
                  required
                />
              </div>
              <div className="form-group" style={{ flex: '0 1 150px', marginBottom: 0 }}>
                <label htmlFor="nova-sala-capacidade">Capacidade</label>
                <input
                  id="nova-sala-capacidade"
                  type="number"
                  min="1"
                  step="1"
                  className="form-input"
                  value={novaSala.capacidade}
                  onChange={(event) => setNovaSala((atual) => ({ ...atual, capacidade: event.target.value }))}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary">Cadastrar sala</button>
            </div>
          </form>
        )}
      </section>

      <section className="card" aria-labelledby="agenda-duas-semanas">
        <div className="form-header">
          <h2 id="agenda-duas-semanas">Agenda dos próximos 14 dias</h2>
          <p>As reservas ocupam o dia inteiro. Solicitações pendentes e aprovadas bloqueiam a sala.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
          {agendaQuatorzeDias.map((dia) => (
            <article key={dia.data} className="reservation-card" aria-label={`Agenda de ${dia.titulo}`}>
              <div>
                <h3 style={{ margin: '0 0 0.6rem', textTransform: 'capitalize' }}>{dia.titulo}</h3>
                {dia.reservas.length === 0 ? (
                  <p style={{ margin: 0 }}>Sem reservas</p>
                ) : (
                  dia.reservas.map((reserva) => (
                    <div key={reserva.id} style={{ marginBottom: '0.5rem' }}>
                      <strong>{reserva.sala}</strong>
                      <span className={`status status-${reserva.status.toLowerCase()}`} style={{ marginLeft: '0.5rem' }}>
                        {reserva.status}
                      </span>
                      <div>{reserva.recurso || 'Padrão da sala'}</div>
                    </div>
                  ))
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="reservas-layout">
        {/* Formulário de Criação de Reserva */}
        <div className="card">
          <div className="form-header">
            <h2>{reservaEditandoId ? 'Editar Reserva' : 'Nova Solicitação de Reserva'}</h2>
            <p>{reservaEditandoId ? 'Atualize os dados da sua solicitação.' : 'Preencha os dados abaixo para enviar para aprovação.'}</p>
          </div>

          <form onSubmit={enviarFormulario}>
            <div className="form-group">
              <label htmlFor="data">Data Desejada</label>
              <div className="input-with-icon">
                <span className="input-icon-left">
                  <IconCalendar size={18} />
                </span>
                <input
                  id="data"
                  name="data"
                  type="date"
                  min={hoje}
                  className="form-input"
                  value={formulario.data}
                  onChange={atualizarCampo}
                  required
                />
              </div>
              <div className="chips-row">
                <button
                  type="button"
                  className="chip-btn"
                  onClick={() => definirDataRapida(0)}
                >
                  Hoje
                </button>
                <button
                  type="button"
                  className="chip-btn"
                  onClick={() => definirDataRapida(1)}
                >
                  Amanhã
                </button>
                <button
                  type="button"
                  className="chip-btn"
                  onClick={() => definirDataRapida(7)}
                >
                  Em 1 semana
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="sala">Ambiente / Sala</label>
              <div className="input-with-icon">
                <span className="input-icon-left">
                  <IconBuilding size={18} />
                </span>
                <select
                  id="sala"
                  name="sala"
                  className="form-input"
                  value={formulario.sala}
                  onChange={atualizarCampo}
                  required
                >
                  <option value="">Selecione uma sala</option>
                  {salas.map((sala) => (
                    <option key={sala.id} value={sala.nome}>
                      {sala.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="recurso">Recursos & Equipamentos</label>
              <div className="input-with-icon">
                <span className="input-icon-left">
                  <IconSparkles size={18} />
                </span>
                <input
                  id="recurso"
                  name="recurso"
                  className="form-input"
                  placeholder="Ex.: Projetor, Microfone, Caixas de Som"
                  value={formulario.recurso}
                  onChange={atualizarCampo}
                />
              </div>
              <div className="chips-row">
                {RECURSOS_PRESET.map((recurso) => (
                  <button
                    key={recurso}
                    type="button"
                    className="chip-btn"
                    onClick={() => selecionarRecurso(recurso)}
                  >
                    + {recurso}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1.25rem' }}
            >
              {!reservaEditandoId && <IconPlus size={18} />}
              <span>{reservaEditandoId ? 'Salvar alterações' : 'Confirmar Solicitação de Reserva'}</span>
            </button>
            {reservaEditandoId && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: '100%', marginTop: '0.5rem' }}
                onClick={cancelarEdicao}
              >
                Cancelar edição
              </button>
            )}
          </form>
        </div>

        {/* Listagem de Reservas com Filtros e Busca */}
        <div>
          <div className="filter-toolbar">
            <div className="filter-pills">
              {['Todas', 'Pendente', 'Aprovada', 'Rejeitada'].map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`filter-pill ${filtroStatus === status ? 'active' : ''}`}
                  onClick={() => setFiltroStatus(status)}
                >
                  {status} ({contagem[status] ?? 0})
                </button>
              ))}
            </div>

            <div className="search-box">
              <span className="search-icon">
                <IconSearch size={16} />
              </span>
              <input
                type="text"
                placeholder="Buscar sala ou recurso..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
          </div>

          {reservasFiltradas.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <IconCalendar size={28} />
              </div>
              <h3>Nenhuma reserva encontrada</h3>
              <p>Não há solicitações correspondentes aos filtros aplicados no momento.</p>
            </div>
          ) : (
            <div className="reservations-grid">
              {reservasFiltradas.map((reserva) => (
                <div key={reserva.id} className="reservation-card">
                  <div className="reservation-main">
                    <div className="reservation-avatar">
                      <IconBuilding size={20} />
                    </div>
                    <div className="reservation-info">
                      <h3>{reserva.sala}</h3>
                      <div className="reservation-meta">
                        <div className="meta-item">
                          <IconCalendar size={14} />
                          <span>{reserva.data}</span>
                        </div>
                        <div className="meta-item">
                          <IconSparkles size={14} />
                          <span>Recurso: {reserva.recurso || 'Padrão da sala'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <span className={`status status-${reserva.status.toLowerCase()}`}>
                      {reserva.status}
                    </span>
                    {reserva.usuarioId === usuarioId && (
                      <>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                        onClick={() => iniciarEdicao(reserva)}
                        title="Editar esta reserva"
                      >
                        Editar
                      </button>
                      {cancelarReserva && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', color: 'var(--rose-600)' }}
                        onClick={() => {
                          if (window.confirm(`Deseja realmente cancelar a reserva para "${reserva.sala}" em ${reserva.data}?`)) {
                            cancelarReserva(reserva.id);
                          }
                        }}
                        title="Cancelar esta reserva"
                      >
                        Cancelar
                      </button>
                      )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default Reservas;