import React, { useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Estrutura compartilhada pelas páginas que exigem autenticação.
export default function Layout() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isOrganizer = user?.role === 'organizer';
  const isGuest = user?.role === 'guest';
  const roleName = isAdmin ? 'ADM' : isOrganizer ? 'Organizador de eventos' : 'Convidado';

  useEffect(() => {
    document.title = isGuest ? 'Meu evento' : 'EmbraSMECT';
  }, [isGuest]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>{isGuest ? <strong>Detalhes do evento</strong> : <><strong>EmbraSMECT</strong><span className="subtitle">Gestão de espaços e recursos tecnológicos para eventos</span></>}</div>
        <div className="user-area">{user?.nome} · {roleName} <button className="link-button" onClick={logout}>Sair</button></div>
      </header>
      <nav className="navigation">
        <NavLink to="/">Início</NavLink>
        {(isAdmin || isOrganizer) && <NavLink to="/reservas">{isAdmin ? 'Reservas' : 'Minhas reservas'}</NavLink>}
        {isAdmin && <NavLink to="/aprovacao">Aprovação</NavLink>}
        {(isAdmin || isOrganizer) && <NavLink to="/relatorios">Relatórios</NavLink>}
        {(isAdmin || isOrganizer) && <NavLink to="/tv">Exibição para TV</NavLink>}
        {isAdmin && <NavLink to="/usuarios">Contas</NavLink>}
        {isAdmin && user?.principal === true && <NavLink to="/recursos-sala">Espaços</NavLink>}
        {isGuest && <NavLink to="/meu-evento">Meu evento</NavLink>}
      </nav>
      <main className="content"><Outlet /></main>
    </div>
  );
}
