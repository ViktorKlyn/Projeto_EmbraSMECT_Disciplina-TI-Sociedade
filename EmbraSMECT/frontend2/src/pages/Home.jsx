import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Mostra atalhos apenas para as áreas autorizadas ao papel atual.
export default function Home() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isOrganizer = user?.role === 'organizer';
  const isGuest = user?.role === 'guest';

  const links = isAdmin
    ? [
      ['/reservas', 'Reservas', 'Consulte e cadastre eventos.'],
      ['/aprovacao', 'Aprovação', 'Revise pedidos e registre decisões.'],
      ['/relatorios', 'Relatórios', 'Acompanhe a ocupação e o histórico.'],
      ['/recursos-tecnicos', 'Recursos técnicos', 'Cadastre equipamentos e atualize o status operacional.'],
      ['/tv', 'Exibição para TV', 'Abra a programação em tela cheia.'],
      ['/usuarios', 'Contas e permissões', 'Cadastre gestores e promova organizadores.'],
      ...(user?.principal === true ? [['/recursos-sala', 'Espaços', 'Cadastre espaços e gerencie suas capacidades.']] : []),
    ]
    : isOrganizer
      ? [
        ['/reservas', 'Minhas reservas', 'Solicite eventos e acompanhe o histórico e a ocupação.'],
        ['/recursos-tecnicos', 'Recursos técnicos', 'Cadastre equipamentos e atualize o status operacional.'],
        ['/relatorios', 'Relatórios', 'Acompanhe eventos e abra outros para consultar e se inscrever.'],
        ['/tv', 'Exibição para TV', 'Abra a programação em tela cheia.'],
      ]
      : [['/meu-evento', 'Meu evento', 'Consulte o espaço, palestrante e programação.']];

  return <section>
    <div className="page-heading">
      <span className="eyebrow">{isAdmin ? (user?.principal === true ? 'PAINEL DO ADM' : 'PAINEL DO GESTOR') : isOrganizer ? 'ÁREA DO ORGANIZADOR' : 'ÁREA DO CONVIDADO'}</span>
      <h1>Olá, {user?.nome}</h1>
      <p>{isAdmin ? 'Gerencie eventos, aprove solicitações e acompanhe os espaços.' : isOrganizer ? 'Acompanhe suas solicitações, histórico e ocupação dos espaços.' : isGuest ? 'Confira os detalhes do evento ao qual você foi associado.' : ''}</p>
    </div>
    <div className="quick-links">{links.map(([to, title, description]) => <Link key={to} to={to}><strong>{title}</strong><span>{description}</span></Link>)}</div>
  </section>;
}
