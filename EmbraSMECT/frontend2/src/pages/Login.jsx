import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

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
    <span className="eyebrow">ACESSO ACADÊMICO</span><h1>EmbraSMECT</h1>
    <p>Entre para gerenciar salas e recursos.</p>
    <label>Usuário<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
    <label>Senha<input type="password" value={senha} onChange={(event) => setSenha(event.target.value)} required /></label>
    {erro && <div className="error">{erro}</div>}
    <button className="primary-button" type="submit">Entrar</button>
  </form></div>;
}
