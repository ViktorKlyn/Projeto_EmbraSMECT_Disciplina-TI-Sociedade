import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Home from './pages/Home';
import Reservas from './pages/Reservas';
import Relatorios from './pages/Relatorios';
import Aprovacao from './pages/Aprovacao';

// Redireciona visitantes não autenticados para a tela de login.
function PrivateRoutes() {
  const { user } = useAuth();
  return user ? <Layout /> : <Navigate to="/login" replace />;
}

// Define as rotas públicas e as páginas protegidas do sistema.
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<PrivateRoutes />}>
        <Route path="/" element={<Home />} />
        <Route path="/reservas" element={<Reservas />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/aprovacao" element={<Aprovacao />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
