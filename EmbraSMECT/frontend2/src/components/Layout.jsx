import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Estrutura compartilhada pelas páginas que exigem autenticação.
export default function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="app-shell">
      <header className="topbar">
        <div><strong>EmbraSMECT</strong><span className="subtitle">Gestão de espaços e recursos tecnológicos para eventos</span></div>
        <div className="user-area">{user?.nome} <button className="link-button" onClick={logout}>Sair</button></div>
      </header>
      <nav className="navigation">
        <NavLink to="/">Início</NavLink>
        <NavLink to="/reservas">Reservas</NavLink>
        <NavLink to="/relatorios">Relatórios</NavLink>
        <NavLink to="/aprovacao">Aprovação</NavLink>
      </nav>
      <main className="content"><Outlet /></main>
    </div>
  );
}
