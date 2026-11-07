import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Tela pública que coleta as credenciais e inicia a sessão.
export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  // Impede o recarregamento da página e trata a resposta do backend.
  async function handleSubmit(event) {
    event.preventDefault();
    setErro('');
    try {
      await login(email, senha);
      navigate('/');
    } catch (error) {
      setErro(error.response?.data?.erro || 'Não foi possível conectar à API.');
    }
  }

  return <div className="login-page"><form className="login-card" onSubmit={handleSubmit}>
    <span className="eyebrow">PORTAL DE EVENTOS</span><h1>Acesso</h1>
    <p>Acesso exclusivo para ADM, Gestores e organizadores.</p>
    <label>Usuário<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
    <label>Senha<input type="password" value={senha} onChange={(event) => setSenha(event.target.value)} required /></label>
    {erro && <div className="error">{erro}</div>}
    <button className="primary-button" type="submit">Entrar</button>
  </form></div>;
}
