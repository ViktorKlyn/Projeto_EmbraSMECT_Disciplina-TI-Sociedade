import { useEffect, useState } from 'react';
import Header from './components/Header';
import Aprovacao from './pages/Aprovacao';
import Home from './pages/Home';
import Login from './pages/Login';
import Relatorios from './pages/Relatorios';
import Reservas from './pages/Reservas';
import Reunioes from './pages/Reunioes';
import { IconCheckCircle } from './components/Icons';
import api from './services/api';
import './style.css';

const PAGINAS = ['home', 'reservas', 'relatorios', 'aprovacao', 'reunioes'];
const CHAVE_USUARIO_ID = 'embrasmect_user_id';
const CHAVE_USUARIO_NOME = 'embrasmect_user_name';
const CHAVE_PAGINA = 'embrasmect_page';

function obterPaginaInicial() {
  if (!localStorage.getItem(CHAVE_USUARIO_ID)) return 'login';
  const paginaSalva = localStorage.getItem(CHAVE_PAGINA);
  return PAGINAS.includes(paginaSalva) ? paginaSalva : 'home';
}

function App() {
  const [pagina, setPagina] = useState(obterPaginaInicial);
  const [usuario, setUsuario] = useState(
    () => localStorage.getItem(CHAVE_USUARIO_NOME) || ''
  );
  const [usuarioId, setUsuarioId] = useState(
    () => parseInt(localStorage.getItem(CHAVE_USUARIO_ID) || '1', 10)
  );
  const [notificacao, setNotificacao] = useState(null);

  function navegar(novaPagina) {
    setPagina(novaPagina);
    if (PAGINAS.includes(novaPagina)) {
      localStorage.setItem(CHAVE_PAGINA, novaPagina);
    }
  }

  // Dados iniciais realistas e representativos do ambiente acadêmico
  const [reservas, setReservas] = useState([]);

  function exibirToast(mensagem, tipo = 'sucesso') {
    setNotificacao({ mensagem, tipo });
    setTimeout(() => {
      setNotificacao(null);
    }, 4000);
  }

  useEffect(() => {
    if (!localStorage.getItem(CHAVE_USUARIO_ID)) return;
    api.get('/api/reservas')
      .then(({ data }) => setReservas(data.reservas || []))
      .catch((erro) => {
        exibirToast(erro.response?.data?.erro || 'Não foi possível carregar as reservas.', 'erro');
      });
  }, [usuarioId, pagina]);

  function entrar(nome, id = 1) {
    setUsuario(nome);
    setUsuarioId(id);
    localStorage.setItem(CHAVE_USUARIO_ID, id.toString());
    localStorage.setItem(CHAVE_USUARIO_NOME, nome);
    navegar('home');
    exibirToast(`Bem-vindo, ${nome}! Sessão iniciada.`, 'sucesso');
  }

  function trocarUsuario(novoId) {
    const mapaUsuarios = {
      1: 'Gustavo Silva (Admin)',
      2: 'Prof. Ricardo (Gestor)',
      3: 'Ana Souza (Comum)',
      4: 'Bruno Lima (Comum)',
    };
    setUsuarioId(novoId);
    setUsuario(mapaUsuarios[novoId] || `Usuário ${novoId}`);
    localStorage.setItem(CHAVE_USUARIO_ID, novoId.toString());
    localStorage.setItem(CHAVE_USUARIO_NOME, mapaUsuarios[novoId] || `Usuário ${novoId}`);
    exibirToast(`Contexto alterado para ${mapaUsuarios[novoId] || novoId}.`, 'info');
  }

  function sair() {
    setUsuario('');
    localStorage.removeItem(CHAVE_USUARIO_ID);
    localStorage.removeItem(CHAVE_USUARIO_NOME);
    localStorage.removeItem(CHAVE_PAGINA);
    navegar('login');
    exibirToast('Sessão encerrada com sucesso.', 'info');
  }

  async function adicionarReserva(novaReserva) {
    const hoje = new Date().toISOString().split('T')[0];
    if (novaReserva.data < hoje) {
      exibirToast(`Data inválida: Não é permitido agendar em datas passadas (${novaReserva.data}).`, 'erro');
      return false;
    }

    // Regra de Conflito: Não permite reservar a mesma sala no mesmo dia se já houver reserva Pendente ou Aprovada
    const conflito = reservas.find(
      (r) =>
        r.sala.trim().toLowerCase() === novaReserva.sala.trim().toLowerCase() &&
        r.data === novaReserva.data &&
        r.status !== 'Rejeitada'
    );

    if (conflito) {
      exibirToast(
        `Conflito de agenda: A sala "${novaReserva.sala}" já possui agendamento (${conflito.status.toLowerCase()}) no dia ${novaReserva.data}!`,
        'erro'
      );
      return false;
    }

    try {
      const { data } = await api.post('/api/reservas', novaReserva);
      setReservas((reservasAtuais) => [data.reserva, ...reservasAtuais]);
      exibirToast(`Reserva para "${novaReserva.sala}" enviada para aprovação!`, 'sucesso');
      return true;
    } catch (erro) {
      exibirToast(erro.response?.data?.erro || 'Não foi possível salvar a reserva.', 'erro');
      return false;
    }
  }

  async function cancelarReserva(id) {
    const alvo = reservas.find((r) => r.id === id);
    if (!alvo) return;
    try {
      const { data } = await api.delete(`/api/reservas/${id}`);
      setReservas((reservasAtuais) => reservasAtuais.filter((r) => r.id !== id));
      exibirToast(
        data.sincronizacao?.erro
          ? `Reserva cancelada, mas não foi possível removê-la do Google Agenda: ${data.sincronizacao.erro}`
          : `Reserva para "${alvo.sala}" cancelada com sucesso.`,
        data.sincronizacao?.erro ? 'erro' : 'info'
      );
    } catch (erro) {
      exibirToast(erro.response?.data?.erro || 'Não foi possível cancelar a reserva.', 'erro');
    }
  }

  async function atualizarStatus(id, novoStatus) {
    try {
      const { data } = await api.patch(`/api/reservas/${id}/status`, { status: novoStatus });
      setReservas((reservasAtuais) =>
        reservasAtuais.map((reserva) => reserva.id === id ? data.reserva : reserva)
      );
      if (data.sincronizacao?.erro) {
        exibirToast(
          `Reserva ${novoStatus.toLowerCase()}, mas a sincronização com o Google Agenda falhou: ${data.sincronizacao.erro}`,
          'erro'
        );
        return;
      }
      exibirToast(`Reserva ${novoStatus.toLowerCase()} com sucesso!`, 'sucesso');
    } catch (erro) {
      exibirToast(erro.response?.data?.erro || 'Não foi possível atualizar a reserva.', 'erro');
    }
  }

  function renderizarPagina() {
    if (pagina === 'home') {
      return <Home usuario={usuario} navegar={navegar} reservas={reservas} />;
    }
    if (pagina === 'reservas') {
      return (
        <Reservas
          reservas={reservas}
          adicionarReserva={adicionarReserva}
          cancelarReserva={cancelarReserva}
        />
      );
    }
    if (pagina === 'relatorios') {
      return <Relatorios reservas={reservas} />;
    }
    if (pagina === 'aprovacao') {
      return <Aprovacao reservas={reservas} atualizarStatus={atualizarStatus} />;
    }
    if (pagina === 'reunioes') {
      return (
        <Reunioes
          usuarioAtual={usuario}
          usuarioId={usuarioId}
          aoTrocarUsuario={trocarUsuario}
          exibirToast={exibirToast}
        />
      );
    }
    return <Login entrar={entrar} />;
  }

  return (
    <div className="app">
      {pagina !== 'login' && (
        <Header
          navegar={navegar}
          usuario={usuario}
          paginaAtiva={pagina}
          aoSair={sair}
        />
      )}

      <main className={`container ${pagina === 'login' ? 'container-login' : ''}`}>
        {renderizarPagina()}
      </main>

      {/* Notificação Toast Flutuante com Suporte a Status */}
      {notificacao && (
        <div className="toast-container" role="status" aria-live="polite">
          <div className={`toast toast-${notificacao.tipo}`}>
            {notificacao.tipo === 'erro' ? (
              <span style={{ color: '#f87171', fontWeight: 'bold' }}>⚠️</span>
            ) : (
              <IconCheckCircle size={20} style={{ color: 'var(--primary-400)' }} />
            )}
            <span>{notificacao.mensagem}</span>
          </div>
        </div>
      )}

      <footer className="footer">
        <div className="footer-copy">
          <strong>Embrapa Meeting</strong>
          <span>•</span>
          <span>Projeto Acadêmico — Disciplina TI & Sociedade</span>
        </div>
        <div className="footer-badge">
          Versão 2.0 • Modelo Moderno & Intuitivo
        </div>
      </footer>
    </div>
  );
}

export default App;
