import React from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Home from './pages/Home';
import Reservas from './pages/Reservas';
import Relatorios from './pages/Relatorios';
import Aprovacao from './pages/Aprovacao';
import GuestEvent from './pages/GuestEvent';
import TVDisplay from './pages/TVDisplay';
import AdminUsers from './pages/AdminUsers';
import RoomResources from './pages/RoomResources';
import GuestSignup from './pages/GuestSignup';
import GuestEventAccess from './pages/GuestEventAccess';
import PublicEvent from './pages/PublicEvent';

// Redireciona visitantes não autenticados para a tela de login.
function PrivateRoutes() {
  const { user, isLoading, authError, restoreSession } = useAuth();
  if (isLoading) return <main className="content"><p>Restaurando sessão...</p></main>;
  if (authError) {
    return (
      <main className="content">
        <div className="error" role="alert">{authError}</div>
        <button className="primary-button" onClick={restoreSession}>Tentar novamente</button>
      </main>
    );
  }
  return user ? <Layout /> : <Navigate to="/login" replace />;
}

// Libera a página apenas quando o papel atual estiver na lista permitida.
function RoleRoute({ roles, principalOnly = false }) {
  const { user } = useAuth();
  if (user && roles.includes(user.role) && (!principalOnly || user.principal === true)) return <Outlet />;
  return <Navigate to="/" replace />;
}

// Define as rotas públicas e as páginas protegidas do sistema.
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<GuestSignup />} />
      <Route path="/evento/:codigo" element={<PublicEvent />} />
      <Route path="/evento/:codigo/acesso" element={<GuestEventAccess />} />
      <Route element={<PrivateRoutes />}>
        <Route path="/" element={<Home />} />
        <Route element={<RoleRoute roles={['admin', 'organizer']} />}>
          <Route path="/reservas" element={<Reservas />} />
          <Route path="/relatorios" element={<Relatorios />} />
        </Route>
        <Route element={<RoleRoute roles={['guest']} />}>
          <Route path="/meu-evento" element={<GuestEvent />} />
        </Route>
        <Route element={<RoleRoute roles={['admin', 'organizer']} />}>
          <Route path="/aprovacao" element={<Aprovacao />} />
          <Route path="/tv" element={<TVDisplay />} />
        </Route>
        <Route element={<RoleRoute roles={['admin']} />}>
          <Route path="/usuarios" element={<AdminUsers />} />
        </Route>
        <Route element={<RoleRoute roles={['admin']} principalOnly />}>
          <Route path="/recursos-sala" element={<RoomResources />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
