import {
  IconBuilding,
  IconCalendar,
  IconCheckCircle,
  IconAlertCircle,
  IconFileText,
  IconPlus,
  IconArrowRight,
  IconSparkles,
  IconClock,
} from '../components/Icons';

function Home({ usuario, navegar, reservas = [] }) {
  // Cálculos de métricas em tempo real
  const total = reservas.length;
  const pendentes = reservas.filter((r) => r.status === 'Pendente').length;
  const aprovadas = reservas.filter((r) => r.status === 'Aprovada').length;
  const rejeitadas = reservas.filter((r) => r.status === 'Rejeitada').length;

  // Data atual formatada em português
  const dataHoje = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  // Últimas 3 reservas adicionadas
  const ultimasReservas = [...reservas].reverse().slice(0, 3);

  return (
    <section className="page home-dashboard" aria-label="Painel Principal">
      {/* Banner Hero Principal */}
      <div className="home-hero">
        <div className="hero-pill">
          <IconSparkles size={14} />
          <span>Embrapa Meeting • Gestão Acadêmica</span>
        </div>
        <h1>Bem-vindo, {usuario}!</h1>
        <p>
          Gerencie o agendamento de salas de reuniões, laboratórios multidisciplinares e
          recursos audiovisuais com rapidez e controle de aprovação.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navegar('reservas')}
          >
            <IconPlus size={18} />
            <span>Fazer Nova Reserva</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navegar('aprovacao')}
          >
            <IconCheckCircle size={18} />
            <span>{pendentes > 0 ? `Revisar Aprovações (${pendentes})` : 'Revisar Aprovações'}</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navegar('reunioes')}
          >
            <IconSparkles size={18} />
            <span>Reuniões & Participação</span>
          </button>
        </div>
      </div>

      {/* Grid de Estatísticas (KPI Cards) */}
      <div className="hero-stats-row">
        <div className="stat-card">
          <div className="stat-icon emerald">
            <IconCalendar size={24} />
          </div>
          <div className="stat-details">
            <span className="stat-value">{total}</span>
            <span className="stat-label">Total de Reservas</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon amber">
            <IconAlertCircle size={24} />
          </div>
          <div className="stat-details">
            <span className="stat-value">{pendentes}</span>
            <span className="stat-label">Pendentes de Avaliação</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon indigo">
            <IconCheckCircle size={24} />
          </div>
          <div className="stat-details">
            <span className="stat-value">{aprovadas}</span>
            <span className="stat-label">Reservas Aprovadas</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon emerald">
            <IconBuilding size={24} />
          </div>
          <div className="stat-details">
            <span className="stat-value">6</span>
            <span className="stat-label">Salas Ativas no Campus</span>
          </div>
        </div>
      </div>

      {/* Ações Rápidas em Cards Interativos */}
      <div className="section-title">
        <span>Acesso Rápido aos Módulos</span>
        <span style={{ fontSize: '0.85rem', color: 'var(--slate-500)', fontWeight: 500 }}>
          {dataHoje.charAt(0).toUpperCase() + dataHoje.slice(1)}
        </span>
      </div>

      <div className="home-actions-grid">
        <div className="action-card">
          <div className="action-card-header">
            <div className="action-icon">
              <IconCalendar size={22} />
            </div>
            <div className="action-card-info">
              <h3>Agendar Sala</h3>
              <p>Cadastre novas datas e solicite recursos</p>
            </div>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--slate-600)' }}>
            Selecione entre auditórios, laboratórios e salas de reunião com suporte a projetor, som e informática.
          </p>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            style={{ marginTop: 'auto' }}
            onClick={() => navegar('reservas')}
          >
            <span>Ir para Reservas</span>
            <IconArrowRight size={16} />
          </button>
        </div>

        <div className="action-card">
          <div className="action-card-header">
            <div className="action-icon">
              <IconCheckCircle size={22} />
            </div>
            <div className="action-card-info">
              <h3>Painel de Aprovação</h3>
              <p>Aprove ou indefira solicitações</p>
            </div>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--slate-600)' }}>
            Gerencie o fluxo de autorização das salas para evitar conflitos de horários entre departamentos.
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ marginTop: 'auto' }}
            onClick={() => navegar('aprovacao')}
          >
            <span>{pendentes > 0 ? `Revisar (${pendentes} pendentes)` : 'Ver Fila'}</span>
            <IconArrowRight size={16} />
          </button>
        </div>

        <div className="action-card">
          <div className="action-card-header">
            <div className="action-icon">
              <IconFileText size={22} />
            </div>
            <div className="action-card-info">
              <h3>Relatórios & Exportação</h3>
              <p>Histórico geral e métricas de uso</p>
            </div>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--slate-600)' }}>
            Consulte a tabela consolidada de utilizações passadas e futuras com exportação direta em formato CSV.
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ marginTop: 'auto' }}
            onClick={() => navegar('relatorios')}
          >
            <span>Consultar Relatórios</span>
            <IconArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Prévia das Últimas Reservas */}
      <div className="section-title">
        <span>Últimas Solicitações Registradas</span>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => navegar('reservas')}
        >
          <span>Ver todas as reservas</span>
          <IconArrowRight size={14} />
        </button>
      </div>

      <div className="reservations-grid">
        {ultimasReservas.map((reserva) => (
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
                    <span>Recurso: {reserva.recurso || 'Nenhum'}</span>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <span className={`status status-${reserva.status.toLowerCase()}`}>
                {reserva.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Home;