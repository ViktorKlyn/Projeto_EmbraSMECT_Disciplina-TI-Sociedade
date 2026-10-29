import { useState } from 'react';
import {
  IconCheckCircle,
  IconAlertCircle,
  IconCheck,
  IconX,
  IconBuilding,
  IconCalendar,
  IconSparkles,
  IconShieldCheck,
} from '../components/Icons';

function Aprovacao({ reservas = [], atualizarStatus }) {
  const [abaAtiva, setAbaAtiva] = useState('pendentes');

  const pendentes = reservas.filter((reserva) => reserva.status === 'Pendente');
  const avaliadas = reservas.filter((reserva) => reserva.status !== 'Pendente');

  const listaExibicao = abaAtiva === 'pendentes' ? pendentes : avaliadas;

  return (
    <section className="page approval-page" aria-label="Central de Aprovação">
      <div className="page-header">
        <div>
          <h1 className="page-title">Central de Aprovação</h1>
          <p className="page-subtitle">
            Revise solicitações de agendamento de espaços para evitar sobreposições e manter a organização acadêmica.
          </p>
        </div>
      </div>

      {/* Banner Informativo Dinâmico */}
      {pendentes.length > 0 ? (
        <div className="approval-banner">
          <div className="banner-content">
            <div className="banner-icon">
              <IconAlertCircle size={24} />
            </div>
            <div className="banner-text">
              <h3>{pendentes.length} {pendentes.length === 1 ? 'solicitação aguardando' : 'solicitações aguardando'} avaliação</h3>
              <p>Analise a disponibilidade física e a conformidade dos recursos requisitados.</p>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="approval-banner"
          style={{
            background: 'linear-gradient(135deg, var(--primary-50), #f0fdf4)',
            borderColor: 'rgba(16, 185, 129, 0.25)',
          }}
        >
          <div className="banner-content">
            <div
              className="banner-icon"
              style={{ background: 'var(--primary-100)', color: 'var(--primary-700)' }}
            >
              <IconCheckCircle size={24} />
            </div>
            <div className="banner-text">
              <h3 style={{ color: 'var(--primary-800)' }}>Tudo em dia!</h3>
              <p style={{ color: 'var(--primary-700)' }}>
                Nenhuma reserva pendente de aprovação no momento.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Abas de Navegação entre Pendentes e Histórico */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
        <button
          type="button"
          className={`filter-pill ${abaAtiva === 'pendentes' ? 'active' : ''}`}
          onClick={() => setAbaAtiva('pendentes')}
          style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}
        >
          Aguardando Aprovação ({pendentes.length})
        </button>

        <button
          type="button"
          className={`filter-pill ${abaAtiva === 'avaliadas' ? 'active' : ''}`}
          onClick={() => setAbaAtiva('avaliadas')}
          style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}
        >
          Histórico Já Avaliado ({avaliadas.length})
        </button>
      </div>

      {/* Lista de Solicitações */}
      {listaExibicao.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <IconShieldCheck size={28} />
          </div>
          <h3>{abaAtiva === 'pendentes' ? 'Fila Limpa!' : 'Nenhum histórico'}</h3>
          <p>
            {abaAtiva === 'pendentes'
              ? 'Não há solicitações pendentes no momento. Bom trabalho!'
              : 'Nenhuma reserva foi avaliada ainda.'}
          </p>
        </div>
      ) : (
        <div className="approval-card-list">
          {listaExibicao.map((reserva) => {
            const isAprovada = reserva.status === 'Aprovada';
            const isRejeitada = reserva.status === 'Rejeitada';
            const cardClass = isAprovada ? 'approved' : isRejeitada ? 'rejected' : '';

            return (
              <div key={reserva.id} className={`approval-card ${cardClass}`}>
                <div className="reservation-main">
                  <div
                    className="reservation-avatar"
                    style={{
                      background: isAprovada
                        ? 'var(--primary-100)'
                        : isRejeitada
                        ? 'var(--rose-100)'
                        : 'var(--amber-100)',
                      color: isAprovada
                        ? 'var(--primary-700)'
                        : isRejeitada
                        ? 'var(--rose-700)'
                        : 'var(--amber-700)',
                      borderColor: 'transparent',
                    }}
                  >
                    <IconBuilding size={22} />
                  </div>

                  <div className="reservation-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                      <h3>{reserva.sala}</h3>
                      <span className={`status status-${reserva.status.toLowerCase()}`}>
                        {reserva.status}
                      </span>
                    </div>

                    <div className="reservation-meta">
                      <div className="meta-item">
                        <IconCalendar size={14} />
                        <span>Data agendada: <strong>{reserva.data}</strong></span>
                      </div>
                      <div className="meta-item">
                        <IconSparkles size={14} />
                        <span>Recurso: {reserva.recurso || 'Padrão da sala'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="approval-actions">
                  {reserva.status === 'Pendente' ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-success btn-sm"
                        onClick={() => atualizarStatus(reserva.id, 'Aprovada')}
                      >
                        <IconCheck size={16} />
                        <span>Aprovar</span>
                      </button>

                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => atualizarStatus(reserva.id, 'Rejeitada')}
                      >
                        <IconX size={16} />
                        <span>Rejeitar</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => atualizarStatus(reserva.id, 'Pendente')}
                      title="Voltar reserva para análise pendente"
                    >
                      <span>Reabrir Avaliação</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default Aprovacao;