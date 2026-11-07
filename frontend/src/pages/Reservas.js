import { useState } from 'react';
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

const SALAS_PRESET = [
  '1 (Tropical)',
  '2 (Doko)',
  '3 (Conquista)',
  '4 (Uirapuru)',
  '5 (Pintado)',
  '6 (Vencedora)',
  '7 (Tracajá)',
  'Auditório Principal',
];

const RECURSOS_PRESET = [
  'Projetor 4K',
  'Notebooks',
  'Videoconferência',
  'Microfones',
  'Quadro Branco',
];

function Reservas({ reservas = [], adicionarReserva, cancelarReserva }) {
  const hoje = new Date().toISOString().split('T')[0];
  const [formulario, setFormulario] = useState({
    data: '',
    sala: '',
    recurso: '',
  });

  const [filtroStatus, setFiltroStatus] = useState('Todas');
  const [busca, setBusca] = useState('');

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
    const data = new Date();
    data.setDate(data.getDate() + diasAFrente);
    const iso = data.toISOString().split('T')[0];
    setFormulario((f) => ({ ...f, data: iso }));
  }

  async function enviarFormulario(event) {
    event.preventDefault();
    if (!formulario.data || !formulario.sala.trim()) return;

    const sucesso = await adicionarReserva({
      ...formulario,
      sala: formulario.sala.trim(),
      recurso: formulario.recurso.trim() || 'Nenhum recurso especial',
    });

    if (sucesso) {
      setFormulario({ data: '', sala: '', recurso: '' });
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

      <div className="reservas-layout">
        {/* Formulário de Criação de Reserva */}
        <div className="card">
          <div className="form-header">
            <h2>Nova Solicitação de Reserva</h2>
            <p>Preencha os dados abaixo para enviar para aprovação.</p>
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
                  {SALAS_PRESET.map((sala) => (
                    <option key={sala} value={sala}>
                      {sala}
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
              <IconPlus size={18} />
              <span>Confirmar Solicitação de Reserva</span>
            </button>
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