function Header({ navegar, usuario }) {
  return (
    <header className="header">
      <strong>EmbraSMECT</strong>
      <nav className="nav">
        <button type="button" onClick={() => navegar('home')}>Início</button>
        <button type="button" onClick={() => navegar('reservas')}>Reservar Sala</button>
        <button type="button" onClick={() => navegar('relatorios')}>Relatórios</button>
        <button type="button" onClick={() => navegar('aprovacao')}>Aprovação</button>
      </nav>
      <span>Usuário: {usuario}</span>
    </header>
  );
}

export default Header;