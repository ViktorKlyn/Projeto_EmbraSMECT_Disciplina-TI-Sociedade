import {
  IconBuilding,
  IconCalendar,
  IconFileText,
  IconCheckCircle,
  IconLogOut,
  IconUser,
} from './Icons';

function Header({ navegar, usuario, paginaAtiva, aoSair }) {
  // Pega as iniciais do usuário para o avatar
  const iniciais = (usuario || 'U')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <header className="header">
      <div className="brand" onClick={() => navegar('home')} role="button" tabIndex={0}>
        <div className="brand-icon">
          <IconBuilding size={22} />
        </div>
        <div className="brand-text">
          <div className="brand-title">
            Embrapa <span>Meeting</span>
          </div>
          <div className="brand-subtitle">Gestão de Ambientes</div>
        </div>
      </div>

      <nav className="nav" aria-label="Navegação principal">
        <button
          type="button"
          className={`nav-link ${paginaAtiva === 'home' ? 'active' : ''}`}
          onClick={() => navegar('home')}
        >
          <IconBuilding size={16} />
          Início
        </button>

        <button
          type="button"
          className={`nav-link ${paginaAtiva === 'reservas' ? 'active' : ''}`}
          onClick={() => navegar('reservas')}
        >
          <IconCalendar size={16} />
          Reservas
        </button>

        <button
          type="button"
          className={`nav-link ${paginaAtiva === 'relatorios' ? 'active' : ''}`}
          onClick={() => navegar('relatorios')}
        >
          <IconFileText size={16} />
          Relatórios
        </button>

        <button
          type="button"
          className={`nav-link ${paginaAtiva === 'aprovacao' ? 'active' : ''}`}
          onClick={() => navegar('aprovacao')}
        >
          <IconCheckCircle size={16} />
          Aprovação
        </button>

        <button
          type="button"
          className={`nav-link ${paginaAtiva === 'reunioes' ? 'active' : ''}`}
          onClick={() => navegar('reunioes')}
        >
          <IconUser size={16} />
          Reuniões
        </button>
      </nav>

      <div className="user-profile">
        <div className="user-badge" title={`Conectado como ${usuario}`}>
          <div className="user-avatar">{iniciais}</div>
          <span className="user-name">{usuario || 'Usuário'}</span>
        </div>

        <button
          type="button"
          className="logout-btn"
          onClick={aoSair}
          title="Encerrar sessão"
          aria-label="Sair"
        >
          <IconLogOut size={18} />
        </button>
      </div>
    </header>
  );
}

export default Header;