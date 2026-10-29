import { useState } from 'react';
import {
  IconFileText,
  IconDownload,
  IconSearch,
  IconBuilding,
  IconCalendar,
  IconCheckCircle,
  IconAlertCircle,
  IconSparkles,
} from '../components/Icons';

function Relatorios({ reservas = [] }) {
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('Todos');

  // Cálculos de métricas analíticas
  const total = reservas.length;
  const aprovadas = reservas.filter((r) => r.status === 'Aprovada').length;
  const pendentes = reservas.filter((r) => r.status === 'Pendente').length;
  const taxaAprovacao = total > 0 ? Math.round((aprovadas / total) * 100) : 0;

  // Filtragem dos dados da tabela
  const dadosFiltrados = reservas.filter((reserva) => {
    const atendeStatus =
      filtroStatus === 'Todos' || reserva.status.toLowerCase() === filtroStatus.toLowerCase();
    const termo = busca.toLowerCase();
    const atendeBusca =
      !busca ||
      reserva.sala.toLowerCase().includes(termo) ||
      (reserva.recurso && reserva.recurso.toLowerCase().includes(termo)) ||
      reserva.data.includes(termo);

    return atendeStatus && atendeBusca;
  });

  // Função para exportar CSV dinamicamente no navegador
  function sanitizarCSV(valor) {
    if (typeof valor !== 'string') return valor;
    // Previne CSV formula injection (DDE / comandos em Excel/Calc)
    const texto = valor.replace(/"/g, '""');
    if (/^[=+\-@\t\r]/.test(texto)) {
      return `"'${texto}"`;
    }
    return `"${texto}"`;
  }

  // Função para exportar CSV dinamicamente no navegador
  function exportarCSV() {
    if (reservas.length === 0) return;

    const cabecalho = ['ID', 'Sala', 'Data', 'Recurso', 'Status'];
    const linhas = reservas.map((r) => [
      r.id,
      sanitizarCSV(r.sala),
      sanitizarCSV(r.data),
      sanitizarCSV(r.recurso || ''),
      sanitizarCSV(r.status),
    ]);

    const conteudoCSV = [cabecalho.join(','), ...linhas.map((l) => l.join(','))].join('\n');
    const blob = new Blob([conteudoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_reservas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <section className="page reports-page" aria-label="Relatórios e Auditoria">
      <div className="page-header">
        <div>
          <h1 className="page-title">Relatórios & Histórico</h1>
          <p className="page-subtitle">
            Consulte o registro completo de utilização dos espaços com auditoria de aprovação e métricas consolidadas.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={exportarCSV}
          title="Baixar planilha de reservas em CSV"
        >
          <IconDownload size={18} />
          <span>Exportar Planilha CSV</span>
        </button>
      </div>

      {/* Cards de Métricas do Relatório */}
      <div className="hero-stats-row" style={{ marginBottom: '1.75rem' }}>
        <div className="stat-card">
          <div className="stat-icon emerald">
            <IconFileText size={22} />
          </div>
          <div className="stat-details">
            <span className="stat-value">{total}</span>
            <span className="stat-label">Total de Agendamentos</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon emerald">
            <IconCheckCircle size={22} />
          </div>
          <div className="stat-details">
            <span className="stat-value">{taxaAprovacao}%</span>
            <span className="stat-label">Taxa de Aprovação</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon amber">
            <IconAlertCircle size={22} />
          </div>
          <div className="stat-details">
            <span className="stat-value">{pendentes}</span>
            <span className="stat-label">Aguardando Avaliação</span>
          </div>
        </div>
      </div>

      {/* Tabela de Relatórios com Barra de Filtros */}
      <div className="table-card">
        <div className="table-toolbar">
          <div className="search-box">
            <span className="search-icon">
              <IconSearch size={16} />
            </span>
            <input
              type="text"
              placeholder="Filtrar por sala, recurso ou data..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--slate-500)', fontWeight: 600 }}>
              Status:
            </span>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="form-input"
              style={{ padding: '0.45rem 1rem', width: 'auto', fontSize: '0.88rem' }}
            >
              <option value="Todos">Todos os Status</option>
              <option value="Aprovada">Aprovadas</option>
              <option value="Pendente">Pendentes</option>
              <option value="Rejeitada">Rejeitadas</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Ambiente / Sala</th>
                <th>Data da Reserva</th>
                <th>Recursos Alocados</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {dadosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{ color: 'var(--slate-400)', marginBottom: '0.5rem' }}>
                      <IconFileText size={32} />
                    </div>
                    <strong style={{ display: 'block', color: 'var(--slate-700)' }}>
                      Nenhum resultado encontrado
                    </strong>
                    <span style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>
                      Tente alterar os termos de busca ou o filtro de status.
                    </span>
                  </td>
                </tr>
              ) : (
                dadosFiltrados.map((reserva) => (
                  <tr key={reserva.id}>
                    <td>
                      <div className="table-room-cell">
                        <IconBuilding size={18} style={{ color: 'var(--primary-600)' }} />
                        <span>{reserva.sala}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--slate-600)' }}>
                        <IconCalendar size={15} />
                        <span>{reserva.data}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ color: 'var(--slate-600)' }}>
                        {reserva.recurso || 'Nenhum recurso extra'}
                      </span>
                    </td>
                    <td>
                      <span className={`status status-${reserva.status.toLowerCase()}`}>
                        {reserva.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '1rem 1.5rem', background: 'var(--slate-50)', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--slate-500)' }}>
          <span>Exibindo <strong>{dadosFiltrados.length}</strong> de <strong>{reservas.length}</strong> registros</span>
          <span>Atualizado em tempo real</span>
        </div>
      </div>
    </section>
  );
}

export default Relatorios;