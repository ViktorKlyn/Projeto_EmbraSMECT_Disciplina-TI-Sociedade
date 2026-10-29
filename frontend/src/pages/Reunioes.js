import { useState, useEffect } from 'react';
import api from '../services/api';
import {
  IconCalendar,
  IconBuilding,
  IconUser,
  IconCheckCircle,
  IconAlertCircle,
  IconShieldCheck,
  IconSparkles,
  IconPlus,
  IconCheck,
  IconX,
} from '../components/Icons';

function Reunioes({ usuarioAtual, usuarioId, aoTrocarUsuario, exibirToast }) {
  const [reunioes, setReunioes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [googleConectado, setGoogleConectado] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [novaReuniao, setNovaReuniao] = useState({
    titulo: '',
    sala_id: '1',
    data_reuniao: '',
    hora_inicio: '14:00',
    hora_fim: '15:00',
    tipo: 'publica',
  });
  const [notificacoes, setNotificacoes] = useState({ enviados: [], recebidos: [], pendentesParaAprovar: 0 });

  async function carregarDados() {
    try {
      setCarregando(true);
      const [resReunioes, resUsuarios, resPedidos] = await Promise.all([
        api.get('/api/reunioes'),
        api.get('/api/usuarios'),
        api.get('/api/pedidos/meus'),
      ]);

      setReunioes(resReunioes.data.reunioes || []);
      setUsuarios(resUsuarios.data.usuarios || []);
      setNotificacoes(resPedidos.data || { enviados: [], recebidos: [], pendentesParaAprovar: 0 });
    } catch (err) {
      console.error('Erro ao buscar dados de reuniões:', err);
      exibirToast(
        err.response?.data?.erro || 'Erro de conexão com o servidor ao carregar reuniões.',
        'erro'
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, [usuarioId]);

  useEffect(() => {
    api.get('/api/google-calendar/status')
      .then(({ data }) => setGoogleConectado(data.conectado))
      .catch((err) => exibirToast(err.response?.data?.erro || 'Não foi possível verificar o Google Agenda.', 'erro'));

    const parametros = new URLSearchParams(window.location.search);
    const resultado = parametros.get('googleCalendar');
    if (!resultado) return;
    window.history.replaceState({}, '', window.location.pathname);
    if (resultado === 'connected') {
      setGoogleConectado(true);
      api.post('/api/google-calendar/sync')
        .then(({ data }) => {
          exibirToast(`${data.sincronizados} evento(s) sincronizado(s) com o Google Agenda.`, 'sucesso');
        })
        .catch((err) => {
          const detalhes = err.response?.data?.erros?.map((item) => item.erro).join('; ');
          exibirToast(detalhes || err.response?.data?.erro || 'Não foi possível sincronizar eventos com o Google Agenda.', 'erro');
        });
    } else {
      exibirToast(resultado.startsWith('sync_error:')
        ? 'Conta Google conectada, mas alguns eventos ainda não foram sincronizados. Tente sincronizar novamente.'
        : `Não foi possível conectar o Google Agenda: ${resultado.replace(/^error:/, '')}`,
      'erro');
    }
  }, [usuarioId]);

  async function conectarGoogle() {
    try {
      const { data } = await api.post('/api/google-calendar/connect');
      window.location.assign(data.url);
    } catch (err) {
      exibirToast(err.response?.data?.erro || 'Não foi possível iniciar a conexão com o Google Agenda.', 'erro');
    }
  }

  async function sincronizarGoogle() {
    try {
      const { data } = await api.post('/api/google-calendar/sync');
      exibirToast(`${data.sincronizados} evento(s) sincronizado(s) com o Google Agenda.`, 'sucesso');
    } catch (err) {
      const detalhes = err.response?.data?.erros?.map((item) => item.erro).join('; ');
      exibirToast(detalhes || err.response?.data?.erro || 'Não foi possível sincronizar eventos com o Google Agenda.', 'erro');
    }
  }

  async function criarReuniao(event) {
    event.preventDefault();
    try {
      setProcessando(true);
      const { data } = await api.post('/api/reunioes', novaReuniao);
      setMostrarFormulario(false);
      setNovaReuniao({
        titulo: '',
        sala_id: '1',
        data_reuniao: '',
        hora_inicio: '14:00',
        hora_fim: '15:00',
        tipo: 'publica',
      });
      exibirToast(
        data.sincronizacao.sincronizado
          ? 'Reunião criada e sincronizada com o Google Agenda.'
          : `Reunião criada. Google Agenda: ${data.sincronizacao.erro}`,
        data.sincronizacao.sincronizado ? 'sucesso' : 'erro'
      );
      await carregarDados();
    } catch (err) {
      exibirToast(err.response?.data?.erro || 'Não foi possível criar a reunião.', 'erro');
    } finally {
      setProcessando(false);
    }
  }

  // Enviar pedido de participação
  async function handleSolicitar(reuniaoId, titulo) {
    try {
      setProcessando(true);
      const res = await api.post(`/api/reunioes/${reuniaoId}/pedidos`);
      exibirToast(`Solicitação para "${titulo}" enviada com sucesso! Aguarde o anfitrião.`, 'sucesso');
      await carregarDados();
    } catch (err) {
      const msg = err.response?.data?.erro || 'Erro ao enviar pedido de participação.';
      exibirToast(msg, 'erro');
    } finally {
      setProcessando(false);
    }
  }

  // Responder pedido (Aceitar ou Recusar)
  async function handleResponder(pedidoId, acao, nomeSolicitante) {
    try {
      setProcessando(true);
      const res = await api.patch(`/api/pedidos/${pedidoId}`, { acao });
      exibirToast(
        acao === 'aceitar'
          ? `Pedido de ${nomeSolicitante} aceito! Participante adicionado à sala.`
          : `Pedido de ${nomeSolicitante} foi recusado.`,
        'sucesso'
      );
      await carregarDados();
    } catch (err) {
      const msg = err.response?.data?.erro || 'Erro ao processar resposta do pedido.';
      exibirToast(msg, 'erro');
    } finally {
      setProcessando(false);
    }
  }

  // Teste de auditoria de segurança: tentar burlar o backend
  async function testarBurlagemSeguranca(pedidoId) {
    try {
      setProcessando(true);
      // Chamada intencional sem ser o criador
      const res = await api.patch(`/api/pedidos/${pedidoId}`, { acao: 'aceitar' });
      exibirToast('Aviso: O backend permitiu a ação indevida!', 'erro');
    } catch (err) {
      if (err.response?.status === 403) {
        exibirToast(
          `Comprovado pelo Back-end: 403 Forbidden! "${err.response.data.erro}"`,
          'info'
        );
      } else {
        exibirToast(err.response?.data?.erro || 'Erro retornado pela API.', 'erro');
      }
    } finally {
      setProcessando(false);
    }
  }

  return (
    <section className="page meetings-page" aria-label="Gestão de Reuniões e Participação">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reuniões & Pedidos de Participação</h1>
          <p className="page-subtitle">
            Auditoria e controle estrito de acesso: envie pedidos para reuniões e gerencie solicitações com validação no back-end.
          </p>
        </div>

        {/* Seletor de Perfil / Usuário Ativo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#ffffff', padding: '0.5rem 1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <IconUser size={18} style={{ color: 'var(--primary-600)' }} />
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', fontWeight: 600 }}>Perfil em Teste:</div>
            <select
              value={usuarioId}
              onChange={(e) => aoTrocarUsuario(parseInt(e.target.value, 10))}
              style={{ border: 'none', background: 'transparent', fontWeight: 700, color: 'var(--slate-800)', cursor: 'pointer', outline: 'none' }}
            >
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome} ({u.perfil})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0 }}>Google Agenda</h2>
            <p style={{ margin: '0.35rem 0 0', color: 'var(--slate-600)' }}>
              {googleConectado ? 'Conta Google conectada.' : 'Conecte sua conta para sincronizar seus eventos.'}
            </p>
            <p style={{ margin: '0.35rem 0 0', color: 'var(--amber-700)', fontSize: '0.8rem' }}>
              Protótipo acadêmico: o login do sistema é demonstrativo e não deve ser usado para proteger contas reais.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {googleConectado ? (
              <button type="button" className="btn btn-secondary" onClick={sincronizarGoogle}>
                <IconCalendar size={16} />
                <span>Sincronizar eventos</span>
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={conectarGoogle}>
                <IconCalendar size={16} />
                <span>Conectar Google Agenda</span>
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setMostrarFormulario((mostrar) => !mostrar)}
            >
              <IconPlus size={16} />
              <span>{mostrarFormulario ? 'Fechar' : 'Criar reunião'}</span>
            </button>
          </div>
        </div>

        {mostrarFormulario && (
          <form onSubmit={criarReuniao} style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
            <div className="form-group">
              <label htmlFor="titulo-reuniao">Título</label>
              <input
                id="titulo-reuniao"
                className="form-input"
                value={novaReuniao.titulo}
                onChange={(event) => setNovaReuniao({ ...novaReuniao, titulo: event.target.value })}
                required
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
              <div className="form-group">
                <label htmlFor="sala-reuniao">Sala</label>
                <select
                  id="sala-reuniao"
                  className="form-input"
                  value={novaReuniao.sala_id}
                  onChange={(event) => setNovaReuniao({ ...novaReuniao, sala_id: event.target.value })}
                  required
                >
                  {[
                    ['1', '1 (Tropical)'],
                    ['2', '2 (Doko)'],
                    ['3', '3 (Conquista)'],
                    ['4', '4 (Uirapuru)'],
                    ['5', '5 (Pintado)'],
                    ['6', '6 (Vencedora)'],
                    ['7', '7 (Tracajá)'],
                    ['8', 'Auditório Principal'],
                  ].map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="data-reuniao">Data</label>
                <input
                  id="data-reuniao"
                  type="date"
                  className="form-input"
                  min={new Date().toISOString().slice(0, 10)}
                  value={novaReuniao.data_reuniao}
                  onChange={(event) => setNovaReuniao({ ...novaReuniao, data_reuniao: event.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="hora-inicio">Início</label>
                <input
                  id="hora-inicio"
                  type="time"
                  className="form-input"
                  value={novaReuniao.hora_inicio}
                  onChange={(event) => setNovaReuniao({ ...novaReuniao, hora_inicio: event.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="hora-fim">Fim</label>
                <input
                  id="hora-fim"
                  type="time"
                  className="form-input"
                  value={novaReuniao.hora_fim}
                  onChange={(event) => setNovaReuniao({ ...novaReuniao, hora_fim: event.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="tipo-reuniao">Visibilidade</label>
                <select
                  id="tipo-reuniao"
                  className="form-input"
                  value={novaReuniao.tipo}
                  onChange={(event) => setNovaReuniao({ ...novaReuniao, tipo: event.target.value })}
                >
                  <option value="publica">Pública</option>
                  <option value="privada">Privada</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={processando}>
              <IconPlus size={16} />
              <span>Criar reunião</span>
            </button>
          </form>
        )}
      </div>

      {/* Banner de Notificação para o Criador */}
      {notificacoes.pendentesParaAprovar > 0 && (
        <div className="approval-banner" style={{ marginBottom: '1.5rem' }}>
          <div className="banner-content">
            <div className="banner-icon">
              <IconAlertCircle size={24} />
            </div>
            <div className="banner-text">
              <h3>Você tem {notificacoes.pendentesParaAprovar} {notificacoes.pendentesParaAprovar === 1 ? 'solicitação de participação pendente' : 'solicitações pendentes'}</h3>
              <p>Como anfitrião, revise quem pode ingressar nas suas salas de reunião abaixo.</p>
            </div>
          </div>
        </div>
      )}

      {/* Grid de Reuniões */}
      {carregando ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--slate-500)' }}>
          Carregando dados sincronizados com o banco de dados...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {reunioes.map((reuniao) => {
            const ehCriador = reuniao.souCriador;
            const ehParticipante = reuniao.souParticipante;
            const pedido = reuniao.meuPedido;
            const percentualOcupacao = Math.min(100, Math.round((reuniao.vagasOcupadas / reuniao.vagasTotais) * 100));

            return (
              <div
                key={reuniao.id}
                className="card"
                style={{
                  borderLeft: ehCriador ? '4px solid var(--primary-600)' : ehParticipante ? '4px solid #10b981' : '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{reuniao.titulo}</h2>
                      <span className={`status status-${reuniao.status === 'ativa' ? 'aprovada' : 'rejeitada'}`}>
                        {reuniao.status}
                      </span>
                      {ehCriador && (
                        <span style={{ fontSize: '0.75rem', background: 'var(--primary-100)', color: 'var(--primary-800)', padding: '0.2rem 0.6rem', borderRadius: '999px', fontWeight: 600 }}>
                          👑 Você é o Criador
                        </span>
                      )}
                      {ehParticipante && !ehCriador && (
                        <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#166534', padding: '0.2rem 0.6rem', borderRadius: '999px', fontWeight: 600 }}>
                          ✓ Participante Confirmado
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.85rem', color: 'var(--slate-600)', marginTop: '0.35rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <IconBuilding size={16} />
                        <span>{reuniao.sala_nome}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <IconCalendar size={16} />
                        <span>Data: <strong>{reuniao.data_reuniao}</strong></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <IconUser size={16} />
                        <span>Criador: <strong>{reuniao.criador_nome}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Vagas e Lotação */}
                  <div style={{ minWidth: '180px', textAlign: 'right' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: reuniao.lotada ? 'var(--rose-600)' : 'var(--slate-700)' }}>
                      Capacidade: {reuniao.vagasOcupadas} / {reuniao.vagasTotais} vagas
                      {reuniao.lotada && ' (LOTADA)'}
                    </div>
                    <div style={{ height: '6px', width: '100%', background: 'var(--slate-200)', borderRadius: '999px', overflow: 'hidden', marginTop: '0.35rem' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${percentualOcupacao}%`,
                          background: reuniao.lotada ? 'var(--rose-500)' : 'var(--primary-600)',
                          borderRadius: '999px',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Lista de Participantes Confirmados */}
                <div style={{ fontSize: '0.85rem', color: 'var(--slate-600)', marginBottom: '1rem', background: 'var(--slate-50)', padding: '0.65rem 1rem', borderRadius: 'var(--radius-md)' }}>
                  <strong>Participantes confirmados:</strong>{' '}
                  {reuniao.participantes.map((p) => p.nome).join(', ')}
                </div>

                {/* Painel do Criador: Solicitações Pendentes Recebidas */}
                {ehCriador && (
                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span>Solicitações de Participação Recebidas</span>
                      <span style={{ fontSize: '0.75rem', background: 'var(--primary-100)', color: 'var(--primary-800)', padding: '0.1rem 0.5rem', borderRadius: '999px' }}>
                        {reuniao.pedidosPendentes.length} pendentes
                      </span>
                    </h3>

                    {reuniao.pedidosPendentes.length === 0 ? (
                      <div style={{ fontSize: '0.85rem', color: 'var(--slate-500)', fontStyle: 'italic' }}>
                        Nenhum pedido pendente de aprovação para esta reunião.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {reuniao.pedidosPendentes.map((ped) => (
                          <div
                            key={ped.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              background: '#ffffff',
                              border: '1px solid var(--border-subtle)',
                              padding: '0.65rem 1rem',
                              borderRadius: 'var(--radius-md)',
                            }}
                          >
                            <div>
                              <strong>{ped.usuario_nome}</strong> ({ped.usuario_email})
                              <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                                Solicitado em: {new Date(ped.criado_em).toLocaleString('pt-BR')}
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                type="button"
                                className="btn btn-success btn-sm"
                                disabled={processando}
                                onClick={() => handleResponder(ped.id, 'aceitar', ped.usuario_nome)}
                                title="Aceitar participante na reunião"
                              >
                                <IconCheck size={16} />
                                <span>Aceitar</span>
                              </button>

                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                disabled={processando}
                                onClick={() => handleResponder(ped.id, 'recusar', ped.usuario_nome)}
                                title="Recusar solicitação"
                              >
                                <IconX size={16} />
                                <span>Recusar</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Painel do Solicitante: Ação de Pedir ou Status Atual */}
                {!ehCriador && !ehParticipante && (
                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {pedido ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--slate-600)' }}>Seu pedido:</span>
                        <span className={`status status-${pedido.status === 'aceito' ? 'aprovada' : pedido.status === 'recusado' ? 'rejeitada' : 'pendente'}`}>
                          {pedido.status === 'aceito' ? '✓ Aceito pelo Anfitrião' : pedido.status === 'recusado' ? '✕ Recusado pelo Anfitrião' : '⏳ Aguardando Aprovação'}
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={processando || reuniao.status !== 'ativa'}
                        onClick={() => handleSolicitar(reuniao.id, reuniao.titulo)}
                      >
                        <IconPlus size={16} />
                        <span>Pedir Participação nesta Reunião</span>
                      </button>
                    )}

                    {/* Botão de Auditoria para Demonstrar Bloqueio 403 do Back-End */}
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem', opacity: 0.8 }}
                      onClick={() => testarBurlagemSeguranca(1)}
                      title="Testa envio de requisição direta de aprovação para comprovar que o backend barra com 403"
                    >
                      🛡️ Testar Burlagem (Validar 403)
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default Reunioes;
