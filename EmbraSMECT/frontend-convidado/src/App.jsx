import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import GuestPortal from './pages/GuestPortal';
import PublicEvent from './pages/PublicEvent';

export default function App() {
  return (
    <Routes>
      <Route path="/evento/:codigo" element={<PublicEvent />} />
      <Route path="/evento/:codigo/acesso" element={<GuestPortal />} />
      <Route path="/login" element={<GuestPortal />} />
      <Route path="/cadastro" element={<GuestPortal />} />
      <Route path="/" element={<GuestPortal />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
