import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import GuestEventAccess from './pages/GuestEventAccess';
import GuestSignup from './pages/GuestSignup';
import PublicEvent from './pages/PublicEvent';

export default function App() {
  return (
    <Routes>
      <Route path="/evento/:codigo" element={<PublicEvent />} />
      <Route path="/evento/:codigo/acesso" element={<GuestEventAccess />} />
      <Route path="/cadastro" element={<GuestSignup />} />
      <Route path="*" element={<Navigate to="/cadastro" replace />} />
    </Routes>
  );
}
