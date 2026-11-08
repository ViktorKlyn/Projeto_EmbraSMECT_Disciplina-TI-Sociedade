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
import { dataLocalISO } from './utils/date';
import './style.css';

const PAGINAS = ['home', 'reservas', 'relatorios', 'aprovacao', 'reunioes'];
const CHAVE_TOKEN = 'embrasmect_token';
const CHAVE_USUARIO_ID = 'embrasmect_user_id';
const CHAVE_USUARIO_NOME = 'embrasmect_user_name';
const CHAVE_PAGINA = 'embrasmect_page';

function obterToken() {
  return localStorage.getItem(CHAVE_TOKEN) || sessionStorage.getItem(CHAVE_TOKEN);
}

function obterPaginaInicial() {
  if (!obterToken()) return 'login';
  const paginaSalva = localStorage.getItem(CHAVE_PAGINA);
  return PAGINAS.includes(paginaSalva) ? paginaSalva : 'home';
}

function App() {
  const [pagina, setPagina] = useState(obterPaginaInicial);
  const [usuario, setUsuario] = useState('');
  const [usuarioId, setUsuarioId] = useState(null);
  const [perfil, setPerfil] = useState('');
  const [autenticando, setAutenticando] = useState(() => Boolean(obterToken()));
  const [notificacao, setNotificacao] = useState(null);

  function navegar(novaPagina) {
    if (novaPagina === 'aprovacao' && !['admin', 'gestor'].includes(perfil)) return;
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
    if (!obterToken()) return;

    api.get('/api/sessao')
      .then(({ data }) => {
        setUsuario(data.usuario.nome);
        setUsuarioId(data.usuario.id);
        setPerfil(data.usuario.perfil);
        const paginaSalva = localStorage.getItem(CHAVE_PAGINA);
        setPagina(PAGINAS.includes(paginaSalva) ? paginaSalva : 'home');
      })
      .catch((erro) => {
        if (erro.response?.status === 401) {
          localStorage.removeItem(CHAVE_TOKEN);
          sessionStorage.removeItem(CHAVE_TOKEN);
        } else {
          exibirToast('Não foi possível verificar a sessão. Confira se a API está disponível.', 'erro');
        }
        setPagina('login');
      })
      .finally(() => setAutenticando(false));
  }, []);

  useEffect(() => {
    if (!obterToken() || !usuarioId) return;
    api.get('/api/reservas')
      .then(({ data }) => setReservas(data.reservas || []))
      .catch((erro) => {
        const mensagem = erro.response?.data?.erro
          || (erro.response
            ? `Não foi possível carregar as reservas (HTTP ${erro.response.status}).`
            : 'Não foi possível conectar à API. Verifique a variável REACT_APP_API_URL na Vercel e se o backend está disponível.');
        exibirToast(mensagem, 'erro');
      });
  }, [usuarioId, pagina]);

  function entrar({ token, usuario: usuarioAutenticado }, lembrar) {
    const armazenamento = lembrar ? localStorage : sessionStorage;
    const outroArmazenamento = lembrar ? sessionStorage : localStorage;
    outroArmazenamento.removeItem(CHAVE_TOKEN);
    armazenamento.setItem(CHAVE_TOKEN, token);
    localStorage.removeItem(CHAVE_USUARIO_ID);
    localStorage.removeItem(CHAVE_USUARIO_NOME);
    setUsuario(usuarioAutenticado.nome);
    setUsuarioId(usuarioAutenticado.id);
    setPerfil(usuarioAutenticado.perfil);
    navegar('home');
    exibirToast(`Bem-vindo, ${usuarioAutenticado.nome}! Sessão iniciada.`, 'sucesso');
  }

  function sair() {
    setUsuario('');
    setUsuarioId(null);
    setPerfil('');
    localStorage.removeItem(CHAVE_TOKEN);
    sessionStorage.removeItem(CHAVE_TOKEN);
    localStorage.removeItem(CHAVE_USUARIO_ID);
    localStorage.removeItem(CHAVE_USUARIO_NOME);
    localStorage.removeItem(CHAVE_PAGINA);
    navegar('login');
    exibirToast('Sessão encerrada com sucesso.', 'info');
  }

  async function adicionarReserva(novaReserva) {
    const hoje = dataLocalISO();
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

  async function editarReserva(id, dadosAtualizados) {
    if (dadosAtualizados.data < dataLocalISO()) {
      exibirToast('Não é permitido agendar em datas passadas.', 'erro');
      return false;
    }

    const conflito = reservas.find(
      (reserva) =>
        reserva.id !== id &&
        reserva.sala.trim().toLowerCase() === dadosAtualizados.sala.trim().toLowerCase() &&
        reserva.data === dadosAtualizados.data &&
        reserva.status !== 'Rejeitada'
    );
    if (conflito) {
      exibirToast('Já existe uma solicitação ativa para esta sala e data.', 'erro');
      return false;
    }

    try {
      const { data } = await api.patch(`/api/reservas/${id}`, dadosAtualizados);
      setReservas((reservasAtuais) =>
        reservasAtuais.map((reserva) => reserva.id === id ? data.reserva : reserva)
      );
      if (data.sincronizacao?.erro) {
        exibirToast(`Reserva atualizada, mas a sincronização com o Google Agenda falhou: ${data.sincronizacao.erro}`, 'erro');
      } else {
        exibirToast('Reserva atualizada com sucesso.', 'sucesso');
      }
      return true;
    } catch (erro) {
      exibirToast(erro.response?.data?.erro || 'Não foi possível atualizar a reserva.', 'erro');
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
          editarReserva={editarReserva}
          cancelarReserva={cancelarReserva}
          usuarioId={usuarioId}
          perfil={perfil}
        />
      );
    }
    if (pagina === 'relatorios') {
      return <Relatorios reservas={reservas} />;
    }
    if (pagina === 'aprovacao') {
      if (!['admin', 'gestor'].includes(perfil)) {
        return <Home usuario={usuario} navegar={navegar} reservas={reservas} />;
      }
      return <Aprovacao reservas={reservas} atualizarStatus={atualizarStatus} />;
    }
    if (pagina === 'reunioes') {
      return (
        <Reunioes
          usuarioId={usuarioId}
          exibirToast={exibirToast}
        />
      );
    }
    return <Login entrar={entrar} />;
  }

  if (autenticando) {
    return <main className="container" role="status">Verificando sessão...</main>;
  }

  return (
    <div className="app">
      {pagina !== 'login' && (
        <Header
          navegar={navegar}
          usuario={usuario}
          perfil={perfil}
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
