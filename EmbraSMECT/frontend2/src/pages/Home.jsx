import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return <section><div className="page-heading"><span className="eyebrow">PAINEL PRINCIPAL</span><h1>Bem-vindo ao EmbraSMECT</h1><p>Organize o uso das salas e acompanhe as solicitações acadêmicas.</p></div>
    <div className="quick-links"><Link to="/reservas"><strong>Reservas</strong><span>Solicite uma sala ou recurso.</span></Link><Link to="/relatorios"><strong>Relatórios</strong><span>Consulte o status das reservas.</span></Link><Link to="/aprovacao"><strong>Aprovação</strong><span>Revise pedidos pendentes.</span></Link></div>
  </section>;
}
